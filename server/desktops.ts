import type { ClientChannel } from "ssh2";
import { readFile } from "node:fs/promises";
import type { AppId, DesktopApp } from "../src/types.ts";
import { Remote } from "./ssh.ts";
import { HttpError, shellQuote as q } from "./validation.ts";

const programs = { browser: "chromium", blender: "blender", unity: "unityhub" };
const builtins: DesktopApp[] = [{ id: "browser", name: "Browser" }, { id: "unity", name: "Unity" }, { id: "blender", name: "Blender" }];
export class Desktops {
  private sessions = new Map<AppId, ClientChannel>();
  private starting = new Set<AppId>();
  private catalog = new Map<AppId, DesktopApp>(builtins.map(app => [app.id, app]));
  private ports = new Map<AppId, number>();
  private renderers = new Map<AppId, string>();
  private discoveryReady = false;
  constructor(private remote: Remote) {}
  running() { return [...this.sessions.keys()]; }
  close() {
    for (const id of this.running()) this.stop(id);
    this.discoveryReady = false;
  }
  stop(id: AppId) {
    const channel = this.sessions.get(id);
    this.sessions.delete(id);
    this.ports.delete(id);
    this.renderers.delete(id);
    channel?.signal("TERM");
    channel?.end();
  }
  port(id: AppId) {
    if (!this.sessions.has(id)) throw new HttpError(409, "App zuerst starten");
    return this.ports.get(id)!;
  }
  appId(value: unknown): AppId {
    if (typeof value !== "string" || (!this.catalog.has(value as AppId) && !this.sessions.has(value as AppId)))
      throw new HttpError(404, "App nicht gefunden. App-Liste aktualisieren.");
    return value as AppId;
  }
  async status() {
    this.remote.requireClient();
    const helper = `${this.remote.connection!.home}/.cloudki/tools/desktop-apps.py`;
    if (!this.discoveryReady) {
      await this.remote.run(`umask 077; mkdir -p -- ${q(helper.substring(0, helper.lastIndexOf("/")))}`);
      await this.remote.writeFile(helper, await readFile(new URL("../scripts/desktop-apps.py", import.meta.url)));
      this.discoveryReady = true;
    }
    const result = await this.remote.run(`python3 ${q(helper)}`);
    const discovered = JSON.parse(result.stdout) as { apps: DesktopApp[]; available: string[] };
    this.catalog = new Map([...builtins, ...discovered.apps].map(app => [app.id, app]));
    return { available: discovered.available, apps: [...this.catalog.values()], running: this.running(), renderers: Object.fromEntries(this.renderers) };
  }
  installCommand(id: AppId) {
    const packages = id === "unity" ? "unityhub" : id === "blender" ? "blender" : id === "browser" ? "chromium" : "";
    return `sudo apt-get update && sudo apt-get install -y xvfb x11vnc openbox x11-utils libgtk-3-bin dbus-x11 python3 mesa-utils ${packages}`.trim();
  }
  async start(id: AppId) {
    if (this.sessions.has(id)) return;
    if (this.starting.has(id)) throw new HttpError(409, "App startet bereits");
    this.starting.add(id);
    let channel: ClientChannel | undefined;
    try {
      const app = this.catalog.get(this.appId(id))!;
      const port = Array.from({ length: 32 }, (_, index) => 5911 + index).find(value => ![...this.ports.values()].includes(value));
      if (!port) throw new HttpError(409, "Zu viele laufende Apps");
      this.ports.set(id, port);
      if (id === "browser") {
        await this.remote.run(`umask 077; mkdir -p -- ${q(this.remote.connection!.home + "/.cloudki/tools")}`);
        await this.remote.writeFile(this.remote.connection!.home + "/.cloudki/tools/browser-mcp.mjs", await readFile(new URL("../scripts/browser-mcp.mjs", import.meta.url)));
      }
      const directory = `${this.remote.connection!.home}/.cloudki/desktop/${id}`;
      const binary = id === "browser" ? "$(command -v chromium || command -v chromium-browser)" : app.desktopId ? `gtk-launch ${q(app.desktopId)}` : programs[id as keyof typeof programs];
      const args = id === "browser" ? `--no-first-run --remote-debugging-address=127.0.0.1 --remote-debugging-port=9229 --user-data-dir=${q(directory + "/profile")} about:blank` : "";
      const script = `set -eu
test "$(id -u)" -ne 0 || { echo 'Desktop-Apps bitte als normaler Linux-Benutzer starten, nicht als root.' >&2; exit 1; }
for p in Xvfb x11vnc openbox xprop dbus-run-session setsid; do command -v "$p" >/dev/null || { echo "$p fehlt. Laufzeit installieren." >&2; exit 1; }; done
command -v ${app.desktopId ? "gtk-launch" : programs[id as keyof typeof programs]} >/dev/null ${id === "browser" ? "|| command -v chromium-browser >/dev/null" : ""}
umask 077
mkdir -p -- ${q(directory)}
tmp=$(mktemp -d)
xpid=; vpid=; wpid=; apid=
cleanup() { if [ -n "$apid" ]; then kill -- -"$apid" 2>/dev/null || true; fi; for pid in "$vpid" "$wpid" "$xpid"; do if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; fi; done; rm -f -- "$tmp/display" "$tmp/app.log"; rmdir -- "$tmp"; }
trap cleanup EXIT
trap 'exit 130' HUP INT TERM
Xvfb -displayfd 3 -screen 0 1440x900x24 -nolisten tcp 3>"$tmp/display" >/dev/null 2>&1 & xpid=$!
for i in $(seq 1 50); do test -s "$tmp/display" && break; kill -0 "$xpid"; sleep .1; done
test -s "$tmp/display"
export DISPLAY=:$(cat "$tmp/display")
openbox >/dev/null 2>&1 & wpid=$!
x11vnc -display "$DISPLAY" -localhost -listen 127.0.0.1 -rfbport ${port} -nopw -forever -shared -quiet >/dev/null 2>&1 & vpid=$!
vgl=()
if command -v vglrun >/dev/null 2>&1; then vgl=(vglrun -d egl);
elif [ -x "$HOME/.local/share/cloudki/virtualgl/opt/VirtualGL/bin/vglrun" ]; then vgl=("$HOME/.local/share/cloudki/virtualgl/opt/VirtualGL/bin/vglrun" -ld "$HOME/.local/share/cloudki/virtualgl/usr/lib" -d egl); fi
renderer=Software
if [ \${#vgl[@]} -gt 0 ]; then
  renderer=$("\${vgl[@]}" glxinfo -B 2>/dev/null | sed -n 's/^OpenGL renderer string: //p')
  test -n "$renderer" || { echo 'GPU-Sitzung konnte nicht initialisiert werden.' >&2; exit 1; }
fi
echo "CLOUDKI_RENDERER=$renderer"
setsid dbus-run-session -- bash -c 'set -e; "$@"; sleep infinity' cloudki "\${vgl[@]}" ${binary} ${args} >"$tmp/app.log" 2>&1 & apid=$!
for i in $(seq 1 300); do
  kill -0 "$xpid" "$vpid" "$apid" || { cat "$tmp/app.log" >&2; exit 1; }
  if xprop -root _NET_CLIENT_LIST 2>/dev/null | grep -Eq '0x[0-9a-fA-F]+'; then break; fi
  sleep .1
done
xprop -root _NET_CLIENT_LIST | grep -Eq '0x[0-9a-fA-F]+' || { cat "$tmp/app.log" >&2; echo 'Kein App-Fenster geöffnet.' >&2; exit 1; }
echo CLOUDKI_DESKTOP_READY
while kill -0 "$xpid" "$vpid" "$apid" 2>/dev/null; do
  sleep 2
  xprop -root _NET_CLIENT_LIST 2>/dev/null | grep -Eq '0x[0-9a-fA-F]+' || break
done
`;
      channel = await this.remote.open(`bash -c ${q(script)}`);
      const active = channel;
      await new Promise<void>((resolve, reject) => {
        let output = "";
        let stderr = "";
        const timer = setTimeout(() => reject(new Error("App-Start: Zeitlimit überschritten")), 45000);
        active.on("data", (data: Buffer) => {
          output += data.toString();
          const renderer = /CLOUDKI_RENDERER=([^\r\n]+)/.exec(output);
          if (renderer) this.renderers.set(id, renderer[1]);
          if (output.includes("CLOUDKI_DESKTOP_READY")) { clearTimeout(timer); resolve(); }
        });
        active.stderr.on("data", (data: Buffer) => { stderr = (stderr + data.toString()).slice(-3000); });
        active.on("error", (error: Error) => { clearTimeout(timer); reject(error); });
        active.on("close", () => {
          clearTimeout(timer);
          this.sessions.delete(id); this.ports.delete(id); this.renderers.delete(id);
          reject(new Error(stderr || "App konnte nicht gestartet werden. Pakete, Display und Ports prüfen."));
        });
      });
      this.sessions.set(id, channel);
    } catch (error) {
      this.ports.delete(id); this.renderers.delete(id);
      channel?.signal("TERM"); channel?.end();
      throw error;
    } finally { this.starting.delete(id); }
  }
}
