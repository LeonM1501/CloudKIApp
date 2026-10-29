import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Circle,
  Columns2,
  Download,
  Folder,
  Globe,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Square,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { BridgeApi, bridgeAddress } from "./api";
import type {
  Account,
  Approval,
  Attachment,
  Chat,
  Permission,
  State,
} from "./types";
import { PROVIDERS } from "./types";
import { Modal } from "./components/Modal";
import { Setup } from "./components/Setup";
import { RemoteWorkspace } from "./components/RemoteWorkspace";

function preference<T>(key: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem(`cloudki.v2.${key}`) ?? "null") ??
      fallback
    );
  } catch {
    return fallback;
  }
}
function remember(key: string, value: unknown) {
  try {
    localStorage.setItem(`cloudki.v2.${key}`, JSON.stringify(value));
  } catch {
    /* Preferences are optional; chat data lives on the bridge. */
  }
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function BridgeLogin({
  onConnect,
}: {
  onConnect: (api: BridgeApi, state: State) => void;
}) {
  const [url, setUrl] = useState(preference("bridge", ""));
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="welcome">
      <div className="welcome-mark">
        <Columns2 size={29} />
      </div>
      <div className="eyebrow">CLOUDKI BRIDGE</div>
      <h1>
        Dein Workspace.
        <br />
        <span>Überall dabei.</span>
      </h1>
      <p className="welcome-copy">
        Deine KI-Accounts, Projekte und Server-Apps.
        <br />
        Ein ruhiger Platz zum Bauen.
      </p>
      <form
        className="connection-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const base = bridgeAddress(url);
            const api = new BridgeApi(base, token.trim());
            const state = await api.request<State>("/api/state");
            remember("bridge", base);
            onConnect(api, state);
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Bridge-Adresse
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://bridge.example.com"
          />
        </label>
        <label>
          Bridge-Schlüssel
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            minLength={32}
            autoComplete="off"
            placeholder="Schlüssel deiner Bridge"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full-width" disabled={busy}>
          {busy ? "Verbinden …" : "Bridge verbinden"}{" "}
          <ArrowUp size={17} className="rotate-right" />
        </button>
        <p className="subtle small">
          Den Schlüssel erzeugst du auf dem Bridge-Host mit{" "}
          <code>npm run token</code>. Er bleibt nur für diese App-Sitzung im
          Speicher.
        </p>
      </form>
      <p className="welcome-footer">
        <ShieldCheck size={14} />
        Dein Server · Deine Accounts · Keine Demo-Daten
      </p>
    </main>
  );
}
export default function App() {
  const [api, setApi] = useState<BridgeApi | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState(false);
  const [settings, setSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [sidebar, setSidebar] = useState(window.innerWidth > 850);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(
    preference("sidebarWidth", 256),
  );
  const [split, setSplit] = useState(preference("split", 50));
  const [theme, setTheme] = useState(preference("theme", "dark"));
  const [fontSize, setFontSize] = useState(preference("fontSize", 15));
  const [favorite, setFavorite] = useState<string>(preference("favorite", ""));
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [modelId, setModelId] = useState("");
  const [effort, setEffort] = useState("");
  const [permission, setPermission] = useState<Permission>("ask");
  const [fullAccessPrompt, setFullAccessPrompt] = useState(false);
  const [composer, setComposer] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [directory, setDirectory] = useState<{
    path: string;
    entries: { name: string; path: string }[];
  } | null>(null);
  const [directoryInput, setDirectoryInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [browserAttached, setBrowserAttached] = useState(false);
  const [plus, setPlus] = useState(false);
  const [skills, setSkills] = useState<
    { name: string; path: string; description: string }[] | null
  >(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [deleteChat, setDeleteChat] = useState<Chat | null>(null);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const messages = useRef<HTMLDivElement>(null);
  const nearEnd = useRef(true);
  const refresh = useCallback(async () => {
    if (api) setState(await api.request("/api/state"));
  }, [api]);
  const run = async (job: () => Promise<void>) => {
    setError("");
    try {
      await job();
    } catch (error) {
      setError((error as Error).message);
    }
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    remember("theme", theme);
  }, [theme]);
  useEffect(() => {
    remember("fontSize", fontSize);
  }, [fontSize]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () =>
      document.documentElement.style.setProperty(
        "--app-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  useEffect(() => {
    if (!api) return;
    let stopped = false;
    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1000;
    const connect = async () => {
      try {
        const value = await api.socket("events");
        if (stopped) {
          value.close();
          return;
        }
        socket = value;
        socket.onopen = () => {
          setOnline(true);
          delay = 1000;
        };
        socket.onmessage = (message) => {
          try {
            const { event, payload } = JSON.parse(message.data);
            if (event === "state") {
              setState(payload);
              setApprovals(payload.approvals ?? []);
            }
            if (event === "chat")
              setState((previous) =>
                previous
                  ? {
                      ...previous,
                      chats: previous.chats.map((chat) =>
                        chat.id === payload.id ? payload : chat,
                      ),
                    }
                  : previous,
              );
            if (event === "approval")
              setApprovals((previous) => [
                ...previous.filter((item) => item.id !== payload.id),
                payload,
              ]);
            if (event === "approval-resolved")
              setApprovals((previous) =>
                previous.filter((item) => item.id !== payload.id),
              );
            if (event === "error") setError(payload.message);
            if (event === "disconnected")
              setState((previous) =>
                previous
                  ? {
                      ...previous,
                      connection: previous.connection
                        ? { ...previous.connection, connected: false }
                        : null,
                    }
                  : previous,
              );
          } catch {
            setError("Bridge hat eine ungültige Nachricht gesendet");
          }
        };
        socket.onclose = () => {
          setOnline(false);
          if (!stopped) {
            timer = setTimeout(connect, delay);
            delay = Math.min(15000, delay * 2);
          }
        };
        socket.onerror = () => socket?.close();
      } catch {
        setOnline(false);
        if (!stopped) {
          timer = setTimeout(connect, delay);
          delay = Math.min(15000, delay * 2);
        }
      }
    };
    void connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [api]);
  const chat = state?.chats.find((value) => value.id === selectedChat);
  const project = state?.projects.find(
    (value) => value.id === (chat?.projectId ?? projectId),
  );
  const account = state?.accounts.find((value) => value.id === accountId);
  const model = account?.models.find((value) => value.id === modelId);
  const active =
    chat?.messages.some((message) => message.status === "running") ?? false;
  useEffect(() => {
    if (nearEnd.current && messages.current)
      messages.current.scrollTop = messages.current.scrollHeight;
  }, [chat?.messages, selectedChat]);
  useEffect(() => {
    if (account?.models.some((value) => value.id === modelId)) return;
    const candidates =
      state?.accounts.flatMap((item) =>
        item.models.map((value) => ({ account: item, model: value })),
      ) ?? [];
    const next =
      candidates.find(
        (item) => `${item.account.id}|${item.model.id}` === favorite,
      ) ?? candidates[0];
    if (next) {
      setAccountId(next.account.id);
      setModelId(next.model.id);
      setEffort("");
    }
  }, [state?.accounts]);
  const selectChat = (value: Chat) => {
    setSelectedChat(value.id);
    setProjectId(value.projectId);
    nearEnd.current = true;
    if (window.innerWidth < 850) setSidebar(false);
  };
  const newChat = () => {
    setSelectedChat(null);
    setComposer("");
    setAttachments([]);
    if (window.innerWidth < 850) setSidebar(false);
  };
  const openModels = async () => {
    setModelsOpen(true);
    if (!api || !state?.connection?.connected) return;
    setModelsBusy(true);
    try {
      for (const item of state.accounts)
        await api.request(`/api/accounts/${item.id}/refresh`, "POST");
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setModelsBusy(false);
    }
  };
  const send = async () => {
    if (!api || !composer.trim() || sending || active) return;
    setSending(true);
    await run(async () => {
      let target = chat;
      if (!target) {
        target = await api.request<Chat>("/api/chats", "POST", { projectId });
        setSelectedChat(target.id);
        await refresh();
      }
      const result = await api.request<Chat>(
        `/api/chats/${target.id}/turn`,
        "POST",
        {
          text: composer,
          accountId,
          model: modelId,
          permission,
          browser: browserAttached,
          effort: effort || undefined,
          attachments: attachments.map((file) => file.path),
        },
      );
      setState((previous) =>
        previous
          ? {
              ...previous,
              chats: previous.chats.map((value) =>
                value.id === result.id ? result : value,
              ),
            }
          : previous,
      );
      setComposer("");
      setAttachments([]);
      nearEnd.current = true;
    });
    setSending(false);
  };
  const browse = async (path: string) => {
    if (api)
      await run(async () => {
        const value = await api.request(
          `/api/directories?path=${encodeURIComponent(path)}`,
        );
        setDirectory(value);
        setDirectoryInput(value.path);
      });
  };
  const upload = async (files: FileList | null) => {
    if (!files || !api) return;
    setSending(true);
    await run(async () => {
      if (attachments.length + files.length > 10)
        throw new Error("Maximal 10 Anhänge pro Nachricht");
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024)
          throw new Error(`${file.name}: maximal 8 MiB`);
        const data = await new Promise<string>((done, fail) => {
          const reader = new FileReader();
          reader.onload = () => done(String(reader.result).split(",")[1]);
          reader.onerror = () =>
            fail(new Error("Datei konnte nicht gelesen werden"));
          reader.readAsDataURL(file);
        });
        const result = await api.request<Attachment>("/api/uploads", "POST", {
          name: file.name,
          data,
        });
        setAttachments((previous) => [...previous, result]);
      }
    });
    setSending(false);
    if (fileInput.current) fileInput.current.value = "";
  };
  const resize = (
    kind: "sidebar" | "split",
    element: HTMLDivElement,
    pointerId: number,
    x: number,
  ) => {
    element.setPointerCapture(pointerId);
    const start = kind === "sidebar" ? sidebarWidth : split;
    const width = element.parentElement!.getBoundingClientRect().width;
    element.onpointermove = (event) => {
      if (kind === "sidebar")
        setSidebarWidth(
          Math.max(210, Math.min(360, start + event.clientX - x)),
        );
      else
        setSplit(
          Math.max(
            35,
            Math.min(70, start + ((event.clientX - x) / width) * 100),
          ),
        );
    };
    element.onpointerup = () => {
      element.onpointermove = null;
      element.releasePointerCapture(pointerId);
    };
  };
  useEffect(() => {
    remember("sidebarWidth", sidebarWidth);
    remember("split", split);
  }, [sidebarWidth, split]);
  if (!api || !state)
    return (
      <BridgeLogin
        onConnect={(value, result) => {
          setApi(value);
          setState(result);
          setSetup(
            !result.profile.onboardingComplete || !result.connection?.connected,
          );
        }}
      />
    );
  const connected = Boolean(state.connection?.connected);
  const visibleChats = state.chats.filter((value) =>
    value.title.toLowerCase().includes(search.toLowerCase()),
  );
  const chatButton = (value: Chat) => (
    <button
      key={value.id}
      className={`chat-link ${selectedChat === value.id ? "selected" : ""}`}
      onClick={() => selectChat(value)}
    >
      <MessageSquare size={15} />
      <span>{value.title}</span>
      {value.messages.some((message) => message.status === "running") && (
        <span className="live-dot" />
      )}
    </button>
  );
  const totalTokens = state.chats
    .flatMap((value) => value.messages)
    .reduce((total, message) => total + (message.tokens ?? 0), 0);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 13 + index);
    const key = date.toLocaleDateString("sv-SE");
    return {
      key,
      label: date.toLocaleDateString("de-DE", {
        day: "numeric",
        month: "short",
      }),
      tokens: state.chats
        .flatMap((value) => value.messages)
        .filter(
          (message) =>
            new Date(message.createdAt).toLocaleDateString("sv-SE") === key,
        )
        .reduce((sum, message) => sum + (message.tokens ?? 0), 0),
    };
  });
  return (
    <div
      className={`app ${sidebar ? "sidebar-open" : ""} ${remoteOpen ? "remote-open" : ""}`}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--chat-percent": `${split}%`,
          "--chat-font": `${fontSize}px`,
        } as CSSProperties
      }
    >
      <aside className="rail">
        <div>
          <button
            className="brand icon"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Seitenleiste umschalten"
          >
            <Columns2 size={20} />
          </button>
          <button className="icon" onClick={newChat} aria-label="Neuer Chat">
            <Plus size={20} />
          </button>
          <button
            className={`icon ${remoteOpen ? "selected" : ""}`}
            onClick={() => setRemoteOpen(!remoteOpen)}
            aria-label="Remote-Workspace öffnen"
          >
            <Globe size={20} />
          </button>
          <button
            className="icon"
            onClick={() => setSetup(true)}
            aria-label="Server und Accounts"
          >
            <Server size={20} />
          </button>
        </div>
        <div>
          <button
            className="icon"
            onClick={() => {
              setSettingsTab("general");
              setSettings(true);
            }}
            aria-label="Einstellungen"
          >
            <Settings size={19} />
          </button>
          <button
            className="avatar"
            onClick={() => setProfile(!profile)}
            aria-label="Profil und Kontingente"
          >
            {(state.profile.username || "?").slice(0, 2).toUpperCase()}
          </button>
        </div>
      </aside>
      {sidebar && (
        <>
          <button
            className="sidebar-backdrop"
            aria-label="Seitenleiste schließen"
            onClick={() => setSidebar(false)}
          />
          <aside className="sidebar">
            <header>
              <strong>Workspace</strong>
              <button
                className="icon"
                onClick={newChat}
                aria-label="Chat erstellen"
              >
                <Plus size={18} />
              </button>
            </header>
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Chats durchsuchen"
                placeholder="Suchen"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <nav className="chat-nav">
              <button className="new-chat" onClick={newChat}>
                <Plus size={17} />
                Neuer Chat
              </button>
              {visibleChats.some((value) => value.pinned) && (
                <section>
                  <h4>Angeheftet</h4>
                  {visibleChats.filter((value) => value.pinned).map(chatButton)}
                </section>
              )}
              {state.projects.map((value) => (
                <section key={value.id}>
                  <button
                    className="project-heading"
                    onClick={() => {
                      setProjectId(value.id);
                      newChat();
                    }}
                  >
                    <Folder size={15} />
                    <span>{value.name}</span>
                  </button>
                  {visibleChats
                    .filter(
                      (chat) => chat.projectId === value.id && !chat.pinned,
                    )
                    .map(chatButton)}
                </section>
              ))}
              <section>
                <h4>Chats</h4>
                {visibleChats
                  .filter((value) => !value.projectId && !value.pinned)
                  .map(chatButton)}
                {!visibleChats.length && (
                  <p className="sidebar-empty">
                    Hier beginnen deine nächsten Ideen.
                  </p>
                )}
              </section>
            </nav>
            <button
              className="add-project"
              onClick={() => {
                setProjectOpen(true);
                setDirectory(null);
                setDirectoryInput(state.connection?.home ?? "/");
              }}
            >
              <Folder size={16} />
              Projekt hinzufügen
              <Plus size={15} />
            </button>
            <div className="connection-status">
              <span
                className={online && connected ? "live-dot" : "offline-dot"}
              />
              {online
                ? connected
                  ? state.connection?.host
                  : "SSH nicht verbunden"
                : "Bridge wird verbunden …"}
            </div>
          </aside>
          <div
            className="resize-handle sidebar-resize"
            role="separator"
            aria-label="Breite der Seitenleiste"
            aria-orientation="vertical"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft")
                setSidebarWidth(Math.max(210, sidebarWidth - 10));
              if (event.key === "ArrowRight")
                setSidebarWidth(Math.min(360, sidebarWidth + 10));
            }}
            onPointerDown={(event) =>
              resize(
                "sidebar",
                event.currentTarget,
                event.pointerId,
                event.clientX,
              )
            }
          />
        </>
      )}
      <div className="workspace">
        <section className="chat-pane">
          <header className="chat-header">
            <div className="row">
              <button
                className="icon mobile-menu"
                onClick={() => setSidebar(!sidebar)}
                aria-label="Chats öffnen"
              >
                <Menu size={20} />
              </button>
              <button
                className="project-picker"
                onClick={() => {
                  setProjectOpen(true);
                  setDirectory(null);
                  setDirectoryInput(state.connection?.home ?? "/");
                }}
              >
                <Folder size={16} />
                <span>{project?.name ?? "Ohne Projekt"}</span>
                <ChevronDown size={13} />
              </button>
            </div>
            <div className="row">
              {chat && (
                <>
                  <button
                    className={`icon ${chat.pinned ? "selected" : ""}`}
                    aria-label={chat.pinned ? "Chat lösen" : "Chat anheften"}
                    onClick={() =>
                      void run(async () => {
                        await api.request(`/api/chats/${chat.id}`, "PATCH", {
                          pinned: !chat.pinned,
                        });
                        await refresh();
                      })
                    }
                  >
                    <Pin size={17} />
                  </button>
                  <button
                    className="icon"
                    aria-label="Chat exportieren"
                    onClick={() =>
                      download(`${chat.title.slice(0, 30)}.json`, chat)
                    }
                  >
                    <Download size={17} />
                  </button>
                  <button
                    className="icon"
                    aria-label="Chat löschen"
                    onClick={() => setDeleteChat(chat)}
                  >
                    <Trash2 size={17} />
                  </button>
                </>
              )}
              <button
                className="icon"
                aria-label="Browser und Apps öffnen"
                onClick={() => setRemoteOpen(!remoteOpen)}
              >
                <Columns2 size={19} />
              </button>
            </div>
          </header>
          {(!online || !connected) && (
            <div className="connection-banner">
              {!online
                ? "Bridge-Verbindung unterbrochen. Erneuter Verbindungsversuch läuft."
                : "Verbinde deinen SSH-Server, um mit deinen Projekten zu arbeiten."}
              {online && (
                <button onClick={() => setSetup(true)}>Verbinden</button>
              )}
            </div>
          )}
          {error && (
            <div className="error global-error" role="alert">
              <span>{error}</span>
              <button
                className="icon"
                aria-label="Fehlermeldung schließen"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <div
            className="messages"
            ref={messages}
            onScroll={() => {
              const element = messages.current!;
              nearEnd.current =
                element.scrollHeight -
                  element.scrollTop -
                  element.clientHeight <
                100;
            }}
          >
            {!chat?.messages.length ? (
              <div className="empty chat-empty">
                <div className="empty-symbol">
                  <Columns2 size={34} strokeWidth={1.4} />
                </div>
                <p className="eyebrow">DEIN NÄCHSTES PROJEKT</p>
                <h1>Woran bauen wir?</h1>
                <p>
                  Eine Idee, ein Fehler, der nächste Schritt.
                  <br />
                  Dein Workspace ist bereit, sobald dein Server verbunden ist.
                </p>
                <div className="starter-actions">
                  <button
                    onClick={() => {
                      setProjectOpen(true);
                      setDirectoryInput(state.connection?.home ?? "/");
                    }}
                  >
                    <Folder size={17} />
                    Projekt auswählen
                  </button>
                  <button onClick={() => setRemoteOpen(true)}>
                    <Globe size={17} />
                    Workspace öffnen
                  </button>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {chat.messages.map((message) => (
                  <article
                    className={`message ${message.role}`}
                    key={message.id}
                  >
                    <div className="message-label">
                      {message.role === "user"
                        ? state.profile.username
                        : `${state.accounts.find((value) => value.id === message.accountId)?.label ?? "KI"} · ${message.model}`}
                      <time>
                        {new Date(message.createdAt).toLocaleTimeString(
                          "de-DE",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </time>
                    </div>
                    {message.attachments?.map((file) => (
                      <span className="attachment" key={file.path}>
                        <Paperclip size={14} />
                        {file.name}
                      </span>
                    ))}
                    {message.events?.map((event) => (
                      <details className="tool-event" key={event.id}>
                        <summary>
                          <Circle size={10} />
                          <span>{event.title}</span>
                          <span className="subtle">{event.status}</span>
                        </summary>
                        <pre>{event.detail}</pre>
                      </details>
                    ))}
                    {message.text && (
                      <div className="message-text">{message.text}</div>
                    )}
                    {message.status === "running" && (
                      <div className="working" role="status">
                        <span className="live-dot" />
                        Arbeitet …
                      </div>
                    )}
                    {message.error && <p className="error">{message.error}</p>}
                    {message.status === "cancelled" && (
                      <p className="subtle small">Antwort abgebrochen.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="composer-area">
            {approvals.map((approval) => (
              <div key={approval.id} className="approval">
                <strong>
                  <ShieldCheck size={17} />
                  {approval.title}
                </strong>
                <details>
                  <summary>Aktion ansehen</summary>
                  <pre>{approval.detail}</pre>
                </details>
                <div className="actions">
                  {approval.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() =>
                        void run(async () => {
                          await api.request(
                            `/api/approvals/${approval.id}`,
                            "POST",
                            { option: option.id },
                          );
                          setApprovals((previous) =>
                            previous.filter(
                              (value) => value.id !== approval.id,
                            ),
                          );
                        })
                      }
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <div className="attachment-row">
                {browserAttached && (
                  <span className="attachment">
                    <Globe size={14} />
                    Browser-Plugin
                    <button
                      type="button"
                      className="icon"
                      aria-label="Browser-Plugin entfernen"
                      onClick={() => setBrowserAttached(false)}
                    >
                      <X size={13} />
                    </button>
                  </span>
                )}
                {attachments.map((file) => (
                  <span className="attachment" key={file.path}>
                    <Paperclip size={14} />
                    {file.name}
                    <button
                      type="button"
                      className="icon"
                      aria-label={`${file.name} entfernen`}
                      onClick={() =>
                        setAttachments((previous) =>
                          previous.filter((value) => value.path !== file.path),
                        )
                      }
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <textarea
                aria-label="Nachricht"
                rows={3}
                placeholder={
                  model
                    ? "Beschreibe, was wir bauen sollen …"
                    : "Verbinde zuerst einen Account …"
                }
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="composer-controls">
                <div className="row">
                  <div className="plus-wrap">
                    <button
                      type="button"
                      className="icon"
                      aria-label="Dateien und Skills anhängen"
                      onClick={() => setPlus(!plus)}
                    >
                      <Plus size={20} />
                    </button>
                    {plus && (
                      <div className="plus-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setPlus(false);
                            fileInput.current?.click();
                          }}
                        >
                          <Paperclip size={16} />
                          Dateien anhängen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPlus(false);
                            void run(async () => {
                              if (!account)
                                throw new Error("Zuerst Account auswählen");
                              setSkills(
                                await api.request(
                                  `/api/accounts/${account.id}/skills?cwd=${encodeURIComponent(project?.path ?? state.connection?.home ?? "/")}`,
                                ),
                              );
                            });
                          }}
                        >
                          <Star size={16} />
                          Skills auswählen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBrowserAttached(!browserAttached);
                            setPlus(false);
                            setRemoteOpen(true);
                          }}
                        >
                          <Globe size={16} />
                          {browserAttached
                            ? "Browser-Plugin entfernen"
                            : "Browser-Plugin anh�ngen"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPlus(false);
                            setRemoteOpen(true);
                          }}
                        >
                          <Globe size={16} />
                          Browser & Apps
                        </button>
                      </div>
                    )}
                  </div>
                  <select
                    className="permission-select"
                    aria-label="Berechtigungen"
                    value={permission}
                    onChange={(event) =>
                      event.target.value === "full"
                        ? setFullAccessPrompt(true)
                        : setPermission(event.target.value as Permission)
                    }
                  >
                    <option value="ask">Nachfragen</option>
                    <option value="workspace">
                      Im Projekt arbeiten · Codex
                    </option>
                    <option value="read-only">Nur lesen · Codex</option>
                    <option value="full">Vollzugriff</option>
                  </select>
                </div>
                <div className="row model-controls">
                  <button
                    type="button"
                    className="model-picker"
                    onClick={() => void openModels()}
                  >
                    <span>{model?.name ?? "Modell wählen"}</span>
                    <ChevronDown size={14} />
                  </button>
                  {model?.efforts?.length ? (
                    <select
                      aria-label="Denkaufwand"
                      value={effort}
                      onChange={(event) => setEffort(event.target.value)}
                    >
                      <option value="">Standard</option>
                      {model.efforts.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  ) : null}
                  {active ? (
                    <button
                      type="button"
                      className="send"
                      aria-label="Antwort stoppen"
                      onClick={() =>
                        void run(async () => {
                          await api.request(
                            `/api/chats/${chat!.id}/cancel`,
                            "POST",
                          );
                        })
                      }
                    >
                      <Square size={15} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="send"
                      aria-label="Nachricht senden"
                      disabled={
                        !composer.trim() ||
                        !model ||
                        !online ||
                        !connected ||
                        sending
                      }
                    >
                      <ArrowUp size={20} />
                    </button>
                  )}
                </div>
              </div>
            </form>
            <p className="composer-caption">
              {account ? `${account.label} · ` : ""}KI-Ausgaben prüfen. Beim
              Anbieterwechsel wird der sichtbare Verlauf übertragen.
            </p>
            <input
              hidden
              type="file"
              multiple
              ref={fileInput}
              onChange={(event) => void upload(event.target.files)}
            />
          </div>
        </section>
        {remoteOpen && (
          <>
            <div
              className="resize-handle workspace-resize"
              role="separator"
              aria-label="Chat und Workspace aufteilen"
              aria-orientation="vertical"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft")
                  setSplit(Math.max(35, split - 2));
                if (event.key === "ArrowRight")
                  setSplit(Math.min(70, split + 2));
              }}
              onPointerDown={(event) =>
                resize(
                  "split",
                  event.currentTarget,
                  event.pointerId,
                  event.clientX,
                )
              }
            />
            <RemoteWorkspace
              api={api}
              connected={connected}
              onClose={() => setRemoteOpen(false)}
            />
          </>
        )}
      </div>
      {setup && (
        <Setup
          api={api}
          state={state}
          refresh={refresh}
          onClose={() => setSetup(false)}
        />
      )}
      {modelsOpen && (
        <Modal title="Modell & Account" onClose={() => setModelsOpen(false)}>
          <div className="row spread">
            <p className="subtle small">
              {modelsBusy
                ? "Modellkataloge werden aktualisiert …"
                : "Vom jeweiligen Client gemeldete Modelle."}
            </p>
            <button
              className="icon"
              disabled={modelsBusy}
              aria-label="Modelle aktualisieren"
              onClick={() => void openModels()}
            >
              <RefreshCw size={17} className={modelsBusy ? "spin" : ""} />
            </button>
          </div>
          {!state.accounts.length && (
            <p>Noch keine Accounts. Verbinde sie unter „Server & Accounts“.</p>
          )}
          {state.accounts.map((item) => (
            <section className="model-group" key={item.id}>
              <h4>{item.label}</h4>
              {item.error && <p className="error small">{item.error}</p>}
              {!item.models.length && (
                <p className="subtle small">
                  Keine Modelle verfügbar. Anmeldung und Client prüfen.
                </p>
              )}
              {item.models.map((value) => (
                <div className="model-row" key={value.id}>
                  <button
                    onClick={() => {
                      setAccountId(item.id);
                      setModelId(value.id);
                      setEffort("");
                      setModelsOpen(false);
                    }}
                  >
                    {accountId === item.id && modelId === value.id ? (
                      <Check size={17} />
                    ) : (
                      <span className="model-dot" />
                    )}
                    <span>
                      {value.name}
                      <small>{value.id}</small>
                    </span>
                  </button>
                  <button
                    className={`icon ${favorite === `${item.id}|${value.id}` ? "favorite" : ""}`}
                    aria-label={`${value.name} als Favorit`}
                    onClick={() => {
                      const next = `${item.id}|${value.id}`;
                      setFavorite(next);
                      remember("favorite", next);
                    }}
                  >
                    <Star size={16} />
                  </button>
                </div>
              ))}
            </section>
          ))}
          <p className="subtle small">
            Ein Eintrag im Modellkatalog ist keine Zugangs- oder
            Kontingentgarantie. Das bestätigt erst der Anbieter bei einer
            Anfrage.
          </p>
        </Modal>
      )}
      {projectOpen && (
        <Modal title="Projekt auswählen" onClose={() => setProjectOpen(false)}>
          <div className="project-list">
            <button
              disabled={Boolean(chat?.messages.length)}
              onClick={() => {
                setProjectId(null);
                setSelectedChat(null);
                setProjectOpen(false);
              }}
            >
              <MessageSquare size={17} />
              Ohne Projekt starten
            </button>
            {state.projects.map((value) => (
              <button
                key={value.id}
                onClick={() => {
                  setProjectId(value.id);
                  setSelectedChat(null);
                  setProjectOpen(false);
                }}
              >
                <Folder size={17} />
                <span>
                  {value.name}
                  <small>{value.path}</small>
                </span>
              </button>
            ))}
          </div>
          <hr />
          <h3>Ordner vom Server hinzufügen</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void browse(directoryInput);
            }}
          >
            <div className="field-row">
              <input
                aria-label="Server-Ordner"
                value={directoryInput}
                onChange={(event) => setDirectoryInput(event.target.value)}
                placeholder="/home/cloudki/projects"
              />
              <button disabled={!connected}>Durchsuchen</button>
            </div>
          </form>
          {directory && (
            <>
              <div className="directory-list">
                <button
                  onClick={() =>
                    void browse(
                      directory.path.split("/").slice(0, -1).join("/") || "/",
                    )
                  }
                >
                  <Folder size={16} />
                  ..
                </button>
                {directory.entries.map((value) => (
                  <button
                    key={value.path}
                    onClick={() => void browse(value.path)}
                  >
                    <Folder size={16} />
                    {value.name}
                  </button>
                ))}
              </div>
              <label>
                Projektname
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder={directory.path.split("/").pop() || "Projekt"}
                />
              </label>
              <button
                className="primary"
                onClick={() =>
                  void run(async () => {
                    const value = await api.request("/api/projects", "POST", {
                      name:
                        projectName ||
                        directory.path.split("/").pop() ||
                        "Projekt",
                      path: directory.path,
                    });
                    await refresh();
                    setProjectId(value.id);
                    setSelectedChat(null);
                    setProjectOpen(false);
                    setProjectName("");
                  })
                }
              >
                Diesen Ordner verwenden
              </button>
            </>
          )}
        </Modal>
      )}
      {skills && (
        <Modal title="Skills anhängen" onClose={() => setSkills(null)}>
          {!skills.length && (
            <p>
              Dieser Account meldet keine installierten Skills. Installiere sie
              im Account-Profil auf dem Server.
            </p>
          )}
          {skills.map((skill) => (
            <button
              className="skill-row"
              key={skill.path}
              onClick={() => {
                setComposer(
                  (previous) =>
                    `${previous}${previous ? "\n" : ""}$${skill.name} (Skill: ${skill.path})\n`,
                );
                setSkills(null);
              }}
            >
              <Star size={16} />
              <span>
                {skill.name}
                <small>{skill.description}</small>
              </span>
            </button>
          ))}
        </Modal>
      )}
      {fullAccessPrompt && (
        <Modal
          title="Vollzugriff aktivieren?"
          onClose={() => setFullAccessPrompt(false)}
        >
          <p>
            Der gewählte Agent darf mit den Rechten deines SSH-Benutzers Dateien
            ändern, Befehle ausführen und das Netzwerk verwenden. Das gilt auch
            außerhalb des Projektordners. Verwende dafür einen eigenen
            Server-Benutzer.
          </p>
          <button
            className="danger"
            onClick={() => {
              setPermission("full");
              setFullAccessPrompt(false);
            }}
          >
            Vollzugriff für diese App-Sitzung aktivieren
          </button>
        </Modal>
      )}
      {deleteChat && (
        <Modal title="Chat löschen?" onClose={() => setDeleteChat(null)}>
          <p>
            „{deleteChat.title}“ wird aus der Bridge gelöscht. Provider-Verläufe
            und Dateien auf dem Server bleiben erhalten.
          </p>
          <div className="actions">
            <button onClick={() => download("cloudki-chat.json", deleteChat)}>
              Vorher exportieren
            </button>
            <button
              className="danger"
              onClick={() =>
                void run(async () => {
                  await api.request(`/api/chats/${deleteChat.id}`, "DELETE");
                  if (selectedChat === deleteChat.id) setSelectedChat(null);
                  setDeleteChat(null);
                  await refresh();
                })
              }
            >
              Chat löschen
            </button>
          </div>
        </Modal>
      )}
      {profile && (
        <Modal title="Profil & Kontingente" onClose={() => setProfile(false)}>
          <div className="profile-heading">
            <div className="avatar large">
              {state.profile.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3>{state.profile.username || "Dein Profil"}</h3>
              <p className="subtle">Persönliche CloudKI Bridge</p>
            </div>
          </div>
          {state.accounts.map((item) => (
            <section className="quota-group" key={item.id}>
              <div className="row spread">
                <strong>{item.label}</strong>
                <button
                  className="icon"
                  aria-label={`${item.label} Kontingente aktualisieren`}
                  onClick={() =>
                    void run(async () => {
                      await api.request(
                        `/api/accounts/${item.id}/refresh`,
                        "POST",
                      );
                      await refresh();
                    })
                  }
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              {item.quotas.map((quota, index) => (
                <div className="quota" key={index}>
                  <div className="row spread">
                    <span>{quota.label}</span>
                    <strong>{quota.remaining}% übrig</strong>
                  </div>
                  <progress max={100} value={quota.remaining} />
                  <p className="subtle small">
                    Reset:{" "}
                    {quota.resetsAt
                      ? new Date(quota.resetsAt * 1000).toLocaleString("de-DE")
                      : "Nicht gemeldet"}
                  </p>
                </div>
              ))}
              {!item.quotas.length && (
                <p className="subtle small">
                  {item.quotaError ??
                    "Noch keine Kontingentdaten. Account prüfen."}
                </p>
              )}
              {item.checkedAt && (
                <p className="subtle small">
                  Stand: {new Date(item.checkedAt).toLocaleString("de-DE")}
                </p>
              )}
            </section>
          ))}
          <button
            onClick={() => {
              setProfile(false);
              setSetup(true);
            }}
          >
            Accounts verwalten
          </button>
        </Modal>
      )}
      {settings && (
        <Modal title="Einstellungen" wide onClose={() => setSettings(false)}>
          <div className="settings-layout">
            <nav className="settings-nav">
              {[
                ["general", "Allgemein"],
                ["appearance", "Darstellung"],
                ["usage", "Token-Nutzung"],
                ["connection", "Verbindungen"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={settingsTab === key ? "selected" : ""}
                  onClick={() => setSettingsTab(key)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <section className="settings-content">
              {settingsTab === "general" && (
                <>
                  <h3>Dein Profil</h3>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      void run(async () => {
                        await api.request("/api/profile", "PATCH", {
                          username: data.get("username"),
                        });
                        await refresh();
                      });
                    }}
                  >
                    <label>
                      Name
                      <input
                        name="username"
                        defaultValue={state.profile.username}
                        maxLength={64}
                        required
                      />
                    </label>
                    <button>Speichern</button>
                  </form>
                  <h3>Daten</h3>
                  <p className="subtle">
                    Chats und Projekte liegen auf deiner Bridge.
                    Provider-Anmeldungen liegen in getrennten Profilen auf dem
                    SSH-Server.
                  </p>
                  <button
                    onClick={() => download("cloudki-export.json", state)}
                  >
                    <Download size={16} />
                    Chats & Projekte exportieren
                  </button>
                  <p className="subtle small">
                    Der Export enthält Chat-Inhalte und Server-Pfade. Bewahre
                    ihn entsprechend auf.
                  </p>
                </>
              )}
              {settingsTab === "appearance" && (
                <>
                  <h3>Darstellung</h3>
                  <label>
                    Farbschema
                    <select
                      value={theme}
                      onChange={(event) => setTheme(event.target.value)}
                    >
                      <option value="dark">Dunkel</option>
                      <option value="light">Hell</option>
                      <option value="system">System</option>
                    </select>
                  </label>
                  <label>
                    Schriftgröße im Chat · {fontSize} px
                    <input
                      type="range"
                      min={13}
                      max={20}
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                    />
                  </label>
                  <p className="subtle">
                    Ziehe die Trennlinien, um Seitenleiste und Workspace
                    aufzuteilen. Auf schmalen Displays öffnet sich der Workspace
                    über dem Chat.
                  </p>
                  <button
                    onClick={() => {
                      setSidebarWidth(256);
                      setSplit(50);
                      setFontSize(15);
                    }}
                  >
                    Layout zurücksetzen
                  </button>
                  <h3>Favorit</h3>
                  <p className="subtle">
                    {favorite
                      ? "Dein Favorit wird bei verfügbarer Verbindung bevorzugt ausgewählt."
                      : "Markiere ein Modell im Modellmenü mit dem Stern."}
                  </p>
                </>
              )}
              {settingsTab === "usage" && (
                <>
                  <h3>Token-Nutzung</h3>
                  <div className="stat-number">
                    {totalTokens.toLocaleString("de-DE")}
                    <span>gemeldete Tokens</span>
                  </div>
                  <div
                    className="usage-chart"
                    role="img"
                    aria-label="Gemeldete Tokens pro Tag in den letzten 14 Tagen"
                  >
                    {days.map((day) => (
                      <div
                        key={day.key}
                        title={`${day.label}: ${day.tokens.toLocaleString("de-DE")} Tokens`}
                      >
                        <span
                          style={{
                            height: `${Math.max(2, (day.tokens / Math.max(1, ...days.map((value) => value.tokens))) * 100)}%`,
                          }}
                        />
                        <small>{day.label.split(".")[0]}</small>
                      </div>
                    ))}
                  </div>
                  <p className="subtle">
                    Letzte 14 Tage. Es zählen nur Tokens, die ein Provider für
                    Chats dieser Bridge gemeldet hat. Fehlende Messwerte werden
                    nicht geschätzt. Das ist keine Abrechnung.
                  </p>
                  <p>
                    {state.chats.length} Chats · {state.projects.length}{" "}
                    Projekte · {state.accounts.length} Accounts
                  </p>
                </>
              )}
              {settingsTab === "connection" && (
                <>
                  <h3>Bridge & Server</h3>
                  <p className="subtle">{api.base || location.origin}</p>
                  <pre>
                    {state.connection?.hardware ?? "Kein Server verbunden"}
                  </pre>
                  <button
                    onClick={() => {
                      setSettings(false);
                      setSetup(true);
                    }}
                  >
                    <Server size={17} />
                    Server & Accounts
                  </button>
                  <h3>Verbindung beenden</h3>
                  <p className="subtle">
                    Beendet SSH, laufende Antworten und Remote-Apps. Deine Chats
                    bleiben gespeichert.
                  </p>
                  <button
                    onClick={() =>
                      void run(async () => {
                        await api.request("/api/server/disconnect", "POST");
                        await refresh();
                      })
                    }
                  >
                    SSH trennen
                  </button>
                  <button
                    onClick={() => {
                      setApi(null);
                      setState(null);
                      setSettings(false);
                      setSelectedChat(null);
                      setApprovals([]);
                    }}
                  >
                    App sperren
                  </button>
                </>
              )}
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
}
