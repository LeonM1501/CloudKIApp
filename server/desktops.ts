import type { ClientChannel } from "ssh2";
import { readFile } from "node:fs/promises";
import type { AppId } from "../src/types.ts";
import { Remote } from "./ssh.ts";
import { HttpError, shellQuote as q } from "./validation.ts";

const programs = { browser: "chromium", blender: "blender", unity: "unityhub" };
const ports = { browser: 5911, blender: 5912, unity: 5913 };
export class Desktops {
  private sessions = new Map<AppId, ClientChannel>();
  private starting = new Set<AppId>();
  constructor(private remote: Remote) {}
  running() {
    return [...this.sessions.keys()];
  }
  close() {
    for (const id of this.running()) this.stop(id);
  }
  stop(id: AppId) {
    const channel = this.sessions.get(id);
    this.sessions.delete(id);
    channel?.signal("TERM");
    channel?.end();
  }
  port(id: AppId) {
    if (!this.sessions.has(id)) throw new HttpError(409, "App zuerst starten");
    return ports[id];
  }
  async status() {
    const result = await this.remote.run(
      'for p in Xvfb x11vnc openbox chromium chromium-browser blender unityhub node; do command -v "$p" >/dev/null 2>&1 && printf "%s\\n" "$p"; done; true',
    );
    return {
      available: result.stdout.trim().split("\n"),
      running: this.running(),
    };
  }
  installCommand(id: AppId) {
    // apt refuses missing packages; Unity's official apt repository must be configured by the owner.
    const packages =
      id === "unity" ? "unityhub" : id === "blender" ? "blender" : "chromium";
    return `sudo apt-get update && sudo apt-get install -y xvfb x11vnc openbox ${packages}`;
  }
  async start(id: AppId) {
    if (this.sessions.has(id)) return;
    if (this.starting.has(id)) throw new HttpError(409, "App startet bereits");
    this.starting.add(id);
    let channel: ClientChannel | undefined;
    try {
      if (id === "browser") {
        await this.remote.run(
          `umask 077; mkdir -p -- ${q(this.remote.connection!.home + "/.cloudki/tools")}`,
        );
        await this.remote.writeFile(
          this.remote.connection!.home + "/.cloudki/tools/browser-mcp.mjs",
          await readFile(
            new URL("../scripts/browser-mcp.mjs", import.meta.url),
          ),
        );
      }
      const directory = `${this.remote.connection!.home}/.cloudki/desktop/${id}`;
      const binary =
        id === "browser"
          ? "$(command -v chromium || command -v chromium-browser)"
          : programs[id];
      const args =
        id === "browser"
          ? `--no-first-run --remote-debugging-address=127.0.0.1 --remote-debugging-port=9229 --user-data-dir=${q(directory + "/profile")} about:blank`
          : "";
      const script = `set -eu
test "$(id -u)" -ne 0 || { echo 'Desktop-Apps bitte als normaler Linux-Benutzer starten, nicht als root.' >&2; exit 1; }
for p in Xvfb x11vnc openbox; do command -v "$p" >/dev/null || { echo "$p fehlt. Laufzeit installieren." >&2; exit 1; }; done
command -v ${programs[id]} >/dev/null ${id === "browser" ? "|| command -v chromium-browser >/dev/null" : ""}
umask 077
mkdir -p -- ${q(directory)}
tmp=$(mktemp -d)
xpid=; vpid=; wpid=; apid=
cleanup() { for pid in "$apid" "$vpid" "$wpid" "$xpid"; do if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; fi; done; rm -f -- "$tmp/display"; rmdir -- "$tmp"; }
trap cleanup EXIT
trap 'exit 130' HUP INT TERM
Xvfb -displayfd 3 -screen 0 1440x900x24 -nolisten tcp 3>"$tmp/display" >/dev/null 2>&1 & xpid=$!
for i in $(seq 1 50); do test -s "$tmp/display" && break; kill -0 "$xpid"; sleep .1; done
test -s "$tmp/display"
export DISPLAY=:\$(cat "$tmp/display")
openbox >/dev/null 2>&1 & wpid=$!
x11vnc -display "$DISPLAY" -localhost -listen 127.0.0.1 -rfbport ${ports[id]} -nopw -forever -shared -quiet >/dev/null 2>&1 & vpid=$!
${binary} ${args} >/dev/null 2>&1 & apid=$!
sleep 2
kill -0 "$xpid" "$vpid" "$apid"
echo CLOUDKI_DESKTOP_READY
wait "$apid"
`;
      channel = await this.remote.open(`bash -c ${q(script)}`);
      const active = channel;
      await new Promise<void>((resolve, reject) => {
        let output = "";
        let stderr = "";
        const timer = setTimeout(
          () => reject(new Error("App-Start: Zeitlimit überschritten")),
          15000,
        );
        active.on("data", (data: Buffer) => {
          output += data.toString();
          if (output.includes("CLOUDKI_DESKTOP_READY")) {
            clearTimeout(timer);
            resolve();
          }
        });
        active.stderr.on("data", (data: Buffer) => {
          stderr = (stderr + data.toString()).slice(-3000);
        });
        active.on("error", (error: Error) => {
          clearTimeout(timer);
          reject(error);
        });
        active.on("close", () => {
          clearTimeout(timer);
          this.sessions.delete(id);
          reject(
            new Error(
              stderr ||
                "App konnte nicht gestartet werden. Pakete, Display und Ports prüfen.",
            ),
          );
        });
      });
      this.sessions.set(id, channel);
    } catch (error) {
      channel?.signal("TERM");
      channel?.end();
      throw error;
    } finally {
      this.starting.delete(id);
    }
  }
}
