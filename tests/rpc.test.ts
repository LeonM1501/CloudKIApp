import test from "node:test";
import assert from "node:assert/strict";
import { Duplex } from "node:stream";
import { Rpc } from "../server/rpc.ts";

class Wire extends Duplex {
  sent: any[] = [];
  _read() {}
  _write(bytes: Buffer, _encoding: string, done: () => void) {
    this.sent.push(JSON.parse(bytes.toString()));
    done();
  }
}
test("JSON-RPC correlates responses, accepts split UTF-8, exposes approvals, and rejects on exit", async () => {
  const wire = new Wire();
  const rpc = new Rpc(wire);
  const one = rpc.call("model/list");
  const two = rpc.call("account/read");
  wire.push(JSON.stringify({ id: 2, result: { account: "tester" } }) + "\n");
  const bytes = Buffer.from(
    JSON.stringify({ id: 1, result: { name: "ä model" } }) + "\n",
  );
  const split = bytes.indexOf(Buffer.from("ä")) + 1;
  wire.push(bytes.subarray(0, split));
  wire.push(bytes.subarray(split));
  assert.equal((await one).name, "ä model");
  assert.equal((await two).account, "tester");
  const request = new Promise<any>((done) => rpc.once("request", done));
  wire.push(
    JSON.stringify({
      id: "server-1",
      method: "item/commandExecution/requestApproval",
      params: { command: "npm test" },
    }) + "\n",
  );
  assert.equal((await request).params.command, "npm test");
  rpc.respond("server-1", { decision: "decline" });
  assert.equal(wire.sent.at(-1).result.decision, "decline");
  const pending = rpc.call("turn/start");
  const check = assert.rejects(pending, /exited/);
  rpc.close(new Error("process exited"));
  await check;
});
test("malformed JSON and timeouts reject pending requests rather than inventing a result", async () => {
  const wire = new Wire();
  const rpc = new Rpc(wire);
  await assert.rejects(rpc.call("slow", {}, 5), /Zeitlimit/);
  const pending = rpc.call("account/read");
  const failed = assert.rejects(pending, /ungültiges JSON/);
  wire.push("not json\n");
  await failed;
  assert.equal(rpc.closed, true);
});

test("valid JSON with an invalid RPC shape fails closed", async () => {
  const wire = new Wire();
  const rpc = new Rpc(wire);
  const pending = assert.rejects(rpc.call("account/read"), /ungültige RPC/);
  wire.push("null\n");
  await pending;
  assert.equal(rpc.closed, true);
});
