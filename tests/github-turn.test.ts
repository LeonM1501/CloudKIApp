import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBridge } from "../server/index.ts";
import { GitHub } from "../server/github.ts";
import { Providers } from "../server/providers.ts";
import type { Remote } from "../server/ssh.ts";
import type { Message, Permission } from "../src/types.ts";

test("only successful writing turns upload; upload errors preserve the completed answer", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "cloudki-github-turn-"));
  const remote = { connection: { home: "/home/fixture", connected: true },
    requireClient: () => ({}), disconnect: () => {},
  } as unknown as Remote;
  const bridge = await createBridge({ token: "fixture-bridge-token-at-least-32-characters", dataDir: directory, remote });
  let pushes = 0;
  let outcome: Message["status"] = "complete";
  let failPush = false;
  t.mock.method(GitHub.prototype, "prepare", async () => "");
  t.mock.method(GitHub.prototype, "push", async () => {
    pushes++;
    if (failPush) throw new Error("push rejected: fetch first");
    return "uploaded";
  });
  t.mock.method(Providers.prototype, "turn", async (_account, _chat, message: Message) => {
    message.text = "Fixture answer";
    message.status = outcome;
  });
  bridge.store.state.accounts.push({ id: "account", label: "Fixture", provider: "codex", status: "ready", models: [{ id: "fixture", name: "Fixture" }], quotas: [] });
  await new Promise<void>((done) => bridge.server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(bridge.server.address() as { port: number }).port}`;
  const call = async (path: string, body: unknown) => fetch(base + path, {
    method: "POST", headers: { Authorization: "Bearer fixture-bridge-token-at-least-32-characters", "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  try {
    for (const [index, scenario] of ([
      { status: "complete", permission: "ask", uploaded: true, error: false },
      { status: "complete", permission: "read-only", uploaded: false, error: false },
      { status: "failed", permission: "ask", uploaded: false, error: false },
      { status: "cancelled", permission: "ask", uploaded: false, error: false },
      { status: "complete", permission: "ask", uploaded: true, error: true },
    ] as { status: Message["status"]; permission: Permission; uploaded: boolean; error: boolean }[]).entries()) {
      outcome = scenario.status;
      failPush = scenario.error;
      const before = pushes;
      const project = { id: `project-${index}`, name: "Fixture", path: "/home/fixture/repo", repository: "https://github.com/fixture/repo.git", branch: "main" };
      bridge.store.state.projects.push(project);
      const chat = await (await call("/api/chats", { projectId: project.id })).json();
      const response = await call(`/api/chats/${chat.id}/turn`, { accountId: "account", model: "fixture", permission: scenario.permission, text: "Fixture task", attachments: [] });
      assert.equal(response.status, 202);
      let message: Message | undefined;
      for (let attempt = 0; attempt < 100; attempt++) {
        const current = bridge.store.state.chats.find(value => value.id === chat.id)!;
        message = current.messages.at(-1);
        if (message?.status !== "running" && (!scenario.uploaded || message.events?.some(event => ["complete", "failed"].includes(event.status ?? "")))) break;
        await new Promise(done => setTimeout(done, 10));
      }
      assert.equal(message?.status, scenario.status);
      assert.equal(pushes - before, Number(scenario.uploaded));
      if (scenario.error) assert.match(message!.error!, /lokale Arbeit bleibt erhalten/);
    }
  } finally {
    await bridge.close();
    await rm(directory, { recursive: true, force: true });
  }
});
