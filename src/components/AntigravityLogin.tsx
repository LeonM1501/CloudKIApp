import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { BridgeApi } from "../api";
import { Modal } from "./Modal";

export function AntigravityLogin({ api, accountId, onClose, refresh }: {
  api: BridgeApi; accountId: string; onClose: () => void; refresh: () => Promise<void>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await api.request<{ url?: string; sent: boolean }>(`/api/accounts/${accountId}/login`, "POST");
        if (disposed) return;
        if (result.url) setUrl(result.url);
        setSent(result.sent);
        timer = setTimeout(poll, 2000);
      } catch (failure) {
        if (!disposed) setError((failure as Error).message);
      }
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
      void api.request(`/api/accounts/${accountId}/login`, "DELETE").catch(() => {});
    };
  }, [api, accountId]);
  return (
    <Modal title="Bei Antigravity anmelden" onClose={onClose}>
      <p role="status">
        {sent ? "Code gesendet. Nach Abschluss kannst du den Account prüfen." : url ? "Melde dich bei Google an und kopiere anschließend den angezeigten Bestätigungscode." : "Google-Anmeldung wird vorbereitet …"}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {url && <>
        <a className="button primary full-width" href={url} target="_blank" rel="noopener noreferrer">
          1. Google-Anmeldung öffnen <ExternalLink size={16} />
        </a>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!code.trim() || /\s/.test(code.trim())) {
            setError("Bitte nur den vollständigen Bestätigungscode aus dem Browser eingeben.");
            return;
          }
          setBusy(true); setError("");
          void api.request(`/api/accounts/${accountId}/login/code`, "POST", { code: code.trim() })
            .then(() => { setCode(""); setSent(true); })
            .catch((failure: Error) => setError(failure.message))
            .finally(() => setBusy(false));
        }}>
          <label>2. Bestätigungscode aus dem Browser
            <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={4096} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} required placeholder="Code hier einfügen" />
          </label>
          <button className="primary full-width" disabled={busy}>{busy ? "Code wird geprüft …" : "Code bestätigen"}</button>
        </form>
      </>}
      {sent && <button className="full-width" disabled={busy} onClick={() => {
        setBusy(true);
        void refresh().then(onClose).catch((failure: Error) => { setError(failure.message); setBusy(false); });
      }}>Account prüfen und schließen</button>}
    </Modal>
  );
}
