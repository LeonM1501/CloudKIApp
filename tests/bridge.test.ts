import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import ssh2 from "ssh2";
const SSHServer = ssh2.Server;
import { WebSocket } from "ws";
import { createBridge } from "../server/index.ts";
import { Remote } from "../server/ssh.ts";
import { Store } from "../server/store.ts";
import { quotaWindows, transcript } from "../server/providers.ts";
import { authorized, shellQuote, absolutePath } from "../server/validation.ts";

const token = "test-only-bridge-token-with-at-least-32-characters";
test("authentication, origins, empty state, forged IDs and single-use WebSocket tickets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cloudki-api-"));
  const bridge = await createBridge({ token, dataDir: directory });
  await new Promise<void>((done) => bridge.server.listen(0, "127.0.0.1", done));
  const address = bridge.server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const call = (path: string, method = "GET", body?: unknown, extra = {}) =>
    fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(base + "/api/state")).status, 401);
    assert.equal(
      (
        await call("/api/state", "GET", undefined, {
          Origin: "https://evil.example",
        })
      ).status,
      403,
    );
    const initial = await (await call("/api/state")).json();
    assert.deepEqual(initial.chats, []);
    assert.deepEqual(initial.accounts, []);
    assert.equal(initial.connection, null);
    assert.equal(
      (
        await call("/api/profile", "PATCH", {
          username: "Tester",
          onboardingComplete: true,
        })
      ).status,
      409,
    );
    assert.equal(
      (await call("/api/accounts/forged/login", "POST", {})).status,
      404,
    );
    assert.equal(
      (await call("/api/terminal/exec", "POST", { command: "id" })).status,
      404,
    );
    const chatResponse = await call("/api/chats", "POST", { projectId: null });
    assert.equal(chatResponse.status, 201);
    const chat = await chatResponse.json();
    assert.equal(chat.messages.length, 0);
    assert.equal(
      (
        await call(`/api/chats/${chat.id}/turn`, "POST", {
          accountId: "forged",
          text: "test",
        })
      ).status,
      409,
    );
    assert.equal(
      (await call("/api/chats", "POST", { projectId: "../escape" })).status,
      400,
    );
    const ticket = await (
      await call("/api/socket-ticket", "POST", { purpose: "events" })
    ).json();
    const wsUrl = `ws://127.0.0.1:${address.port}/ws`;
    const socket = new WebSocket(wsUrl, ["cloudki", `ticket.${ticket.ticket}`]);
    const event = await new Promise<any>((done, fail) => {
      socket.on("error", fail);
      socket.once("message", (bytes) => done(JSON.parse(bytes.toString())));
    });
    assert.equal(event.event, "state");
    assert.equal(event.payload.chats.length, 1);
    socket.close();
    const replay = new WebSocket(wsUrl, ["cloudki", `ticket.${ticket.ticket}`]);
    const error = await new Promise<Error>((done) =>
      replay.once("error", done),
    );
    assert.match(error.message, /401/);
    assert.equal(
      (
        await call("/api/socket-ticket", "POST", {
          purpose: "desktop",
          target: "browser",
        })
      ).status,
      409,
    );
    assert.equal((await call(`/api/chats/${chat.id}`, "DELETE")).status, 200);
    assert.equal((await call(`/api/chats/${chat.id}`, "DELETE")).status, 404);
  } finally {
    await bridge.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("real SSH handshake refuses unverified and changed host keys before authentication", async () => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  const ssh = new SSHServer({ hostKeys: [privateKey] });
  let authAttempts = 0;
  const connections = new Set<any>();
  ssh.on("connection", (client) => {
    connections.add(client);
    client.on("error", () => {});
    client.on("close", () => connections.delete(client));
    client.on("authentication", (context) => {
      if (context.method === "password") {
        authAttempts++;
        context.password === "test-password"
          ? context.accept()
          : context.reject();
      } else context.reject();
    });
    client.on("ready", () =>
      client.on("session", (accept) => {
        const session = accept();
        session.on("exec", (accept, _reject, info) => {
          const channel = accept();
          if (info.command.includes('printf "%s" "$HOME"'))
            channel.write("/home/tester");
          else if (info.command === "false") {
            channel.stderr.write("intentional failure");
            channel.exit(7);
            channel.end();
            return;
          } else if (info.command.includes("uname -sm"))
            channel.write("Linux x86_64\nfixture-host\n4\nRAM: 8.0 GiB\n");
          else channel.write(info.command);
          channel.exit(0);
          channel.end();
        });
      }),
    );
  });
  await new Promise<void>((done) => ssh.listen(0, "127.0.0.1", done));
  const remote = new Remote();
  const port = (ssh.address() as { port: number }).port;
  const input = {
    host: "127.0.0.1",
    port,
    username: "tester",
    password: "test-password",
  };
  try {
    let fingerprint = "";
    await assert.rejects(remote.connect(input), (error: any) => {
      assert.equal(error.status, 409);
      fingerprint = error.details.fingerprint;
      return true;
    });
    assert.equal(authAttempts, 0);
    assert.equal(remote.connection, null);
    const connection = await remote.connect({ ...input, fingerprint });
    assert.equal(connection.connected, true);
    assert.equal(connection.home, "/home/tester");
    assert.equal(authAttempts, 1);
    await assert.rejects(remote.run("false"), /intentional failure/);
    const command = await remote.accountCommand(
      "account-1",
      "codex app-server",
    );
    assert.match(
      command,
      /CODEX_HOME='\/home\/tester\/\.cloudki\/accounts\/account-1\/codex'/,
    );
    assert.match(command, /GEMINI_HOME=/);
    assert.match(command, /XDG_DATA_HOME=/);
    assert.match(command, /export PATH=.*\.local\/bin/);
    assert.doesNotMatch(command, / HOME=/);
    for (const id of ["account-1", "account-2"]) {
      const agy = await remote.accountCommand(id, "agy models", "antigravity");
      assert.ok(agy.includes(` HOME='/home/tester/.cloudki/accounts/${id}/home'`));
      assert.ok(agy.includes("CLOUDKI_USER_HOME='/home/tester'"));
    }
    await assert.rejects(
      remote.connect({ ...input, fingerprint: "SHA256:wrong" }),
      (error: any) => error.status === 409 && error.details.changed,
    );
    assert.equal(authAttempts, 1);
    assert.equal(remote.connection?.connected, true);
    await assert.rejects(
      remote.connect({ ...input, fingerprint, password: "wrong" }),
      (error: any) => {
        assert.equal(error.status, 422);
        assert.match(error.message, /SSH-Anmeldung abgelehnt/);
        assert.match(error.message, /SSH-Schlüssel/);
        return true;
      },
    );
    assert.equal(remote.connection?.host, "127.0.0.1");
    const directory = await mkdtemp(join(tmpdir(), "cloudki-ssh-api-"));
    const bridge = await createBridge({ token, dataDir: directory, remote });
    await new Promise<void>((done) => bridge.server.listen(0, "127.0.0.1", done));
    const base = `http://127.0.0.1:${(bridge.server.address() as { port: number }).port}`;
    const connect = (password: string) =>
      fetch(base + "/api/server/connect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "capacitor://localhost",
        },
        body: JSON.stringify({ ...input, fingerprint, password }),
      });
    try {
      const refused = await connect("wrong");
      assert.equal(refused.status, 422);
      assert.equal(refused.headers.get("access-control-allow-origin"), "capacitor://localhost");
      assert.match((await refused.json()).error, /SSH-Schlüssel/);
      const accepted = await connect("test-password");
      assert.equal(accepted.status, 200);
      const state = await accepted.json();
      assert.equal(state.connection.connected, true);
      assert.match(state.connection.hardware, /RAM: 8.0 GiB/);
    } finally {
      await bridge.close();
      await rm(directory, { recursive: true, force: true });
    }
  } finally {
    remote.disconnect();
    for (const client of connections) client.end();
    await new Promise<void>((done) => ssh.close(() => done()));
  }
});

test("persistence survives restart, marks interrupted work and refuses corrupt files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cloudki-store-"));
  try {
    const store = new Store(directory);
    await store.load();
    store.state.profile.username = "Test";
    store.state.chats.push({
      id: "one",
      title: "Saved",
      projectId: null,
      pinned: false,
      updatedAt: "2026-10-29",
      messages: [
        {
          id: "m",
          role: "assistant",
          text: "partial",
          createdAt: "2026-10-29",
          status: "running",
        },
      ],
    });
    await Promise.all([store.save(), store.save()]);
    const again = new Store(directory);
    await again.load();
    assert.equal(again.state.profile.username, "Test");
    assert.equal(again.state.chats[0].messages[0].status, "failed");
    assert.equal(again.state.chats[0].messages[0].text, "partial");
    await writeFile(join(directory, "state.json"), "{corrupt");
    await assert.rejects(new Store(directory).load());
    assert.equal(
      await readFile(join(directory, "state.json"), "utf8"),
      "{corrupt",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("quota conversion, transcript handoff and input validation use real values", () => {
  assert.equal(authorized(`Bearer ${token}`, token), true);
  assert.equal(authorized(`Bearer ${token}x`, token), false);
  assert.deepEqual(
    quotaWindows({
      rateLimitsByLimitId: {
        codex: {
          primary: {
            usedPercent: 25,
            windowDurationMins: 300,
            resetsAt: 1793300000,
          },
        },
      },
    }),
    [{ label: "codex · 5 Std.", remaining: 75, resetsAt: 1793300000 }],
  );
  assert.deepEqual(quotaWindows({}), []);
  assert.deepEqual(quotaWindows({ rateLimits: { primary: null } }), []);
  assert.equal(
    shellQuote("/tmp/project'; touch /tmp/pwn; '"),
    "'/tmp/project'\\''; touch /tmp/pwn; '\\''' ".trim(),
  );
  assert.throws(() => absolutePath("relative"));
  assert.throws(() => absolutePath("/tmp/\ninvalid"));
  const chat: any = {
    messages: [
      {
        role: "user",
        text: "Original request",
        attachments: [{ name: "a.txt", path: "/a.txt" }],
      },
      { role: "assistant", status: "complete", text: "Existing answer" },
      { role: "assistant", status: "running", text: "" },
    ],
  };
  const result = transcript(chat);
  assert.match(result, /Original request/);
  assert.match(result, /Existing answer/);
  assert.match(result, /\/a.txt/);
  assert.doesNotMatch(result, /"content":""/);
  const switched = transcript({ messages: [
    { role: "user", text: "Erstelle eine Waffe" },
    { role: "assistant", status: "complete", model: "gpt-6.1-sol", text: "Waffenmodell gespeichert unter /projekt/waffe.blend" },
    { role: "user", text: "Verbessere sie" },
    { role: "assistant", status: "running", text: "" },
  ] } as any);
  assert.match(switched, /Erstelle eine Waffe/);
  assert.match(switched, /waffe\.blend/);
  assert.match(switched, /Verbessere sie/);
  assert.throws(
    () =>
      transcript({
        messages: [{ role: "user", text: "x".repeat(300001) }],
      } as any),
    /Verlauf zu groß/,
  );
});
