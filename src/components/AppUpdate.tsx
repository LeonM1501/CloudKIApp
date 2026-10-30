import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  Download,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  checkForUpdate,
  getLiveUpdateStatus,
  installUpdate,
  ipaDownloadUrl,
  liveUpdateReleaseUrl,
  repositoryUrl,
  resetToBundledVersion,
  type LiveUpdateStatus,
  type UpdateRelease,
} from "../updater";

function date(value?: string) {
  if (!value) return "unbekannt";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("de-DE");
}

export function AppUpdate({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const [status, setStatus] = useState<LiveUpdateStatus | null>(null);
  const [release, setRelease] = useState<UpdateRelease | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStatus = async () => {
    try {
      setStatus(await getLiveUpdateStatus());
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const check = async (quiet = false) => {
    setBusy(true);
    if (!quiet) setError("");
    try {
      const result = await checkForUpdate();
      setRelease(result);
      setStatus((previous) =>
        previous
          ? {
              ...previous,
              currentBundleId: result.currentBundleId,
              nextBundleId: result.nextBundleId,
            }
          : previous,
      );
      if (!quiet)
        setMessage(
          result.updateAvailable
            ? `Version ${result.manifest.version} ist verfügbar.`
            : "Die App ist auf dem neuesten Web-Stand.",
        );
    } catch (value) {
      if (!quiet) setError((value as Error).message);
      setRelease(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const current = await getLiveUpdateStatus();
        setStatus(current);
        if (current.native) await check(true);
      } catch (value) { setError((value as Error).message); }
    })();
  }, []);

  const install = async () => {
    if (!release) return;
    setBusy(true);
    setError("");
    setMessage("");
    setProgress(0);
    try {
      await installUpdate(release, setProgress);
    } catch (value) {
      setError((value as Error).message);
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError("");
    try {
      await resetToBundledVersion();
    } catch (value) {
      setError((value as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="update-settings">
      <h3>App-Update</h3>
      <p className="subtle">
        Web-Oberfläche und Logik lassen sich aktualisieren, ohne eine neue IPA
        zu bauen. Nur native Änderungen (neue Plugins, iOS-Code, Berechtigungen)
        brauchen weiterhin einen IPA-Build.
      </p>

      <div className="update-facts">
        <div>
          <span>Native App</span>
          <strong>{status?.nativeVersion ?? (error ? "Nicht verfügbar" : "wird geladen …")}</strong>
        </div>
        <div>
          <span>Aktives Web-Bundle</span>
          <strong>{status?.currentBundleId ?? "Mitgeliefertes Bundle"}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{status ? (status.native ? "Live-Update bereit" : "Browser-Modus") : "Noch nicht verfügbar"}</strong>
        </div>
      </div>

      {status && !status.native && (
        <p className="update-note">
          Im Browser wird bei jedem Laden automatisch der aktuelle Build
          verwendet. Der Update-Button erscheint in der installierten iPad-App.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {error && !status && <button onClick={() => { setError(""); void loadStatus(); }}>Erneut versuchen</button>}
      {message && !error && <p className="update-ok">{message}</p>}

      {release?.updateAvailable && (
        <section className="update-card">
          <div className="update-card-heading">
            <ArrowUpCircle size={22} />
            <div>
              <strong>Version {release.manifest.version}</strong>
              <span>
                {release.manifest.commit?.slice(0, 10) ?? "unbekannter Commit"} ·{" "}
                {date(release.manifest.builtAt)}
              </span>
            </div>
          </div>
          {release.manifest.notes && <p>{release.manifest.notes}</p>}
          <p className="subtle small">
            Bundle {release.manifest.bundleId}
          </p>
          {busy && progress > 0 && (
            <progress value={progress * 100} max={100} />
          )}
          <button className="primary" disabled={busy} onClick={install}>
            <Download size={16} />
            {busy
              ? progress > 0
                ? `Lädt ${Math.round(progress * 100)} % …`
                : "Wird vorbereitet …"
              : "Update installieren & neu laden"}
          </button>
        </section>
      )}

      {release && !release.updateAvailable && (
        <p className="update-ok">
          <ShieldCheck size={16} /> Aktuell: Bundle{" "}
          {release.currentBundleId ?? "mitgeliefert"}.
        </p>
      )}

      <div className="update-actions">
        <button disabled={busy || status?.native === false} onClick={() => void check()}>
          <RefreshCw size={16} />
          {busy ? "Prüfe …" : "Nach Update suchen"}
        </button>
        {status?.currentBundleId && (
          <button disabled={busy} onClick={reset}>
            <RotateCcw size={16} />
            Auf mitgelieferte Version zurück
          </button>
        )}
      </div>

      <h3>Update-Assistent</h3>
      <p className="subtle">
        Ein vorbereiteter Chat mit dem OpenCode-Modell DeepSeek V4.1 Flash Free.
        Er kennt dieses Repository, den Release-Workflow und die Grenzen von
        Live-Updates.
      </p>
      <button className="primary" onClick={onOpenAssistant}>
        <Sparkles size={16} />
        Update-Assistent öffnen
      </button>

      <h3>Quellen</h3>
      <div className="update-links">
        <a href={repositoryUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> GitHub-Repository
        </a>
        <a href={liveUpdateReleaseUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Live-Update-Release
        </a>
        <a href={ipaDownloadUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Neueste IPA
        </a>
      </div>
      <p className="subtle small">
        Nach einem Push auf <code>main</code> baut GitHub Actions automatisch ein
        neues Web-Bundle und veröffentlicht es unter dem Tag{" "}
        <code>web-latest</code>. Die IPA landet unter <code>ipa-latest</code>.
      </p>
    </div>
  );
}
