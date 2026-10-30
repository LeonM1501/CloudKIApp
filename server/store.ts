import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { State } from "../src/types.ts";
export function emptyState(): State {
  return {
    version: 2,
    profile: { username: "", onboardingComplete: false },
    connection: null,
    accounts: [],
    projects: [],
    chats: [],
  };
}
export class Store {
  state = emptyState();
  private pending: Promise<void> = Promise.resolve();
  constructor(private directory: string) {}
  async load() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      const data = JSON.parse(
        await readFile(join(this.directory, "state.json"), "utf8"),
      );
      if (
        data.version !== 2 ||
        !Array.isArray(data.chats) ||
        !Array.isArray(data.accounts) ||
        !Array.isArray(data.projects) ||
        !data.profile
      )
        throw new Error(
          "Unbekanntes Datenformat. state.json sichern und Migration prüfen.",
        );
      this.state = data;
      for (const project of this.state.projects) {
        if (project.syncing)
          project.syncError = "Bridge wurde während des GitHub-Uploads neu gestartet. Upload erneut prüfen.";
        project.syncing = false;
      }
      if (this.state.connection) this.state.connection.connected = false;
      for (const account of this.state.accounts) {
        account.status = "disconnected";
        account.models = [];
        account.quotas = [];
        delete account.login;
      }
      for (const chat of this.state.chats)
        for (const message of chat.messages)
          if (message.status === "running") {
            message.status = "failed";
            message.error =
              "Die Bridge wurde während der Antwort neu gestartet. Der letzte gespeicherte Zwischenstand bleibt erhalten; bitte die Aufgabe erneut senden.";
          }
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  save() {
    const snapshot = structuredClone(this.state);
    if (snapshot.connection) snapshot.connection.connected = false;
    for (const account of snapshot.accounts) delete account.login;
    const bytes = JSON.stringify(snapshot, null, 2);
    this.pending = this.pending
      .catch(() => undefined)
      .then(async () => {
        const target = join(this.directory, "state.json");
        await writeFile(`${target}.tmp`, bytes, { mode: 0o600 });
        await rename(`${target}.tmp`, target);
      });
    return this.pending;
  }
}
