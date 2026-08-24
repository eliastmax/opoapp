import { createClient } from "@supabase/supabase-js";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  AUXILIAR_OPPOSITION_ID,
  ELI42_EXECUTE_CONFIRMATION,
  assertSafeCliArgs,
  buildMaintenancePackage,
  isMaintenanceCommand,
  redactSensitiveText,
  type AuxiliarMaintenanceCommand,
} from "../lib/auxiliar-maintenance-executor";

const RPC_NAME = "execute_auxiliar_maintenance";

function requiredEnvironment(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name] ??
    (name === "SUPABASE_URL" ? process.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!value) throw new Error(`Missing ${name}. Provide it through the operator environment.`);
  return value;
}

function createPublishableKeyFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (apiKey.startsWith("sb_publishable_") && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

async function readLine(label: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(label)).trim();
  } finally {
    rl.close();
  }
}

async function readHidden(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Interactive TTY required. Password input is never accepted through arguments or stdin piping.");
  }

  stdout.write(label);
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();

  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const onKeypress = (chunk: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Authentication cancelled."));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }
      if (chunk && !key.ctrl) value += chunk;
    };
    const cleanup = () => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on("keypress", onKeypress);
  });
}

function usage(): never {
  throw new Error(
    "Usage: bun run maintenance:auxiliar -- <probe|eli42-preflight|eli42-execute>. No credential/JWT flags are supported.",
  );
}

async function confirmExecution(command: AuxiliarMaintenanceCommand): Promise<void> {
  if (command !== "eli42-execute") return;
  stdout.write("\nWARNING: this command executes the Governance-approved ELI-42 T11 cleanup.\n");
  stdout.write("Do not continue unless Governance has explicitly resumed ELI-42 after ELI-43 is GREEN.\n\n");
  const confirmation = await readLine(`Type ${ELI42_EXECUTE_CONFIRMATION} exactly: `);
  if (confirmation !== ELI42_EXECUTE_CONFIRMATION) throw new Error("Execution confirmation did not match; no RPC call made.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  assertSafeCliArgs(args);
  if (args.length !== 1 || !isMaintenanceCommand(args[0])) usage();
  const command = args[0];

  const url = requiredEnvironment("SUPABASE_URL");
  const publishableKey = requiredEnvironment("SUPABASE_PUBLISHABLE_KEY");
  await confirmExecution(command);

  const email = await readLine("Supabase admin email: ");
  const password = await readHidden("Supabase admin password (hidden, runtime only): ");
  if (!email || !password) throw new Error("Email and password are required.");

  const supabase = createClient(url, publishableKey, {
    global: { fetch: createPublishableKeyFetch(publishableKey) },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: undefined,
    },
  });

  try {
    const { data: login, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !login.user) throw new Error("Authentication failed.");

    const userId = login.user.id;
    const [{ data: profile, error: profileError }, { data: adminRows, error: adminError }] = await Promise.all([
      supabase.from("profiles").select("active_opposition_id").eq("id", userId).maybeSingle(),
      supabase
        .from("opposition_admins")
        .select("opposition_id")
        .eq("user_id", userId)
        .eq("opposition_id", AUXILIAR_OPPOSITION_ID),
    ]);

    if (profileError || adminError) throw new Error("Authorization preflight failed.");
    if (profile?.active_opposition_id !== AUXILIAR_OPPOSITION_ID) {
      throw new Error("Rejected: Auxiliar Administrativo SMS is not the active opposition.");
    }
    if (!adminRows?.length) throw new Error("Rejected: authenticated user is not opposition_admin for Auxiliar.");

    stdout.write(`Authorized session verified for Auxiliar. Operation: ${command}.\n`);
    const payload = buildMaintenancePackage(command);
    const { data, error } = await supabase.rpc(RPC_NAME, { p_package: payload });
    if (error) throw new Error(`RPC rejected: ${redactSensitiveText(error.message)}`);

    const result = data && typeof data === "object" ? data as Record<string, unknown> : { result: data };
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown maintenance executor failure.";
  console.error(redactSensitiveText(message));
  process.exitCode = 1;
});
