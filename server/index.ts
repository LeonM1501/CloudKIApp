import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket, createWebSocketStream } from "ws";
import { Remote } from "./ssh.ts";
import { Store } from "./store.ts";
import { Providers } from "./providers.ts";
import { Desktops } from "./desktops.ts";
import { GitHub, githubLoginCommand, githubRepository } from "./github.ts";
import {
  absolutePath,
  authorized,
  choice,
  HttpError,
  id,
  shellQuote as q,
  text,
} from "./validation.ts";
import type { Account, Attachment, Chat, Message, Project } from "../src/types.ts";

interface Options {
  token: string;
  dataDir: string;
  origins?: string[];
  remote?: Remote;
}
export async function createBridge(options: Options) {
  if (options.token.length < 32)
    throw new Error(
      "BRIDGE_TOKEN muss mindestens 32 Zeichen lang sein. Mit npm run token erzeugen.",
    );
  const app = express();
  app.disable("x-powered-by");
  const server = createServer(app);
  const store = new Store(options.dataDir);
  await store.load();
  const remote = options.remote ?? new Remote();
  const desktops = new Desktops(remote);
  const github = new GitHub(remote);
  const projectWork = new Set<string>();
  const clients = new Set<WebSocket>();
  const emit = (event: string, payload: unknown) => {
    const bytes = JSON.stringify({ event, payload });
    for (const client of clients) {
      if (client.bufferedAmount > 4_000_000)
        client.close(1013, "Client zu langsam");
      else if (client.readyState === WebSocket.OPEN) client.send(bytes);
    }
  };
  const providers = new Providers(remote, emit);
  const save = async () => {
    await store.save();
    emit("state", snapshot());
  };
  const snapshot = () => ({
    ...store.state,
    connection: remote.connection ?? store.state.connection,
    approvals: providers.approvals(),
  });
  remote.onDisconnect = () => {
    providers.close();
    desktops.close();
    for (const account of store.state.accounts) {
      account.status = "disconnected";
      account.models = [];
      account.quotas = [];
      delete account.login;
    }
    emit("disconnected", {});
  };
  const origins = new Set(
    options.origins ?? [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "capacitor://localhost",
    ],
  );
  const acceptableOrigin = (origin: string | undefined) =>
    !origin || origins.has(origin);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; img-src 'self' data: blob:; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    if (!acceptableOrigin(req.headers.origin)) {
      res
        .status(403)
        .json({ error: "Origin nicht erlaubt. BRIDGE_ORIGINS prüfen." });
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: (origin, done) => done(null, acceptableOrigin(origin)),
      allowedHeaders: ["Authorization", "Content-Type"],
      methods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  );
  app.get("/health", (_req, res) => res.json({ ok: true }));
  const limits = new Map<string, { count: number; until: number }>();
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const key = req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let limit = limits.get(key);
    if (!limit || limit.until < now) {
      limit = { count: 0, until: now + 60000 };
      limits.set(key, limit);
    }
    if (++limit.count > 300) {
      res.status(429).json({
        error: "Zu viele Anfragen. In einer Minute erneut versuchen.",
      });
      return;
    }
    if (!authorized(req.headers.authorization, options.token)) {
      res
        .status(401)
        .json({ error: "Bridge-Schlüssel fehlt oder ist ungültig" });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "12mb" }));
  const accountFor = (value: unknown) => {
    const found = store.state.accounts.find(
      (account) => account.id === id(value),
    );
    if (!found) throw new HttpError(404, "Account nicht gefunden");
    return found;
  };
  const chatFor = (value: unknown) => {
    const found = store.state.chats.find((chat) => chat.id === id(value));
    if (!found) throw new HttpError(404, "Chat nicht gefunden");
    return found;
  };
  const idle = () => {
    if (providers.busy)
      throw new HttpError(409, "Zuerst laufende Antworten beenden");
  };
  const cwdFor = (chat: Chat) =>
    chat.projectId
      ? store.state.projects.find((project) => project.id === chat.projectId)!
          .path
      : `${remote.connection!.home}/.cloudki/workspace`;

  app.get("/api/state", (_req, res) => res.json(snapshot()));
  app.post("/api/server/connect", async (req, res) => {
    idle();
    const previous = store.state.connection;
    if (
      previous &&
      (previous.host !== req.body.host ||
        previous.username !== req.body.username ||
        previous.port !== Number(req.body.port))
    )
      throw new HttpError(
        409,
        "Diese Bridge ist einem Server und SSH-Benutzer zugeordnet. Für einen anderen Server eine eigene Datenablage verwenden.",
      );
    if (
      previous &&
      req.body.fingerprint &&
      req.body.fingerprint !== previous.fingerprint
    )
      throw new HttpError(
        409,
        "Gespeicherter SSH-Host-Schlüssel stimmt nicht überein. Änderung zuerst auf dem Bridge-Host prüfen.",
      );
    store.state.connection = await remote.connect({
      ...req.body,
      fingerprint: previous?.fingerprint ?? req.body.fingerprint,
    });
    await remote.run(
      `umask 077; mkdir -p -- ${q(remote.connection!.home + "/.cloudki/workspace")}`,
    );
    await save();
    res.json(snapshot());
  });
  app.post("/api/server/disconnect", async (_req, res) => {
    remote.disconnect();
    await save();
    res.json(snapshot());
  });
  app.patch("/api/profile", async (req, res) => {
    store.state.profile.username = text(req.body.username, "Name", 64).trim();
    if (req.body.onboardingComplete === true) {
      remote.requireClient();
      if (
        !store.state.accounts.some(
          (account) =>
            ["ready", "authenticated"].includes(account.status) &&
            account.models.length,
        )
      )
        throw new HttpError(
          409,
          "Mindestens einen Anbieter verbinden und dessen Modelle laden",
        );
      store.state.profile.onboardingComplete = true;
    }
    await save();
    res.json(snapshot());
  });
  app.post("/api/accounts", async (req, res) => {
    remote.requireClient();
    if (store.state.accounts.length >= 8)
      throw new HttpError(400, "Maximal acht Accounts pro Bridge");
    const provider = choice(req.body.provider, [
      "codex",
      "antigravity",
      "opencode",
    ] as const);
    const account: Account = {
      id: randomUUID(),
      provider,
      label: text(req.body.label, "Account-Name", 80),
      status: "disconnected",
      models: [],
      quotas: [],
    };
    store.state.accounts.push(account);
    await save();
    res.status(201).json(account);
  });
  app.delete("/api/accounts/:id", async (req, res) => {
    const account = accountFor(req.params.id);
    if (providers.isBusy(account.id))
      throw new HttpError(409, "Account arbeitet gerade");
    providers.invalidate(account.id);
    providers.cancelLogin(account.id);
    store.state.accounts = store.state.accounts.filter(
      (value) => value !== account,
    );
    await save();
    res.json({
      ok: true,
      note: "Entfernt. Provider-Zugangsdaten bleiben im isolierten Profil auf dem SSH-Server; dort separat abmelden/löschen.",
    });
  });
  const refreshing = new Map<string, Promise<Account>>();
  app.post("/api/accounts/:id/refresh", async (req, res) => {
    remote.requireClient();
    const account = accountFor(req.params.id);
    let pending = refreshing.get(account.id);
    if (!pending) {
      pending = providers
        .refresh(account)
        .finally(() => refreshing.delete(account.id));
      refreshing.set(account.id, pending);
    }
    await pending;
    await save();
    res.json(account);
  });
  app.post("/api/accounts/:id/login", async (req, res) => {
    const account = accountFor(req.params.id);
    if (req.body?.restart === true) providers.cancelLogin(account.id);
    const login = await providers.login(account);
    if ("authenticated" in login && login.authenticated) await save();
    res.json(login);
  });
  app.post("/api/accounts/:id/login/code", (req, res) => {
    const code = text(req.body.code, "Bestätigungscode", 4096).trim();
    if (/\s/.test(code)) throw new HttpError(400, "Nur den Bestätigungscode eingeben");
    providers.submitLoginCode(accountFor(req.params.id), code);
    res.json({ ok: true });
  });
  app.delete("/api/accounts/:id/login", (req, res) => {
    providers.cancelLogin(accountFor(req.params.id).id, false);
    res.json({ ok: true });
  });
  app.post("/api/accounts/:id/prepare", (req, res) => {
    remote.requireClient();
    const result = providers.prepare(accountFor(req.params.id));
    res.status(result.ready ? 200 : 202).json(result);
  });
  app.get("/api/accounts/:id/skills", async (req, res) => {
    const cwd = absolutePath(req.query.cwd ?? remote.connection?.home);
    res.json(await providers.skills(accountFor(req.params.id), cwd));
  });
  app.get("/api/directories", async (req, res) => {
    const path = await remote.canonicalDirectory(
      absolutePath(req.query.path ?? remote.connection?.home),
    );
    const ftp = await remote.sftp();
    try {
      const entries = await new Promise<any[]>((done, fail) =>
        ftp.readdir(path, (error, list) => (error ? fail(error) : done(list))),
      );
      res.json({
        path,
        entries: entries
          .filter(
            (entry) =>
              entry.attrs.isDirectory() && !entry.filename.startsWith("."),
          )
          .slice(0, 500)
          .map((entry) => ({
            name: entry.filename,
            path: `${path === "/" ? "" : path}/${entry.filename}`,
          })),
      });
    } finally {
      ftp.end();
    }
  });
  const cloning = new Map<string, { error?: Error }>();
  app.post("/api/projects", async (req, res) => {
    remote.requireClient();
    if (req.body.repository !== undefined) {
      const { url } = githubRepository(req.body.repository);
      const existing = store.state.projects.find((project) => project.repository === url);
      if (existing) { res.json(existing); return; }
      let job = cloning.get(url);
      if (job?.error) {
        cloning.delete(url);
        throw new HttpError(422, `GitHub-Repo konnte nicht geladen werden. Für private Repos zuerst GitHub verbinden. ${job.error.message}`);
      }
      if (!job) {
        if (store.state.projects.length + cloning.size >= 100)
          throw new HttpError(400, "Maximal 100 Projekte");
        job = {};
        cloning.set(url, job);
        const current = job;
        void github.clone(url).then(async (project) => {
          store.state.projects.push(project);
          await save();
          cloning.delete(url);
        }).catch((error: Error) => { current.error = error; });
      }
      res.status(202).json({ pending: true });
      return;
    }
    if (store.state.projects.length >= 100)
      throw new HttpError(400, "Maximal 100 Projekte");
    const name = text(req.body.name, "Projektname", 100);
    const path = await remote.canonicalDirectory(absolutePath(req.body.path));
    if (store.state.projects.some((project) => project.path === path))
      throw new HttpError(409, "Ordner ist bereits hinzugefügt");
    const project = { id: randomUUID(), name, path };
    store.state.projects.push(project);
    await save();
    res.status(201).json(project);
  });
  const pushProject = async (project: Project) => {
    project.syncing = true;
    delete project.syncError;
    await save();
    try {
      return await github.push(project);
    } catch (error) {
      project.syncError = (error as Error).message;
      throw error;
    } finally {
      project.syncing = false;
      await save();
    }
  };
  app.post("/api/projects/:id/push", async (req, res) => {
    const project = store.state.projects.find((value) => value.id === id(req.params.id));
    if (!project?.repository) throw new HttpError(404, "GitHub-Projekt nicht gefunden");
    if (projectWork.has(project.id)) throw new HttpError(409, "Projekt arbeitet bereits");
    projectWork.add(project.id);
    res.status(202).json({ pending: true });
    void pushProject(project).catch(() => {}).finally(() => projectWork.delete(project.id));
  });
  app.post("/api/chats", async (req, res) => {
    if (req.body.mode === "update-assistant") {
      const existing = store.state.chats.find(
        (chat) => chat.kind === "update-assistant",
      );
      if (existing) {
        res.json(existing);
        return;
      }
      if (store.state.chats.length >= 200)
        throw new HttpError(
          400,
          "Maximal 200 Chats. Alte Chats exportieren und löschen.",
        );
      const opencode = store.state.accounts.find(
        (account) =>
          account.provider === "opencode" &&
          account.models.some(
            (model) => model.id === "opencode/deepseek-v4.1-flash-free",
          ),
      );
      const context = await readFile(
        new URL("../docs/UPDATE_ASSISTANT.md", import.meta.url),
        "utf8",
      ).catch(
        () =>
          "CloudKI Bridge, Repository https://github.com/LeonM1501/CloudKIApp. Web-Updates laufen über den Release-Tag web-latest, native Builds über ipa-latest.",
      );
      const now = new Date().toISOString();
      const chat: Chat = {
        id: randomUUID(),
        title: "CloudKI Update-Assistent",
        projectId: null,
        pinned: true,
        kind: "update-assistant",
        systemPrompt: context,
        messages: [
          {
            id: randomUUID(),
            role: "assistant",
            text:
              "Ich bin dein CloudKI Update-Assistent. Ich kenne das Repository, den Live-Update-Workflow und die Unity-/Display-Themen.\n\n" +
              "Frag mich zum Beispiel: „Baue eine neue Funktion ein und veröffentliche das Web-Update“, „Warum startet Unity nicht?“ oder „Brauche ich dafür eine neue IPA?“\n\n" +
              "Ich antworte mit OpenCode und dem Modell DeepSeek V4.1 Flash Free. Reine Web-Änderungen kommen über den Update-Button in den Einstellungen an; native Änderungen brauchen weiterhin eine neue IPA.",
            createdAt: now,
            accountId: opencode?.id,
            model: "opencode/deepseek-v4.1-flash-free",
            status: "complete",
            events: [],
          },
        ],
        updatedAt: now,
      };
      store.state.chats.unshift(chat);
      await save();
      res.status(201).json(chat);
      return;
    }
    if (store.state.chats.length >= 200)
      throw new HttpError(
        400,
        "Maximal 200 Chats. Alte Chats exportieren und löschen.",
      );
    const projectId =
      req.body.projectId == null ? null : id(req.body.projectId);
    if (
      projectId &&
      !store.state.projects.some((project) => project.id === projectId)
    )
      throw new HttpError(404, "Projekt nicht gefunden");
    const chat: Chat = {
      id: randomUUID(),
      title: "Neuer Chat",
      projectId,
      pinned: false,
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    store.state.chats.unshift(chat);
    await save();
    res.status(201).json(chat);
  });
  app.patch("/api/chats/:id", async (req, res) => {
    const chat = chatFor(req.params.id);
    if (req.body.title !== undefined)
      chat.title = text(req.body.title, "Titel", 160);
    if (typeof req.body.pinned === "boolean") chat.pinned = req.body.pinned;
    await save();
    res.json(chat);
  });
  app.delete("/api/chats/:id", async (req, res) => {
    const chat = chatFor(req.params.id);
    if (chat.messages.some((message) => message.status === "running"))
      throw new HttpError(409, "Antwort zuerst abbrechen");
    store.state.chats = store.state.chats.filter((value) => value !== chat);
    await save();
    res.json({ ok: true });
  });
  const uploads = new Map<string, Attachment>();
  let uploadedBytes = 0;
  app.post("/api/uploads", async (req, res) => {
    remote.requireClient();
    const name = text(req.body.name, "Dateiname", 200);
    const base64 = text(req.body.data, "Datei", 11_200_000);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
      throw new HttpError(400, "Ungültige Datei");
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length || bytes.length > 8 * 1024 * 1024)
      throw new HttpError(
        413,
        "Datei muss zwischen 1 Byte und 8 MiB groß sein",
      );
    if (uploadedBytes + bytes.length > 200 * 1024 * 1024 || uploads.size >= 200)
      throw new HttpError(413, "Upload-Limit dieser Bridge-Sitzung erreicht");
    uploadedBytes += bytes.length;
    const directory = `${remote.connection!.home}/.cloudki/uploads`;
    await remote.run(`umask 077; mkdir -p -- ${q(directory)}`);
    const path = `${directory}/${randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const ftp = await remote.sftp();
    try {
      await new Promise<void>((done, fail) => {
        const stream = ftp.createWriteStream(path, {
          mode: 0o600,
          flags: "wx",
        });
        stream.on("error", fail);
        stream.on("close", done);
        stream.end(bytes);
      });
    } finally {
      ftp.end();
    }
    const file = { name, path, size: bytes.length };
    uploads.set(path, file);
    res.status(201).json(file);
  });
  app.post("/api/chats/:id/turn", async (req, res) => {
    remote.requireClient();
    const chat = chatFor(req.params.id);
    const account = accountFor(req.body.accountId);
    if (
      chat.messages.some((message) => message.status === "running") ||
      providers.isBusy(account.id)
    )
      throw new HttpError(409, "Chat oder Account arbeitet bereits");
    if (chat.messages.length >= 400)
      throw new HttpError(
        413,
        "Chat ist voll. Exportieren und neuen Chat beginnen.",
      );
    const prompt = text(req.body.text, "Nachricht", 60000);
    const model = text(req.body.model, "Modell", 200);
    const permission = choice(req.body.permission, [
      "ask",
      "workspace",
      "read-only",
      "full",
    ] as const);
    const browser = req.body.browser === true;
    if (
      browser &&
      (!desktops.running().includes("browser") || permission !== "full")
    )
      throw new HttpError(
        409,
        "Browser starten und Vollzugriff bestätigen, bevor du das Browser-Plugin anhängst.",
      );
    const effort = req.body.effort
      ? text(req.body.effort, "Denkaufwand", 30)
      : undefined;
    const available = account.models.find((item) => item.id === model);
    if (!available)
      throw new HttpError(400, "Modell fehlt. Modellliste aktualisieren.");
    if (effort && !available.efforts?.includes(effort))
      throw new HttpError(400, "Denkaufwand wird vom Modell nicht angeboten");
    if (
      !Array.isArray(req.body.attachments) ||
      req.body.attachments.length > 10
    )
      throw new HttpError(400, "Ungültige Anhänge");
    const attachments = req.body.attachments.map((path: unknown) => {
      const file = uploads.get(text(path, "Anhang", 4096));
      if (!file) throw new HttpError(400, "Anhang nicht hochgeladen");
      return file;
    });
    const user: Message = {
      id: randomUUID(),
      role: "user",
      text: prompt,
      attachments,
      createdAt: new Date().toISOString(),
    };
    const assistant: Message = {
      id: randomUUID(),
      role: "assistant",
      text: "",
      createdAt: new Date().toISOString(),
      accountId: account.id,
      model,
      status: "running",
      events: [],
    };
    const project = store.state.projects.find((value) => value.id === chat.projectId);
    const sync = project?.repository && permission !== "read-only";
    if (project?.repository && projectWork.has(project.id))
      throw new HttpError(409, "In diesem GitHub-Projekt läuft bereits ein Auftrag oder Upload");
    if (project?.repository) projectWork.add(project.id);
    chat.messages.push(user, assistant);
    if (chat.messages.length === 2) chat.title = prompt.slice(0, 80);
    chat.updatedAt = user.createdAt;
    try {
      await store.save();
    } catch (error) {
      if (project) projectWork.delete(project.id);
      throw error;
    }
    let lastUpdate = 0;
    let lastSaved = 0;
    const update = () => {
      if (Date.now() - lastUpdate > 80 || assistant.status !== "running") {
        lastUpdate = Date.now();
        emit("chat", chat);
      }
      if (Date.now() - lastSaved > 1000) {
        lastSaved = Date.now();
        void store.save().catch(() => emit("error", { message: "Zwischenstand konnte nicht gespeichert werden." }));
      }
    };
    res.status(202).json(chat);
    void (async () => {
      if (sync) await github.prepare(project);
      if (assistant.status === "cancelled") return;
      await providers.turn(
        account,
        chat,
        assistant,
        cwdFor(chat),
        model,
        permission,
        effort,
        update,
        browser,
      );
      if (sync && assistant.status === "complete") {
        const event = { id: randomUUID(), title: "GitHub-Upload", detail: "Änderungen werden committed und hochgeladen …", status: "running" };
        assistant.events!.push(event);
        update();
        try {
          event.detail = await pushProject(project) || "GitHub ist aktuell.";
          event.status = "complete";
        } catch (error) {
          event.detail = `Upload fehlgeschlagen; lokale Arbeit bleibt erhalten. ${(error as Error).message}`;
          event.status = "failed";
          assistant.error = event.detail;
        }
      }
    })()
      .catch((error) => {
        assistant.status = "failed";
        assistant.error = error.message;
      })
      .finally(() => {
        if (project) projectWork.delete(project.id);
        emit("chat", chat);
        void save().catch(() =>
          emit("error", {
            message:
              "Chat konnte nicht gespeichert werden. Bitte jetzt exportieren.",
          }),
        );
      });
  });
  app.post("/api/chats/:id/cancel", async (req, res) => {
    const chat = chatFor(req.params.id);
    providers.cancel(chat.id);
    const message = chat.messages.at(-1);
    if (message?.status === "running") message.status = "cancelled";
    await save();
    res.json({ ok: true });
  });
  app.post("/api/approvals/:id", (req, res) => {
    providers.answer(id(req.params.id), text(req.body.option, "Antwort", 200));
    res.json({ ok: true });
  });
  app.get("/api/apps", async (_req, res) => res.json(await desktops.status()));
  app.post("/api/apps/:id/start", async (req, res) => {
    await desktops.start(
      desktops.appId(req.params.id),
    );
    res.json(await desktops.status());
  });
  app.post("/api/apps/:id/stop", async (req, res) => {
    desktops.stop(
      desktops.appId(req.params.id),
    );
    res.json(await desktops.status());
  });

  const tickets = new Map<
    string,
    { purpose: string; target: string; until: number }
  >();
  app.post("/api/socket-ticket", (req, res) => {
    const purpose = choice(req.body.purpose, [
      "events",
      "terminal",
      "desktop",
      "account",
      "install",
      "github",
    ] as const);
    if (purpose !== "events") remote.requireClient();
    if (tickets.size >= 50)
      throw new HttpError(429, "Zu viele Verbindungsversuche");
    const target = req.body.target ? text(req.body.target, "Ziel", 80) : "";
    if (purpose === "account") {
      const account = accountFor(target);
      if (providers.isBusy(account.id))
        throw new HttpError(409, "Account arbeitet gerade");
    }
    if (purpose === "desktop" || purpose === "install") desktops.appId(target);
    const ticket = randomBytes(24).toString("hex");
    tickets.set(ticket, { purpose, target, until: Date.now() + 30000 });
    res.json({ ticket });
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    handleProtocols: () => "cloudki",
  });
  server.on("upgrade", (req, socket, head) => {
    const protocols = (req.headers["sec-websocket-protocol"] ?? "")
      .split(",")
      .map((value) => value.trim());
    const key = protocols
      .find((value) => value.startsWith("ticket."))
      ?.slice(7);
    const ticket = key ? tickets.get(key) : undefined;
    if (key) tickets.delete(key);
    if (
      req.url !== "/ws" ||
      !acceptableOrigin(req.headers.origin) ||
      !ticket ||
      ticket.until < Date.now() ||
      wss.clients.size >= 16
    ) {
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.on("error", () => ws.close());
      void (async () => {
        if (ticket.purpose === "events") {
          clients.add(ws);
          ws.on("close", () => clients.delete(ws));
          ws.send(JSON.stringify({ event: "state", payload: snapshot() }));
          return;
        }
        if (ticket.purpose === "desktop") {
          const appId = desktops.appId(ticket.target);
          const channel = await new Promise<ClientChannel>((done, fail) =>
            remote
              .requireClient()
              .forwardOut(
                "127.0.0.1",
                0,
                "127.0.0.1",
                desktops.port(appId),
                (error, stream) => (error ? fail(error) : done(stream)),
              ),
          );
          if (ws.readyState !== WebSocket.OPEN) {
            channel.destroy();
            return;
          }
          const stream = createWebSocketStream(ws);
          stream.on("error", () => channel.destroy());
          channel.on("error", () => stream.destroy());
          stream.pipe(channel).pipe(stream);
          ws.on("close", () => channel.destroy());
          return;
        }
        let command = "exec bash -l";
        if (ticket.purpose === "account") {
          const account = accountFor(ticket.target);
          providers.invalidate(account.id);
          command = await remote.accountCommand(
            account.id,
            account.provider === "codex"
              ? "codex login --device-auth"
              : account.provider === "antigravity"
                ? "agy"
                : "opencode auth login",
            account.provider,
          );
        } else if (ticket.purpose === "github")
          command = githubLoginCommand();
        else if (ticket.purpose === "install")
          command = desktops.installCommand(
            desktops.appId(ticket.target),
          );
        const channel = await remote.open(command, true);
        if (ws.readyState !== WebSocket.OPEN) {
          channel.signal("TERM");
          channel.end();
          return;
        }
        const output = (data: Buffer) => {
          if (ws.bufferedAmount > 2_000_000) {
            channel.signal("TERM");
            channel.end();
            ws.close(1013);
          } else if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "data", data: data.toString() }));
        };
        channel.on("data", output);
        channel.stderr.on("data", output);
        channel.on("error", (error: Error) => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "error", message: error.message }));
        });
        channel.on("close", (code: number) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "exit", code }));
            ws.close();
          }
        });
        ws.on("message", (bytes) => {
          try {
            const message = JSON.parse(bytes.toString());
            if (message.type === "input")
              channel.write(
                text(message.data, "Terminal-Eingabe", 16000, true),
              );
            if (message.type === "resize") {
              const cols = Math.max(
                20,
                Math.min(300, Number(message.cols) || 80),
              );
              const rows = Math.max(
                5,
                Math.min(150, Number(message.rows) || 24),
              );
              channel.setWindow(rows, cols, 0, 0);
            }
          } catch {
            ws.close(1008, "Ungültige Terminal-Nachricht");
          }
        });
        ws.on("close", () => {
          channel.signal("TERM");
          channel.end();
        });
      })().catch((error) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: error.message }));
          ws.close();
        }
      });
    });
  });
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, item] of tickets)
      if (item.until < now) tickets.delete(key);
    for (const [key, item] of limits) if (item.until < now) limits.delete(key);
    for (const client of wss.clients) {
      const alive = client as WebSocket & { alive?: boolean };
      if (alive.alive === false) {
        client.terminate();
        continue;
      }
      alive.alive = false;
      client.once("pong", () => {
        alive.alive = true;
      });
      client.ping();
    }
  }, 30000);
  cleanup.unref();
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint nicht gefunden" }),
  );
  app.use(express.static(resolve("dist"), { index: "index.html" }));
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (!res.headersSent)
        res
          .status(
            error instanceof HttpError
              ? error.status
              : error.status === 413
                ? 413
                : 500,
          )
          .json({
            error: error.message || "Bridge-Fehler",
            ...(error instanceof HttpError && error.details
              ? { details: error.details }
              : {}),
          });
    },
  );
  const close = async () => {
    clearInterval(cleanup);
    providers.close();
    desktops.close();
    remote.disconnect();
    for (const client of wss.clients) client.terminate();
    wss.close();
    await store.save();
    await new Promise<void>((done) => server.close(() => done()));
  };
  return { app, server, close, store, remote };
}
import type { ClientChannel } from "ssh2";
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const bridge = await createBridge({
    token: process.env.BRIDGE_TOKEN ?? "",
    dataDir: resolve(process.env.BRIDGE_DATA_DIR ?? ".bridge-data"),
    origins: process.env.BRIDGE_ORIGINS?.split(",").map((value) =>
      value.trim(),
    ),
  });
  const port = Number(process.env.PORT ?? 3001);
  bridge.server.listen(port, "127.0.0.1", () =>
    console.log(`CloudKI Bridge: http://127.0.0.1:${port}`),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => {
      void bridge.close().then(() => process.exit(0));
    });
}
