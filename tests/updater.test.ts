import test from "node:test";
import assert from "node:assert/strict";
import { withDeadline } from "../src/updater.ts";

test("native update calls finish or show which operation timed out", async () => {
  assert.equal(await withDeadline(Promise.resolve("ready"), "bereitmelden", 50), "ready");
  await assert.rejects(withDeadline(new Promise(() => {}), "App-Version lesen", 10), /App-Version lesen/);
  await assert.rejects(withDeadline(Promise.reject(new Error("native error")), "Bundle lesen", 50), /native error/);
});
