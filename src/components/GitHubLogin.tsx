import { useEffect, useState } from "react";
import type { BridgeApi } from "../api";
import { Modal } from "./Modal";

export function GitHubLogin({ api, onClose }: { api: BridgeApi; onClose: () => void }) {
  const [login, setLogin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false, output = "", sent = false;
    let socket: WebSocket | undefined;
    setCode(""); setError(""); setLogin("");
    const status = () => api.request<{ connected: boolean; login: string | null }>("/api/github/status");
    void (async () => {
      const current = await status();
      if (disposed) return;
      if (current.connected) { setLogin(current.login || "GitHub"); return; }
      socket = await api.socket("github");
      if (disposed) { socket.close(); return; }
      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.type === "error") setError(message.message);
        if (message.type === "data") {
          output = (output + message.data).slice(-10000);
          const match = /\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/.exec(output);
          if (match && !sent) {
            sent = true; setCode(match[1]);
            socket?.send(JSON.stringify({ type: "input", data: "\r" }));
          }
        }
        if (message.type === "exit") {
          if (message.code !== 0) setError("GitHub-Anmeldung wurde beendet. Bitte erneut versuchen.");
          else void status().then(value => {
            if (disposed) return;
            if (value.connected) setLogin(value.login || "GitHub");
            else setError("GitHub hat die Anmeldung noch nicht bestätigt.");
          }).catch(value => setError(value.message));
        }
      };
      socket.onerror = () => setError("Verbindung zur GitHub-Anmeldung fehlgeschlagen.");
    })().catch(value => { if (!disposed) setError(value.message); });
    return () => { disposed = true; socket?.close(); };
  }, [api, attempt]);
  return <Modal title="GitHub verbinden" onClose={onClose}>
    {login ? <><p>Verbunden als <strong>{login}</strong>. Du kannst jetzt ein GitHub-Repo als Projekt hinzufügen.</p><button className="primary full-width" onClick={onClose}>Fertig</button></> : <>
      <p>{code ? "Öffne GitHub und gib diesen Code ein:" : "GitHub-Anmeldung wird vorbereitet …"}</p>
      {code && <><pre>{code}</pre><a className="button primary full-width" href="https://github.com/login/device" target="_blank" rel="noopener noreferrer">GitHub-Anmeldung öffnen</a></>}
      {error && <><p className="error" role="alert">{error}</p><button onClick={() => setAttempt(value => value + 1)}>Neu versuchen</button></>}
    </>}
  </Modal>;
}
