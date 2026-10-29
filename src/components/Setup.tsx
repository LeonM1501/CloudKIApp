import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal as TerminalIcon,
} from "lucide-react";
import type { Account, Provider, State } from "../types";
import { PROVIDERS } from "../types";
import { ApiError, type BridgeApi } from "../api";
import { Modal } from "./Modal";
import { Terminal } from "./Terminal";
import { AntigravityLogin } from "./AntigravityLogin";

export function Accounts({
  api,
  state,
  refresh,
}: {
  api: BridgeApi;
  state: State;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [login, setLogin] = useState<{ url: string; code: string } | null>(
    null,
  );
  const [terminal, setTerminal] = useState<Account | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [antigravity, setAntigravity] = useState<Account | null>(null);
  const act = async (key: string, job: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await job();
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const add = (provider: Provider) =>
    act(provider, async () => {
      await api.request("/api/accounts", "POST", {
        provider,
        label: `${PROVIDERS[provider]} ${state.accounts.filter((account) => account.provider === provider).length + 1}`,
      });
    });
  return (
    <>
      <p className="subtle">
        Jeder Account hat ein eigenes Profil auf deinem Server. Die offiziellen
        Clients werden beim Anmelden bei Bedarf installiert. Ein Modellkatalog allein bestätigt
        noch keine Modellberechtigung.
      </p>
      <div className="provider-actions">
        {Object.entries(PROVIDERS).map(([key, name]) => (
          <button
            key={key}
            disabled={Boolean(busy) || !state.connection?.connected}
            onClick={() => void add(key as Provider)}
          >
            <Plus size={16} />
            {name}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!state.accounts.length && (
        <div className="inset-empty">
          Noch keine Accounts. Wähle einen Anbieter aus.
        </div>
      )}
      <div className="account-list">
        {state.accounts.map((account) => (
          <article className="account-card" key={account.id}>
            <div className="row">
              <div className="provider-icon">
                {PROVIDERS[account.provider].slice(0, 1)}
              </div>
              <div className="grow">
                <strong>{account.label}</strong>
                <p className="subtle small">
                  {account.identity ?? PROVIDERS[account.provider]}
                </p>
              </div>
              <span className={`status ${account.status}`}>
                {account.status === "authenticated"
                  ? "Angemeldet"
                  : account.status === "ready"
                    ? "Client bereit"
                    : account.status === "error"
                      ? "Prüfen"
                      : "Nicht verbunden"}
              </span>
            </div>
            {account.error && <p className="error small">{account.error}</p>}
            <div className="actions">
              <button
                disabled={Boolean(busy)}
                onClick={() =>
                  void act(account.id, async () => {
                    setPreparing(account.id);
                    try {
                      while (true) {
                        const { ready } = await api.request<{ ready: boolean }>(
                          `/api/accounts/${account.id}/prepare`, "POST",
                        );
                        if (ready) break;
                        await new Promise((done) => setTimeout(done, 1000));
                      }
                    } finally {
                      setPreparing(null);
                    }
                    if (account.provider === "codex")
                      setLogin(
                        await api.request(
                          `/api/accounts/${account.id}/login`,
                          "POST",
                        ),
                      );
                    else if (account.provider === "antigravity") setAntigravity(account);
                    else setTerminal(account);
                  })
                }
              >
                {account.provider === "codex" ? (
                  <ExternalLink size={15} />
                ) : (
                  <TerminalIcon size={15} />
                )}
                {preparing === account.id ? "Client wird vorbereitet …" : "Anmelden"}
              </button>
              <button
                disabled={Boolean(busy)}
                onClick={() =>
                  void act(account.id, async () => {
                    await api.request(
                      `/api/accounts/${account.id}/refresh`,
                      "POST",
                    );
                  })
                }
              >
                <RefreshCw
                  size={15}
                  className={busy === account.id ? "spin" : ""}
                />
                Prüfen
              </button>
            </div>
            {account.models.length > 0 && (
              <p className="subtle small">
                {account.models.length} Modelle gemeldet ·{" "}
                {account.checkedAt
                  ? new Date(account.checkedAt).toLocaleTimeString("de-DE")
                  : ""}
              </p>
            )}
          </article>
        ))}
      </div>
      {login && (
        <Modal title="Bei Codex anmelden" onClose={() => setLogin(null)}>
          <p>
            Öffne die Anmeldeseite und gib diesen vom Codex-Client gelieferten
            Code ein.
          </p>
          <div className="device-code">
            {login.code}
            <button
              className="icon"
              aria-label="Code kopieren"
              onClick={() =>
                navigator.clipboard
                  .writeText(login.code)
                  .catch(() =>
                    setError(
                      "Kopieren nicht möglich. Code manuell übernehmen.",
                    ),
                  )
              }
            >
              <Copy size={18} />
            </button>
          </div>
          <a
            className="button primary"
            href={login.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Anmeldeseite öffnen <ExternalLink size={16} />
          </a>
          <p className="subtle">
            Danach dieses Fenster schließen und beim Account auf „Prüfen“
            drücken. Erst die Provider-Antwort bestätigt die Anmeldung.
          </p>
        </Modal>
      )}
      {antigravity && <AntigravityLogin api={api} accountId={antigravity.id} refresh={async () => {
        const account = await api.request<Account>(`/api/accounts/${antigravity.id}/refresh`, "POST");
        await refresh();
        if (account.error) throw new Error(account.error);
      }} onClose={() => setAntigravity(null)} />}
      {terminal && (
        <Modal
          title={`${terminal.label} · Anmeldung`}
          wide
          onClose={() => {
            setTerminal(null);
            void refresh();
          }}
        >
          <p className="subtle small">
            Die offizielle CLI führt durch die Anmeldung. Links und Codes kommen
            direkt vom Anbieter. Nach Abschluss schließen und den Account
            prüfen.
          </p>
          <Terminal api={api} purpose="account" target={terminal.id} />
        </Modal>
      )}
    </>
  );
}
export function Setup({
  api,
  state,
  refresh,
  onClose,
}: {
  api: BridgeApi;
  state: State;
  refresh: (updated?: State) => Promise<void>;
  onClose?: () => void;
}) {
  const [step, setStep] = useState(
    state.profile.onboardingComplete
      ? 1
      : state.connection?.connected
        ? 2
        : state.profile.username
          ? 1
          : 0,
  );
  const [name, setName] = useState(state.profile.username);
  const [host, setHost] = useState(state.connection?.host ?? "");
  const [port, setPort] = useState(state.connection?.port ?? 22);
  const [user, setUser] = useState(state.connection?.username ?? "");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [keyMode, setKeyMode] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const connect = async (approved = false) => {
    setBusy(true);
    setError("");
    try {
      const updated = await api.request<State>("/api/server/connect", "POST", {
        host: host.trim(),
        port,
        username: user,
        password: keyMode ? "" : password,
        privateKey: keyMode ? key : "",
        fingerprint: approved ? fingerprint : undefined,
      });
      setPassword("");
      setKey("");
      setFingerprint("");
      await refresh(updated);
      setStep(2);
    } catch (error) {
      setError((error as Error).message);
      if (error instanceof ApiError && error.details?.fingerprint) {
        setFingerprint(error.details.fingerprint);
        setChanged(error.details.changed);
      }
    } finally {
      setBusy(false);
    }
  };
  const complete = async () => {
    setBusy(true);
    try {
      await api.request("/api/profile", "PATCH", {
        username: name || state.profile.username,
        onboardingComplete: true,
      });
      await refresh();
      onClose?.();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={
        state.profile.onboardingComplete
          ? "Server & Accounts"
          : "Deine Bridge einrichten"
      }
      onClose={onClose}
    >
      <nav className="setup-steps" aria-label="Einrichtungsschritte">
        {["Profil", "Server", "Accounts"].map((label, index) => (
          <button
            key={label}
            className={step === index ? "active" : ""}
            disabled={
              busy ||
              (index > 0 && !state.profile.username) ||
              (index === 2 && !state.connection?.connected)
            }
            onClick={() => {
              setStep(index);
              setError("");
            }}
          >
            {index < step ? <Check size={15} /> : <span>{index + 1}</span>}
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {step === 0 && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await api.request("/api/profile", "PATCH", { username: name });
              await refresh();
              setStep(1);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="setup-heading">
            <div className="app-glyph">
              <ShieldCheck size={28} />
            </div>
            <h3>Dein Workspace. Dein Server.</h3>
            <p>
              Ein Name für deine persönliche Bridge. Anmeldungen bei den
              KI-Anbietern folgen gleich.
            </p>
          </div>
          <label>
            Dein Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              required
              autoComplete="nickname"
              placeholder="Wie möchtest du heißen?"
            />
          </label>
          <button className="primary full-width" disabled={busy}>
            Weiter zum Server
          </button>
        </form>
      )}
      {step === 1 && (
        <>
          <div className="setup-heading">
            <Server size={27} />
            <h3>Linux-Server verbinden</h3>
            <p>
              Die KI-Clients und deine Projekte laufen hier. Ein VPS ohne GPU
              reicht für Coding und Chat.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void connect();
            }}
          >
            <div className="field-row">
              <label className="grow">
                SSH-Host
                <input
                  value={host}
                  onChange={(event) => {
                    setHost(event.target.value);
                    setFingerprint("");
                  }}
                  placeholder="server.example.com"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </label>
              <label className="port-field">
                Port
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(event) => setPort(Number(event.target.value))}
                  required
                />
              </label>
            </div>
            <label>
              SSH-Benutzer
              <input
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="cloudki"
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <div className="tabs">
              <button
                type="button"
                className={!keyMode ? "selected" : ""}
                onClick={() => setKeyMode(false)}
              >
                Passwort
              </button>
              <button
                type="button"
                className={keyMode ? "selected" : ""}
                onClick={() => setKeyMode(true)}
              >
                SSH-Schlüssel
              </button>
            </div>
            {keyMode ? (
              <label>
                Privater SSH-Schlüssel
                <textarea
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  rows={4}
                  required
                  spellCheck={false}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                />
              </label>
            ) : (
              <label>
                SSH-Passwort
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="off"
                />
              </label>
            )}
            <p className="subtle small">
              SSH-Zugangsdaten werden nur für diese Verbindung verwendet und
              nicht gespeichert. Verwende für Desktop-Apps einen normalen
              Benutzer statt root.
            </p>
            <button className="primary full-width" disabled={busy}>
              {busy
                ? "Verbindung wird geprüft …"
                : state.connection?.connected
                  ? "Neu verbinden"
                  : "Server prüfen"}
            </button>
          </form>
          {fingerprint && (
            <div className="fingerprint">
              <strong>SSH-Host-Schlüssel</strong>
              <code>{fingerprint}</code>
              <p className="small">
                Mit dem Fingerabdruck deines Servers vergleichen. Erst nach
                Bestätigung werden die Zugangsdaten an diesen Host gesendet.
              </p>
              {!changed && (
                <button disabled={busy} onClick={() => void connect(true)}>
                  Schlüssel vertrauen & verbinden
                </button>
              )}
            </div>
          )}
          {state.connection?.connected && (
            <div className="success-panel">
              <strong>
                <Check size={16} />
                SSH verbunden
              </strong>
              <pre>{state.connection.hardware}</pre>
              <button className="primary" onClick={() => setStep(2)}>
                Weiter zu den Accounts
              </button>
            </div>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <div className="setup-heading">
            <h3>Mit deinen Accounts arbeiten</h3>
            <p>
              Verbinde einen oder mehrere Anbieter. Weitere Accounts kannst du
              später hinzufügen.
            </p>
          </div>
          <Accounts api={api} state={state} refresh={refresh} />
          <button
            className="primary full-width"
            disabled={
              busy ||
              !state.accounts.some(
                (account) =>
                  account.models.length &&
                  ["ready", "authenticated"].includes(account.status),
              )
            }
            onClick={complete}
          >
            {state.profile.onboardingComplete ? "Fertig" : "Workspace öffnen"}
          </button>
        </>
      )}
    </Modal>
  );
}
