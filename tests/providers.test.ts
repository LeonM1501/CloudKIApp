import test from "node:test";
import assert from "node:assert/strict";
import { Duplex, PassThrough } from "node:stream";
import { Providers } from "../server/providers.ts";
import type { Remote } from "../server/ssh.ts";
import type { Account, Chat, Message } from "../src/types.ts";

class ProviderWire extends Duplex {
  stderr = new PassThrough();
  requests: any[] = [];
  approved = false;
  constructor(
    private authenticated = true,
    private mode: "codex" | "opencode" = "codex",
  ) {
    super();
  }
  _read() {}
  signal() {
    this.destroy();
  }
  _write(bytes: Buffer, _encoding: string, done: () => void) {
    const entry = JSON.parse(bytes.toString());
    this.requests.push(entry);
    queueMicrotask(() => {
      const respond = (result: unknown) =>
        this.push(
          JSON.stringify({ jsonrpc: "2.0", id: entry.id, result }) + "\n",
        );
      if (entry.method === "initialize") respond({ protocolVersion: 1 });
      else if (entry.method === "account/read")
        respond({
          account: this.authenticated
            ? { email: "fixture@example.invalid" }
            : null,
        });
      else if (entry.method === "model/list")
        respond({
          data: [
            {
              id: "fixture-model",
              displayName: "Fixture model",
              supportedReasoningEfforts: [{ reasoningEffort: "high" }],
            },
          ],
          nextCursor: null,
        });
      else if (entry.method === "account/rateLimits/read")
        respond({
          rateLimits: {
            primary: {
              usedPercent: 77,
              windowDurationMins: 300,
              resetsAt: 1800000000,
            },
          },
        });
      else if (entry.method === "account/login/start")
        respond({
          verificationUrl: "https://auth.example.invalid/device",
          userCode: "FROM-PROVIDER",
        });
      else if (entry.method === "thread/start")
        respond({ thread: { id: "native-thread" } });
      else if (entry.method === "turn/start") {
        respond({ turn: { id: "native-turn" } });
        this.push(
          JSON.stringify({
            id: "approval-1",
            method: "item/commandExecution/requestApproval",
            params: { threadId: "native-thread", command: "npm test" },
          }) + "\n",
        );
      } else if (entry.id === "approval-1") {
        this.approved = entry.result.decision === "accept";
        this.push(
          JSON.stringify({
            method: "item/agentMessage/delta",
            params: {
              threadId: "native-thread",
              delta: "Real protocol fixture response",
            },
          }) + "\n",
        );
        this.push(
          JSON.stringify({
            method: "thread/tokenUsage/updated",
            params: {
              threadId: "native-thread",
              tokenUsage: { last: { totalTokens: 123 } },
            },
          }) + "\n",
        );
        this.push(
          JSON.stringify({
            method: "turn/completed",
            params: {
              threadId: "native-thread",
              turn: { status: "completed" },
            },
          }) + "\n",
        );
      } else if (entry.method === "session/new")
        respond({
          sessionId: "native-session",
          models: {
            availableModels: [
              { modelId: "fixture-model", name: "Fixture model" },
            ],
          },
        });
      else if (entry.method === "session/set_model") respond({});
      else if (entry.method === "session/prompt") {
        this.push(
          JSON.stringify({
            method: "session/update",
            params: {
              sessionId: "native-session",
              update: {
                sessionUpdate: "agent_message_chunk",
                content: { type: "text", text: "ACP streamed answer" },
              },
            },
          }) + "\n",
        );
        respond({ stopReason: "end_turn" });
      }
    });
    done();
  }
}
const fixture = (provider: "codex" | "opencode" = "codex") =>
  ({
    id: "account",
    label: "Contract fixture",
    provider,
    status: "ready",
    models: [],
    quotas: [],
  }) as Account;
function remoteFor(wire: ProviderWire) {
  return {
    connection: { home: "/home/fixture" },
    open: async () => wire,
    accountCommand: async (_id: string, command: string) => command,
  } as unknown as Remote;
}
function conversation(): { chat: Chat; output: Message } {
  const output: Message = {
    id: "answer",
    role: "assistant",
    status: "running",
    text: "",
    createdAt: "2026-10-29",
  };
  const chat: Chat = {
    id: "chat",
    title: "fixture",
    projectId: null,
    pinned: false,
    updatedAt: "",
    messages: [
      {
        id: "user",
        role: "user",
        text: "Verify approvals",
        createdAt: "2026-10-29",
      },
      output,
    ],
  };
  return { chat, output };
}
test("Codex contract uses provider login, models, quotas, streaming and explicit approval", async () => {
  const wire = new ProviderWire();
  let pendingApproval: any;
  const providers = new Providers(remoteFor(wire), (event, value) => {
    if (event === "approval") pendingApproval = value;
  });
  const account = fixture();
  await providers.refresh(account);
  assert.equal(account.status, "authenticated");
  assert.equal(account.models[0].id, "fixture-model");
  assert.equal(account.quotas[0].remaining, 23);
  const login = await providers.login(account);
  assert.equal(login.code, "FROM-PROVIDER");
  const { chat, output } = conversation();
  const pending = providers.turn(
    account,
    chat,
    output,
    "/workspace",
    "fixture-model",
    "ask",
    "high",
    () => {},
  );
  for (let index = 0; index < 30 && !pendingApproval; index++)
    await new Promise((done) => setTimeout(done, 2));
  assert.ok(pendingApproval);
  assert.equal(wire.approved, false);
  assert.equal(output.status, "running");
  providers.answer(pendingApproval.id, "accept");
  await pending;
  assert.equal(wire.approved, true);
  assert.equal(output.status, "complete");
  assert.equal(output.tokens, 123);
  assert.equal(output.text, "Real protocol fixture response");
  const start = wire.requests.find(
    (request) => request.method === "thread/start",
  );
  assert.equal(start.params.sandbox, "workspace-write");
  assert.equal(start.params.approvalPolicy, "untrusted");
  assert.match(
    wire.requests.find((request) => request.method === "turn/start").params
      .input[0].text,
    /Verify approvals/,
  );
  providers.close();
});
test("unauthenticated Codex does not gain fabricated models or account status", async () => {
  const providers = new Providers(remoteFor(new ProviderWire(false)), () => {});
  const account = fixture();
  await providers.refresh(account);
  assert.equal(account.status, "ready");
  assert.deepEqual(account.models, []);
  assert.deepEqual(account.quotas, []);
  providers.close();
});

test("client preparation shares a running install across accounts and retries failures", async () => {
  let runs = 0;
  let complete!: (result: { stdout: string; stderr: string }) => void;
  let fail!: (error: Error) => void;
  const remote = {
    run: (_command: string, timeout: number) => {
      runs++;
      assert.equal(timeout, 240000);
      return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        complete = resolve;
        fail = reject;
      });
    },
  } as unknown as Remote;
  const providers = new Providers(remote, () => {});
  const account = fixture();
  assert.deepEqual(providers.prepare(account), { ready: false });
  assert.deepEqual(providers.prepare({ ...account, id: "second-account" }), { ready: false });
  assert.equal(runs, 1);
  complete({ stdout: "codex 1.0", stderr: "" });
  await Promise.resolve();
  assert.deepEqual(providers.prepare(account), { ready: true });
  assert.equal(runs, 1);
  assert.deepEqual(providers.prepare(account), { ready: false });
  fail(new Error("download unavailable"));
  await Promise.resolve();
  assert.throws(() => providers.prepare(account), /download unavailable/);
  assert.deepEqual(providers.prepare(account), { ready: false });
  assert.equal(runs, 3);
  complete({ stdout: "codex 1.0", stderr: "" });
  await Promise.resolve();
  assert.deepEqual(providers.prepare(account), { ready: true });
  providers.close();
});

test("Antigravity login survives UI polling and exposes a complete browser link", async () => {
  class LoginWire extends Duplex {
    stderr = new PassThrough();
    input: string[] = [];
    _read() {}
    setWindow() {}
    signal() {}
    _write(bytes: Buffer, _encoding: string, done: () => void) {
      this.input.push(bytes.toString()); done();
    }
  }
  const wire = new LoginWire();
  let opened = 0;
  const remote = {
    open: async () => { opened++; return wire; },
    accountCommand: async (_id: string, command: string) => command,
  } as unknown as Remote;
  const providers = new Providers(remote, () => {});
  const account = { ...fixture(), provider: "antigravity" as const };
  try {
    assert.equal((await providers.login(account)).pending, true);
    await new Promise((done) => setImmediate(done));
    wire.push("Select login method:\n > 1. Google OAuth\n2. Use a Google Cloud project\n");
    await new Promise((done) => setImmediate(done));
    assert.deepEqual(wire.input, ["\r"]);
    const url = "https://accounts.google.com/o/oauth2/auth?state=fixture&code_challenge=fixture";
    wire.push(`\x1b]8;;${url}\x07Click here\x1b]8;;\x07`);
    await new Promise((done) => setImmediate(done));
    assert.equal((await providers.login(account)).url, url);
    assert.equal((await providers.login(account)).url, url);
    assert.equal(opened, 1);
    providers.submitLoginCode(account, "fixture-auth-code");
    assert.equal(wire.input.at(-1), "fixture-auth-code\r");
    assert.equal((await providers.login(account)).sent, true);
    providers.cancelLogin(account.id);
    assert.throws(() => providers.submitLoginCode(account, "expired"), /abgelaufen/);
  } finally {
    providers.close();
    wire.destroy();
  }
});
test("OpenCode ACP streams responses and rejects unsupported sandbox promises", async () => {
  const wires: ProviderWire[] = [];
  const remote = {
    connection: { home: "/home/fixture" },
    open: async () => {
      const wire = new ProviderWire(true, "opencode");
      wires.push(wire);
      return wire;
    },
    accountCommand: async (_id: string, command: string) => command,
  } as unknown as Remote;
  const providers = new Providers(remote, () => {});
  const account = fixture("opencode");
  await providers.refresh(account);
  const { chat, output } = conversation();
  await assert.rejects(
    providers.turn(
      account,
      chat,
      output,
      "/workspace",
      "fixture-model",
      "read-only",
      undefined,
      () => {},
    ),
    /OpenCode unterstützt/,
  );
  await providers.turn(
    account,
    chat,
    output,
    "/workspace",
    "fixture-model",
    "ask",
    undefined,
    () => {},
  );
  assert.equal(output.text, "ACP streamed answer");
  assert.equal(output.status, "complete");
  assert.equal(wires.length, 2);
  providers.close();
});

test("Antigravity NDJSON uses real result status and never bypasses the explicit permission gate", async () => {
  for (const success of [true, false]) {
    class AgyWire extends Duplex {
      stderr = new PassThrough();
      _read() {}
      signal() {
        this.destroy();
      }
      _write(bytes: Buffer, _encoding: string, done: () => void) {
        assert.equal(JSON.parse(bytes.toString()).event, "user");
        queueMicrotask(() => {
          this.push(
            JSON.stringify({
              event: "step_update",
              step_update: {
                step_type: "agent_response",
                text_delta: "partial",
              },
            }) + "\n",
          );
          this.push(
            JSON.stringify({
              event: "result",
              result: success
                ? {
                    status: "SUCCESS",
                    response: "Final AGY result",
                    usage: { total_tokens: 17 },
                  }
                : { status: "ERROR", error: "quota exceeded" },
            }) + "\n",
          );
        });
        done();
      }
    }
    const remote = {
      connection: { home: "/home/fixture" },
      open: async () => new AgyWire(),
      run: async (command: string) => ({
        stdout: command.includes("agy models")
          ? "fixture-model  Fixture Model\n"
          : "",
        stderr: "",
      }),
      accountDirectory: () => "/home/fixture/profile",
      accountCommand: async (_id: string, command: string) => command,
    } as unknown as Remote;
    const providers = new Providers(remote, () => {});
    const account = { ...fixture(), provider: "antigravity" } as Account;
    await providers.refresh(account);
    assert.equal(account.status, "ready");
    assert.deepEqual(account.quotas, []);
    const { chat, output } = conversation();
    await assert.rejects(
      providers.turn(
        account,
        chat,
        output,
        "/workspace",
        "fixture-model",
        "ask",
        undefined,
        () => {},
      ),
      /keine interaktiven Freigaben/,
    );
    await providers.turn(
      account,
      chat,
      output,
      "/workspace",
      "fixture-model",
      "full",
      undefined,
      () => {},
    );
    assert.equal(output.status, success ? "complete" : "failed");
    if (success) {
      assert.equal(output.text, "Final AGY result");
      assert.equal(output.tokens, 17);
    } else assert.match(output.error!, /quota exceeded/);
    providers.close();
  }
});
