// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { AnswerSaveCoordinator } from "../answer-save-coordinator";

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; };

describe("AnswerSaveCoordinator", () => {
  it("persists the last rapid selection even when the first request is still running", async () => {
    const first = deferred(); const writes: string[] = []; let server = "";
    const coordinator = new AnswerSaveCoordinator<string>(async (_id, value) => { writes.push(value); if (value === "A") await first.promise; server = value; }, () => {});
    coordinator.select("answer", "A"); coordinator.select("answer", "B");
    expect(writes).toEqual(["A"]);
    first.resolve(); await coordinator.flush();
    expect(writes).toEqual(["A", "B"]); expect(server).toBe("B");
  });

  it("waits for the latest intention before finish continues", async () => {
    const pending = deferred(); let server = "";
    const coordinator = new AnswerSaveCoordinator<string>(async (_id, value) => { await pending.promise; server = value; }, () => {});
    coordinator.select("answer", "B"); let finished = false;
    const finish = coordinator.flush().then(() => { finished = true; });
    await Promise.resolve(); expect(finished).toBe(false);
    pending.resolve(); await finish; expect(server).toBe("B"); expect(finished).toBe(true);
  });
});
