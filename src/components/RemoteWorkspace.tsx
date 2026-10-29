import { useEffect, useRef, useState } from "react";
import {
  Globe,
  Box,
  Terminal as TerminalIcon,
  X,
  RefreshCw,
  Play,
  Download,
} from "lucide-react";
import type RFB from "@novnc/novnc";
import type { AppId, DesktopApp } from "../types";
import type { BridgeApi } from "../api";
import { Terminal } from "./Terminal";
import { Modal } from "./Modal";

function Desktop({ api, appId }: { api: BridgeApi; appId: AppId }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Stream verbinden …");
  useEffect(() => {
    let disposed = false;
    let rfb: RFB | undefined;
    let socket: WebSocket | undefined;
    void Promise.all([api.socket("desktop", appId), import("@novnc/novnc")])
      .then(([value, { default: RFB }]) => {
        socket = value;
        if (disposed) {
          socket.close();
          return;
        }
        rfb = new RFB(container.current!, socket);
        rfb.scaleViewport = true;
        rfb.resizeSession = false;
        rfb.addEventListener("connect", () =>
          setStatus("Live · Maus, Touch und Tastatur"),
        );
        rfb.addEventListener("disconnect", () =>
          setStatus("Stream getrennt. App-Status aktualisieren."),
        );
        rfb.addEventListener("securityfailure", () =>
          setStatus("Stream-Anmeldung fehlgeschlagen"),
        );
      })
      .catch((error) => {
        if (!disposed) setStatus(error.message);
      });
    return () => {
      disposed = true;
      rfb?.disconnect();
      socket?.close();
    };
  }, [api, appId]);
  return (
    <>
      <div className="stream" ref={container} />
      <p className="stream-status" role="status">
        {status}
      </p>
    </>
  );
}
export function RemoteWorkspace({
  api,
  connected,
  onClose,
}: {
  api: BridgeApi;
  connected: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<AppId | "terminal">("browser");
  const [apps, setApps] = useState<{ available: string[]; running: string[]; apps: DesktopApp[]; renderers: Record<string, string> }>({
    available: [],
    running: [],
    apps: [{ id: "browser", name: "Browser" }, { id: "unity", name: "Unity" }, { id: "blender", name: "Blender" }],
    renderers: {},
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [install, setInstall] = useState<AppId | null>(null);
  const [installApproved, setInstallApproved] = useState(false);
  const refresh = async () => {
    try {
      setApps(await api.request("/api/apps"));
      setError("");
    } catch (error) {
      setError((error as Error).message);
    }
  };
  useEffect(() => {
    if (!connected) return;
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [api, connected]);
  const start = async () => {
    setBusy(true);
    try {
      setApps(await api.request(`/api/apps/${tab}/start`, "POST"));
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="remote-workspace" aria-label="Remote-Workspace">
      <header className="pane-header">
        <div className="tabs">
          {[...apps.apps, { id: "terminal" as const, name: "Terminal" }].map(
            ({ id: value, name }) => (
              <button
                key={value}
                className={tab === value ? "selected" : ""}
                onClick={() => setTab(value)}
              >
                {value === "browser" ? (
                  <Globe size={16} />
                ) : value === "terminal" ? (
                  <TerminalIcon size={16} />
                ) : (
                  <Box size={16} />
                )}
                <span>
                  {name}
                </span>
              </button>
            ),
          )}
        </div>
        <button
          className="icon"
          onClick={onClose}
          aria-label="Workspace schließen"
        >
          <X size={18} />
        </button>
      </header>
      {!connected ? (
        <div className="empty small-empty">
          <Globe />
          <h3>Dein Server-Workspace</h3>
          <p>Verbinde deinen SSH-Server in den Einstellungen.</p>
        </div>
      ) : tab === "terminal" ? (
        <Terminal api={api} />
      ) : (
        <>
          <div className="remote-toolbar">
            <span className="subtle small">
              {apps.running.includes(tab)
                ? `Live · ${apps.renderers[tab] ?? "auf deinem Server"}`
                : "Eigene App-Sitzung auf Linux"}
            </span>
            <button
              className="icon"
              aria-label="App-Status aktualisieren"
              onClick={refresh}
            >
              <RefreshCw size={16} />
            </button>
            {apps.running.includes(tab) && (
              <button
                onClick={async () => {
                  try {
                    setApps(await api.request(`/api/apps/${tab}/stop`, "POST"));
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                Beenden
              </button>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {apps.running.includes(tab) ? (
            <Desktop key={tab} api={api} appId={tab} />
          ) : (
            <div className="empty small-empty">
              <div className="app-glyph">
                {tab === "browser" ? <Globe size={34} /> : <Box size={34} />}
              </div>
              <h3>
                {tab === "browser"
                  ? "Dein Linux-Browser"
                  : tab === "unity"
                    ? "Unity Hub & Editor"
                    : apps.apps.find(app => app.id === tab)?.name ?? "Linux-App"}
              </h3>
              <p>
                {tab === "browser"
                  ? "Ein echter Chromium-Browser. Seiten öffnen, anmelden und navigieren – direkt hier."
                  : "Die echte Linux-App wird in einer eigenen Display-Sitzung geöffnet. Du steuerst sie per Touch, Maus oder Tastatur."}
              </p>
              <div className="actions">
                <button className="primary" disabled={busy} onClick={start}>
                  <Play size={16} />
                  {busy ? "Startet …" : "App starten"}
                </button>
                <button
                  onClick={() => {
                    setInstall(tab);
                    setInstallApproved(false);
                  }}
                >
                  <Download size={16} />
                  {tab.startsWith("desktop-") ? "Streaming einrichten" : "Installieren"}
                </button>
              </div>
              <p className="subtle small">
                {tab.startsWith("desktop-")
                  ? "Weitere Programme kannst du von der KI installieren lassen. Installierte Linux-Apps erscheinen hier automatisch."
                  : tab === "unity"
                  ? "Unity Hub benötigt das offizielle Unity-Paketrepository. Editor-Version und Lizenz wählst du im Hub."
                  : "Installation über apt auf Debian/Ubuntu. Ein normaler Linux-Benutzer und sudo sind nötig."}
              </p>
            </div>
          )}
        </>
      )}
      {install && (
        <Modal
          title={install.startsWith("desktop-") ? "App-Streaming einrichten" : `${install === "unity" ? "Unity Hub" : install === "blender" ? "Blender" : "Chromium"} installieren`}
          wide
          onClose={() => {
            setInstall(null);
            void refresh();
          }}
        >
          {installApproved ? (
            <Terminal api={api} purpose="install" target={install} />
          ) : (
            <>
              <p>
                Installiert die App sowie Xvfb, x11vnc und Openbox auf deinem
                Server. Die echte Paketmanager-Ausgabe erscheint im Terminal;
                ein sudo-Passwort gibst du dort ein.
              </p>
              <pre>
                sudo apt-get update{"\n"}sudo apt-get install -y xvfb x11vnc
                openbox x11-utils libgtk-3-bin dbus-x11 python3 mesa-utils{" "}
                {install === "unity"
                  ? "unityhub"
                  : install === "blender"
                    ? "blender"
                    : install === "browser" ? "chromium" : ""}
              </pre>
              {install === "unity" && (
                <p>
                  Wenn das offizielle Unity-Repository noch fehlt, bricht apt
                  mit einer Fehlermeldung ab. Es werden keine
                  Drittanbieter-Installer verwendet.
                </p>
              )}
              <button
                className="primary"
                onClick={() => setInstallApproved(true)}
              >
                Installation starten
              </button>
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
