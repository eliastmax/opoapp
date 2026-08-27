import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import {
  CELADOR_OPPOSITION_ID,
  ELI44_PROBE_PACKAGE_ID,
  assertSafeCliArgs,
  executionConfirmation,
  redactSensitiveText,
  validateHardeningPackage,
} from "../lib/celador-question-hardening-executor";

const RPC_NAME = "execute_celador_question_hardening";
type Command = "probe" | "preflight" | "execute";

function requiredEnvironment(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value =
    process.env[name] ??
    (name === "SUPABASE_URL"
      ? process.env.VITE_SUPABASE_URL
      : process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!value) {
    throw new Error(`Missing ${name}. Provide it through the operator environment.`);
  }
  return value;
}

function createPublishableKeyFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      apiKey.startsWith("sb_publishable_") &&
      headers.get("Authorization") === `Bearer ${apiKey}`
    ) {
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
    throw new Error(
      "Interactive TTY required. Password input is never accepted through arguments or stdin piping.",
    );
  }
  stdout.write(label);
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
    };
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
    stdin.on("keypress", onKeypress);
  });
}

function parseArgs(args: readonly string[]): {
  command: Command;
  packagePath?: string;
} {
  assertSafeCliArgs(args);
  if (args.length === 1 && args[0] === "probe") {
    return { command: "probe" };
  }
  if (
    (args[0] === "preflight" || args[0] === "execute") &&
    args.length === 3 &&
    args[1] === "--package" &&
    args[2]
  ) {
    return { command: args[0], packagePath: args[2] };
  }
  throw new Error(
    "Usage: bun run maintenance:celador-hardening -- probe | <preflight|execute> --package <approved-package.json>. No credential/JWT flags are supported.",
  );
}

async function loadPackage(path: string, mode: "preflight" | "execute") {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error("Could not read a valid JSON hardening package.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Hardening package must be a JSON object.");
  }
  const base: Record<string, unknown> = {
    ...(raw as Record<string, unknown>),
    mode,
  };
  if (mode === "preflight") delete base.confirmation;
  const fingerprint = typeof base.package_fingerprint === "string" ? base.package_fingerprint : "";
  if (mode === "execute") {
    base.confirmation = executionConfirmation(fingerprint);
  }
  return validateHardeningPackage(base);
}

async function main(): Promise<void> {
  const { command, packagePath } = parseArgs(process.argv.slice(2));
  const url = requiredEnvironment("SUPABASE_URL");
  const publishableKey = requiredEnvironment("SUPABASE_PUBLISHABLE_KEY");

  let payload: Record<string, unknown>;
  if (command === "probe") {
    payload = {
      package_id: ELI44_PROBE_PACKAGE_ID,
      mode: "probe",
      opposition_id: CELADOR_OPPOSITION_ID,
    };
  } else {
    const pkg = await loadPackage(packagePath!, command);
    if (command === "execute") {
      stdout.write("\nWARNING: this command mutates existing Celador question content in place.\n");
      stdout.write(
        "Do not continue without a separate Governance authorization for this exact package fingerprint.\n\n",
      );
      const expected = executionConfirmation(pkg.package_fingerprint);
      const confirmation = await readLine(`Type ${expected} exactly: `);
      if (confirmation !== expected) {
        throw new Error("Execution confirmation did not match; no RPC call made.");
      }
    }
    payload = pkg as unknown as Record<string, unknown>;
  }

  const email = await readLine("Supabase Celador admin email: ");
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
    const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginError || !login.user) throw new Error("Authentication failed.");
    const userId = login.user.id;
    const [{ data: profile, error: profileError }, { data: adminRows, error: adminError }] =
      await Promise.all([
        supabase.from("profiles").select("active_opposition_id").eq("id", userId).maybeSingle(),
        supabase
          .from("opposition_admins")
          .select("opposition_id")
          .eq("user_id", userId)
          .eq("opposition_id", CELADOR_OPPOSITION_ID),
      ]);
    if (profileError || adminError) {
      throw new Error("Authorization preflight failed.");
    }
    if (profile?.active_opposition_id !== CELADOR_OPPOSITION_ID) {
      throw new Error("Rejected: Celador SMS is not the active opposition.");
    }
    if (!adminRows?.length) {
      throw new Error("Rejected: authenticated user is not opposition_admin for Celador.");
    }

    stdout.write(`Authorized Celador session verified. Operation: ${command}.\n`);
    const { data, error } = await supabase.rpc(RPC_NAME, {
      p_package: payload,
    });
    if (error) {
      throw new Error(`RPC rejected: ${redactSensitiveText(error.message)}`);
    }
    const result =
      data && typeof data === "object" ? (data as Record<string, unknown>) : { result: data };
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown Celador hardening executor failure.";
  console.error(redactSensitiveText(message));
  process.exitCode = 1;
});
