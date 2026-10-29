import ssh2, { type Client, type ClientChannel, type SFTPWrapper } from "ssh2";
import { createHash } from "node:crypto";
import type { Connection } from "../src/types.ts";
import { absolutePath, HttpError, shellQuote, text } from "./validation.ts";
import { clientPath } from "./clients.ts";

export class Remote {
  client: Client | null = null;
  connection: Connection | null = null;
  onDisconnect = () => {};
  private connecting = false;
  async connect(input: Record<string, unknown>) {
    if (this.connecting)
      throw new HttpError(409, "Verbindungsaufbau läuft bereits");
    const host = text(input.host, "Host", 253).trim();
    if (!/^[a-zA-Z0-9.:[\]_-]+$/.test(host))
      throw new HttpError(400, "Ungültiger Host");
    const username = text(input.username, "SSH-Benutzer", 64);
    const password = text(input.password ?? "", "Passwort", 4096, true);
    const privateKey = text(
      input.privateKey ?? "",
      "Privater Schlüssel",
      32000,
      true,
    );
    const port = Number(input.port ?? 22);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new HttpError(400, "Ungültiger Port");
    if (!password && !privateKey)
      throw new HttpError(400, "SSH-Passwort oder privater Schlüssel fehlt");
    const fingerprint = text(
      input.fingerprint ?? "",
      "Host-Schlüssel",
      100,
      true,
    );
    this.connecting = true;
    const candidate = new ssh2.Client();
    let seen = "";
    try {
      await new Promise<void>((resolve, reject) => {
        candidate.once("ready", resolve);
        candidate.on("error", reject);
        candidate.connect({
          host,
          port,
          username,
          password: password || undefined,
          privateKey: privateKey || undefined,
          readyTimeout: 12000,
          keepaliveInterval: 15000,
          keepaliveCountMax: 3,
          hostVerifier(key: Buffer) {
            seen = `SHA256:${createHash("sha256").update(key).digest("base64").replace(/=+$/, "")}`;
            return fingerprint === seen;
          },
        });
      });
      const home = (
        await this.runOn(candidate, 'printf "%s" "$HOME"')
      ).stdout.trim();
      absolutePath(home);
      const hardware = (
        await this.runOn(
          candidate,
          "uname -sm; hostname; getconf _NPROCESSORS_ONLN; awk '/MemTotal/ {printf \"RAM: %.1f GiB\\n\", $2/1048576}' /proc/meminfo; (command -v nvidia-smi >/dev/null && nvidia-smi --query-gpu=name,memory.total --format=csv,noheader) || true",
        )
      ).stdout.trim();
      this.disconnect();
      this.client = candidate;
      this.connection = {
        host,
        port,
        username,
        fingerprint: seen,
        connected: true,
        home,
        hardware,
      };
      candidate.on("close", () => {
        if (this.client === candidate) {
          this.client = null;
          if (this.connection) this.connection.connected = false;
          this.onDisconnect();
        }
      });
      return this.connection;
    } catch (error) {
      candidate.end();
      if (seen && seen !== fingerprint)
        throw new HttpError(
          409,
          fingerprint
            ? "Der SSH-Host-Schlüssel hat sich geändert. Verbindung abgelehnt."
            : "SSH-Host-Schlüssel vor der ersten Anmeldung prüfen.",
          { fingerprint: seen, changed: Boolean(fingerprint) },
        );
      throw new HttpError(
        // Tunnel-Proxys ersetzen 502-Antworten und verschlucken dabei JSON und CORS.
        422,
        (error as { level?: string }).level === "client-authentication"
          ? "SSH-Anmeldung abgelehnt. Benutzer und Zugangsdaten prüfen. Wenn der Server keine Passwörter erlaubt, unter SSH-Schlüssel den privaten Schlüssel verwenden."
          : `SSH-Verbindung fehlgeschlagen: ${(error as Error).message}`,
      );
    } finally {
      this.connecting = false;
    }
  }
  disconnect() {
    const old = this.client;
    this.client = null;
    if (this.connection) this.connection.connected = false;
    old?.end();
    this.onDisconnect();
  }
  requireClient() {
    if (!this.client)
      throw new HttpError(409, "Zuerst den SSH-Server verbinden");
    return this.client;
  }
  async open(command: string, pty = false): Promise<ClientChannel> {
    return new Promise((resolve, reject) =>
      this.requireClient().exec(
        command,
        pty
          ? {
              pty: {
                term: "xterm-256color",
                cols: 100,
                rows: 30,
                width: 0,
                height: 0,
              },
            }
          : {},
        (error, channel) => (error ? reject(error) : resolve(channel)),
      ),
    );
  }
  run(command: string, timeout = 20000) {
    return this.runOn(this.requireClient(), command, timeout);
  }
  private async runOn(
    client: Client,
    command: string,
    timeout = 20000,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let channel: ClientChannel | undefined;
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        channel?.signal("KILL");
        channel?.destroy();
        reject(new Error("SSH-Befehl: Zeitlimit überschritten"));
      }, timeout);
      client.exec(command, (error, stream) => {
        if (error) {
          clearTimeout(timer);
          reject(error);
          return;
        }
        if (expired) {
          stream.signal("KILL");
          stream.destroy();
          return;
        }
        channel = stream;
        let stdout = "";
        let stderr = "";
        let size = 0;
        const append = (chunk: Buffer, isError: boolean) => {
          size += chunk.length;
          if (size > 2_000_000) {
            stream.signal("KILL");
            stream.destroy();
            clearTimeout(timer);
            reject(new Error("SSH-Ausgabe zu groß"));
            return;
          }
          if (isError) stderr += chunk.toString();
          else stdout += chunk.toString();
        };
        stream.on("data", (chunk: Buffer) => append(chunk, false));
        stream.stderr.on("data", (chunk: Buffer) => append(chunk, true));
        stream.on("error", (error: Error) => {
          clearTimeout(timer);
          reject(error);
        });
        stream.on("close", (code: number | null, signal: string | null) => {
          clearTimeout(timer);
          if (code !== 0 || signal)
            reject(
              new Error(
                stderr.trim().slice(-3000) ||
                  `Befehl beendet (${code ?? signal ?? "Verbindung unterbrochen"})`,
              ),
            );
          else resolve({ stdout, stderr });
        });
      });
    });
  }
  async sftp(): Promise<SFTPWrapper> {
    return new Promise((resolve, reject) =>
      this.requireClient().sftp((error, ftp) =>
        error ? reject(error) : resolve(ftp),
      ),
    );
  }
  async writeFile(path: string, bytes: Buffer) {
    const ftp = await this.sftp();
    try {
      await new Promise<void>((resolve, reject) => {
        const stream = ftp.createWriteStream(absolutePath(path), {
          mode: 0o600,
        });
        stream.on("error", reject);
        stream.on("close", resolve);
        stream.end(bytes);
      });
    } finally {
      ftp.end();
    }
  }
  async canonicalDirectory(path: string) {
    return (
      await this.run(`cd -- ${shellQuote(absolutePath(path))} && pwd -P`)
    ).stdout.trim();
  }
  accountDirectory(accountId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(accountId) || !this.connection?.home)
      throw new HttpError(400, "Ungültiges Account-Verzeichnis");
    return `${this.connection.home}/.cloudki/accounts/${accountId}`;
  }
  async accountCommand(accountId: string, command: string) {
    const directory = this.accountDirectory(accountId);
    await this.run(
      `umask 077; mkdir -p -- ${["codex", "gemini", "config", "data", "state"].map((name) => shellQuote(`${directory}/${name}`)).join(" ")}`,
    );
    const q = shellQuote;
    // Separate profiles are not an OS sandbox. Deploy one Unix user per owner.
    return `export PATH=${clientPath}; env -u OPENAI_API_KEY -u CODEX_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY -u ANTHROPIC_API_KEY -u GOOGLE_APPLICATION_CREDENTIALS -u OPENCODE_AUTH_JSON CODEX_HOME=${q(directory + "/codex")} GEMINI_HOME=${q(directory + "/gemini")} ANTIGRAVITY_CONFIG_REL_DIR=${q(`.cloudki/accounts/${accountId}/gemini`)} ANTIGRAVITY_CREDENTIAL_SCOPE=${q(`cloudki-${accountId}`)} XDG_CONFIG_HOME=${q(directory + "/config")} XDG_DATA_HOME=${q(directory + "/data")} XDG_STATE_HOME=${q(directory + "/state")} ${command}`;
  }
}
