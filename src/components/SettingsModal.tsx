import React, { useState, useMemo } from 'react';
import {
  Search,
  Settings,
  Bell,
  Download,
  User,
  Sun,
  UserCheck,
  Archive,
  Shield,
  HeartHandshake,
  Mic,
  Database,
  Sliders,
  Sparkles,
  Smile,
  Keyboard,
  Gauge,
  Lock,
  Puzzle,
  KeyRound,
  Monitor,
  Camera,
  Globe,
  Server,
  Webhook,
  Link2,
  Cloud,
  Code2,
  GitBranch,
  X,
  Edit3,
  Send,
  Share2,
  Cpu,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import type { ProviderAccount, ServerConnectionConfig, UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: string;
  userProfile: UserProfile;
  serverConfig: ServerConnectionConfig;
  accounts: ProviderAccount[];
  onClose: () => void;
  onOpenOnboarding: () => void;
  onToggleGpuMode: (hasGpu: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab = 'allgemein',
  userProfile,
  serverConfig,
  accounts,
  onClose,
  onOpenOnboarding,
  onToggleGpuMode,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Toggles for Allgemein (Screenshot 155707.png)
  const [stdPerm, setStdPerm] = useState(true);
  const [fullAccessPerm, setFullAccessPerm] = useState(true);
  const [fullViewDefault, setFullViewDefault] = useState(false);
  const [bottomBar, setBottomBar] = useState(true);
  const [terminalPos, setTerminalPos] = useState<'Unten' | 'Rechts'>('Unten');

  // State for Darstellung (Screenshot 155710.png)
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('dark');
  const [bgColor, setBgColor] = useState('#181818');
  const [fgColor, setFgColor] = useState('#FFFFFF');

  // State for Profil Heatmap (Screenshot 155716.png)
  const [tokenViewMode, setTokenViewMode] = useState<'Täglich' | 'Wöchentlich' | 'Kumulativ'>('Täglich');

  // Generate deterministic 52x7 dot matrix matching Screenshot 155716.png
  const heatmapGrid = useMemo(() => {
    const cols = 48;
    const rows = 7;
    const grid: number[][] = [];
    for (let c = 0; c < cols; c++) {
      const col: number[] = [];
      for (let r = 0; r < rows; r++) {
        // Higher activity in Sep/Oct (rightmost columns) & Mar/Apr/May just like screenshot!
        let level = 0;
        if (c >= 42) {
          const seed = (c * 13 + r * 7) % 10;
          level = seed > 6 ? 4 : seed > 3 ? 3 : seed > 1 ? 2 : 1;
        } else if (c >= 16 && c <= 26) {
          const seed = (c * 11 + r * 5) % 12;
          level = seed > 9 ? 2 : seed > 7 ? 1 : 0;
        } else if (c >= 30 && c <= 36) {
          const seed = (c * 7 + r * 3) % 14;
          level = seed > 11 ? 2 : 0;
        }
        col.push(level);
      }
      grid.push(col);
    }
    return grid;
  }, [tokenViewMode]);

  if (!isOpen) return null;

  const navSections = [
    {
      title: 'Persönlich',
      items: [
        { id: 'allgemein', label: 'Allgemein', icon: Settings },
        { id: 'benachrichtigungen', label: 'Benachrichtigungen', icon: Bell },
        { id: 'importieren', label: 'Importieren', icon: Download },
        { id: 'profil', label: 'Profil', icon: User, external: true },
        { id: 'darstellung', label: 'Darstellung', icon: Sun },
        { id: 'konto', label: 'Konto', icon: UserCheck },
        { id: 'archiviert', label: 'Archivierte Chats', icon: Archive },
        { id: 'kindersicherung', label: 'Kindersicherung', icon: Shield },
        { id: 'sicherheit', label: 'Sicherheit und Wohlbefinden', icon: HeartHandshake },
        { id: 'stimme', label: 'Stimme', icon: Mic },
        { id: 'speicher', label: 'Speicher', icon: Database },
        { id: 'konfiguration', label: 'Konfiguration', icon: Sliders },
        { id: 'personalisierung', label: 'Personalisierung', icon: Sparkles },
        { id: 'pets', label: 'Mini und Pets', icon: Smile },
        { id: 'shortcuts', label: 'Tastaturkürzel', icon: Keyboard },
        { id: 'nutzung', label: 'Nutzung und Abrechnung', icon: Gauge },
        { id: 'daten', label: 'Datenkontrollen', icon: Lock },
      ],
    },
    {
      title: 'Integrationen',
      items: [
        { id: 'ipad-sideload', label: 'iPad App (.ipa Sideload)', icon: Smartphone },
        { id: 'cloud-computer', label: 'Cloud-Computer & GPU', icon: Server },
        { id: 'plugins', label: 'Plugins', icon: Puzzle },
        { id: 'passwoerter', label: 'Passwörter', icon: KeyRound },
        { id: 'computernutzung', label: 'Computernutzung', icon: Monitor },
        { id: 'appshots', label: 'Appshots', icon: Camera },
        { id: 'browser', label: 'Browser', icon: Globe },
      ],
    },
    {
      title: 'Programmierung',
      items: [
        { id: 'verbindungen', label: 'Verbindungen & Accounts', icon: Link2 },
        { id: 'hooks', label: 'Hooks', icon: Webhook },
        { id: 'codex-cloud', label: 'Codex Cloud', icon: Cloud },
        { id: 'code-review', label: 'Code-Review', icon: Code2 },
        { id: 'git', label: 'Git', icon: GitBranch },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex bg-[#141414] text-[#ececec] select-none">
      {/* Left Sidebar (Screenshot 155707.png) */}
      <div className="w-60 bg-[#171717] border-r border-[#262626] flex flex-col h-full shrink-0">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Einstellungen</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9a9a9a] hover:text-white hover:bg-[#262626]"
            title="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche"
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[#242424] border border-[#323232] text-xs text-white placeholder-[#888] focus:outline-none focus:border-[#4a4a4a]"
            />
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {navSections.map((sec) => {
            const filtered = sec.items.filter((i) =>
              i.label.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length === 0) return null;
            return (
              <div key={sec.title} className="space-y-0.5">
                <div className="px-2.5 py-1 text-[11px] font-medium text-[#7c7c7c]">
                  {sec.title}
                </div>
                {filtered.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[13px] transition-colors ${
                        active
                          ? 'bg-[#2b2b2b] text-white font-medium'
                          : 'text-[#c4c4c4] hover:bg-[#212121] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 text-[#9a9a9a] shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.external && (
                        <span className="text-[11px] text-[#777]">↗</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#161616] p-6 sm:p-10">
        {/* TAB 1: PROFIL & TOKEN-NUTZUNG (1:1 Screenshot 155716.png) */}
        {(activeTab === 'profil' || activeTab === 'nutzung') && (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Top Action Bar */}
            <div className="flex items-center justify-end gap-4 text-xs text-[#d4d4d4]">
              <button
                onClick={onOpenOnboarding}
                className="flex items-center gap-1.5 hover:text-white"
              >
                <Edit3 className="w-3.5 h-3.5" /> Bearbeiten
              </button>
              <button className="flex items-center gap-1.5 hover:text-white">
                <Send className="w-3.5 h-3.5" /> Freund:in einladen
              </button>
              <button className="flex items-center gap-1.5 text-[#888] hover:text-white">
                <Lock className="w-3.5 h-3.5" /> Privat
              </button>
              <button className="flex items-center gap-1.5 hover:text-white">
                <Share2 className="w-3.5 h-3.5" /> Teilen
              </button>
            </div>

            {/* Centered Avatar & Name */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold text-white shadow-lg"
                style={{ backgroundColor: userProfile.avatarColor || '#b08d57' }}
              >
                {userProfile.initials || 'XL'}
              </div>
              <h1 className="text-xl font-bold text-white pt-1">{userProfile.username}</h1>
              <p className="text-xs text-[#8a8a8a]">{userProfile.handle}</p>
            </div>

            {/* 5-Column Token Stats Box (Screenshot 155716.png) */}
            <div className="rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#262626] py-3.5 px-2 text-center">
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-white">{userProfile.stats.totalTokens}</div>
                <div className="text-[11px] text-[#888] mt-0.5">Tokens insgesamt</div>
              </div>
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-white">{userProfile.stats.peakTokens}</div>
                <div className="text-[11px] text-[#888] mt-0.5">Token-Spitzenwert</div>
              </div>
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-white">{userProfile.stats.longestTask}</div>
                <div className="text-[11px] text-[#888] mt-0.5">Längste Aufgabe</div>
              </div>
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-white">{userProfile.stats.longestStreak}</div>
                <div className="text-[11px] text-[#888] mt-0.5">Längste Serie</div>
              </div>
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-white">{userProfile.stats.currentStreak}</div>
                <div className="text-[11px] text-[#888] mt-0.5">Aktuelle Serie</div>
              </div>
            </div>

            {/* Highlights (Mein Favorit - Screenshot 155716.png) */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white">Highlights (Mein Favorit)</h3>
              <div className="flex flex-wrap gap-4">
                <div className="w-44 h-28 rounded-2xl bg-[#262626] p-3 flex items-center justify-center border border-[#333] hover:border-blue-500/50 transition-colors cursor-pointer">
                  <div className="w-full h-full rounded-xl bg-[#161616] border border-[#2e2e2e] relative flex items-center justify-center">
                    <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[8px] text-[#666]">
                      <span>—</span>
                      <span>↗</span>
                      <span>×</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-[240px] rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Favorit: Cloud-GPTX-Antigravity Multi-Bridge
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Aktiv
                    </span>
                  </div>
                  <p className="text-xs text-[#9a9a9a] mt-1">
                    Automatischer Context-Handoff zwischen {accounts.length} verbundenen Accounts (Codex, Antigravity Gemini/Claude & OpenCode) inkl. Unity/Blender Stream.
                  </p>
                </div>
              </div>
            </div>

            {/* Tokennutzung Diagramm (Heatmap 1:1 Screenshot 155716.png) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white">Tokennutzung</h3>
                <div className="flex items-center gap-3 text-xs">
                  {(['Täglich', 'Wöchentlich', 'Kumulativ'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTokenViewMode(mode)}
                      className={
                        tokenViewMode === mode
                          ? 'text-white font-semibold'
                          : 'text-[#777] hover:text-[#bbb]'
                      }
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#1a1a1a] border border-[#262626] overflow-x-auto">
                <div className="flex gap-1 min-w-[540px]">
                  {heatmapGrid.map((col, cIdx) => (
                    <div key={cIdx} className="flex flex-col gap-1 flex-1">
                      {col.map((lvl, rIdx) => {
                        const bg =
                          lvl === 4
                            ? 'bg-[#60a5fa]'
                            : lvl === 3
                            ? 'bg-[#3b82f6]'
                            : lvl === 2
                            ? 'bg-[#1d4ed8]'
                            : lvl === 1
                            ? 'bg-[#1e3a8a]'
                            : 'bg-[#2a2a2a]';
                        return (
                          <div
                            key={rIdx}
                            className={`w-2.5 h-2.5 rounded-[3px] ${bg} transition-colors`}
                            title={`Tag ${cIdx * 7 + rIdx + 1}: Stufe ${lvl}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-[#777] mt-2 px-1 min-w-[540px]">
                  <span>Nov</span>
                  <span>Dez</span>
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mär</span>
                  <span>Apr</span>
                  <span>Mai</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Okt</span>
                </div>
              </div>
            </div>

            {/* Top-Plugins (Screenshot 155716.png) */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white">Top-Plugins</h3>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {[
                  'MCP Unity',
                  'Blender 3D',
                  'Antigravity',
                  'KI-Browser',
                  'GitHub',
                  'Cloud Env',
                  'SSH Bridge',
                  'Xpra Stream',
                  'OpenCode',
                ].map((name, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#2b2b2b] to-[#1f1f1f] border border-[#333] shrink-0 flex items-center justify-center text-[9px] text-center text-[#999] px-1 font-medium"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>

            {/* Einblicke & Kontingente pro Account */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white">Einblicke & Account-Kontingente</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs py-1 border-b border-[#242424]">
                  <span className="text-[#9a9a9a]">Schnellmodus</span>
                  <span className="text-white font-medium">0 % der Durchläufe</span>
                </div>
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl bg-[#1d1d1d] border border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{acc.label}</div>
                      <div className="text-[11px] text-[#888]">{acc.usernameOrEmail}</div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {acc.quotas.map((q, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-[#141414] border border-[#2e2e2e] text-xs"
                        >
                          <span className="text-[#999]">{q.label}: </span>
                          <span className="font-semibold text-white">{q.percentRemaining}%</span>
                          <span className="text-[#777] ml-1.5">(Reset {q.resetAt})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALLGEMEIN (1:1 Screenshot 155707.png) */}
        {activeTab === 'allgemein' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-xl font-bold text-white">Allgemein</h1>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-white">Berechtigungen</div>
              <div className="rounded-2xl bg-[#1e1e1e] border border-[#2c2c2c] divide-y divide-[#2b2b2b]">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Standardberechtigungen</div>
                    <div className="text-[11px] text-[#9a9a9a] mt-0.5">
                      Standardmäßig kann die Bridge Dateien in ihrem Workspace lesen und bearbeiten. Bei Bedarf kann sie zusätzlichen Zugriff anfordern.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStdPerm(!stdPerm)}
                    className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
                      stdPerm ? 'bg-blue-500' : 'bg-[#3a3a3a]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        stdPerm ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Vollzugriff</div>
                    <div className="text-[11px] text-[#9a9a9a] mt-0.5">
                      Wenn die KI-Bridge mit Vollzugriff ausgeführt wird, kann sie jede Datei auf deinem Server bearbeiten und ohne deine Zustimmung Befehle mit Netzwerkzugriff ausführen.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullAccessPerm(!fullAccessPerm)}
                    className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
                      fullAccessPerm ? 'bg-blue-500' : 'bg-[#3a3a3a]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        fullAccessPerm ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-white">Allgemein</div>
              <div className="rounded-2xl bg-[#1e1e1e] border border-[#2c2c2c] divide-y divide-[#2b2b2b]">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Ordner für Chats ohne Projekt</div>
                    <div className="text-[11px] text-[#9a9a9a]">
                      Der Standardspeicherort für die Daten von Chats, die außerhalb von Projekten gestartet werden.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#9a9a9a]">/root/projects/Codex</span>
                    <button className="px-2.5 py-1 rounded-lg bg-[#2b2b2b] text-xs text-white">
                      Ändern
                    </button>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Standardziel zum Öffnen von Dateien</div>
                    <div className="text-[11px] text-[#9a9a9a]">
                      Der Ort, an dem die Dateien und Ordner standardmäßig geöffnet werden
                    </div>
                  </div>
                  <select className="px-3 py-1.5 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs text-white">
                    <option>📁 Server Datei-Explorer</option>
                    <option>💻 VS Code Server</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Integrierte Terminal-Shell</div>
                    <div className="text-[11px] text-[#9a9a9a]">
                      Wähle die Shell aus, die im integrierten Server-Terminal geöffnet werden soll.
                    </div>
                  </div>
                  <select className="px-3 py-1.5 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs text-white">
                    <option>Bash (Linux SSH)</option>
                    <option>Zsh</option>
                    <option>PowerShell</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Sprache</div>
                    <div className="text-[11px] text-[#9a9a9a]">Sprache der App-Oberfläche</div>
                  </div>
                  <select className="px-3 py-1.5 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs text-white">
                    <option>Deutsch (Automatisch erkennen)</option>
                    <option>English</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Vollansicht als Standard</div>
                    <div className="text-[11px] text-[#9a9a9a]">
                      Neue Chats mit Chat und Inhalten in einer einzigen Tab-Leiste starten
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullViewDefault(!fullViewDefault)}
                    className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
                      fullViewDefault ? 'bg-blue-500' : 'bg-[#3a3a3a]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        fullViewDefault ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Untere Leiste</div>
                    <div className="text-[11px] text-[#9a9a9a]">
                      Zeigt das Steuerelement für das untere Bedienfeld in der App-Kopfzeile an.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBottomBar(!bottomBar)}
                    className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
                      bottomBar ? 'bg-blue-500' : 'bg-[#3a3a3a]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        bottomBar ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">Standard-Terminalspeicherort</div>
                    <div className="text-[11px] text-[#9a9a9a]">
                      Wähle aus, wo der Terminal-Kurzbefehl und Umgebungsaktionen Terminal-Tabs öffnen
                    </div>
                  </div>
                  <div className="flex rounded-lg bg-[#141414] p-0.5 border border-[#333]">
                    {(['Unten', 'Rechts'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setTerminalPos(pos)}
                        className={`px-3 py-1 rounded-md text-xs ${
                          terminalPos === pos ? 'bg-[#2b2b2b] text-white' : 'text-[#888]'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DARSTELLUNG (1:1 Screenshot 155710.png) */}
        {activeTab === 'darstellung' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-xl font-bold text-white">Darstellung</h1>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-white">Erscheinungsbild</div>
              <div className="rounded-2xl bg-[#1e1e1e] border border-[#2c2c2c] p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Modus</span>
                <div className="flex items-center gap-2.5">
                  {(['system', 'light', 'dark'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setThemeMode(m)}
                      className={`w-16 h-11 rounded-xl border-2 overflow-hidden flex ${
                        themeMode === m ? 'border-blue-500' : 'border-[#333]'
                      }`}
                    >
                      {m === 'system' && (
                        <>
                          <div className="w-1/2 h-full bg-white" />
                          <div className="w-1/2 h-full bg-[#181818]" />
                        </>
                      )}
                      {m === 'light' && <div className="w-full h-full bg-white" />}
                      {m === 'dark' && <div className="w-full h-full bg-[#181818]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#1e1e1e] border border-[#2c2c2c] divide-y divide-[#2b2b2b]">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Motiv</span>
                  <select className="px-3 py-1.5 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs text-white">
                    <option>Aa ChatGPT / Codex Dark</option>
                    <option>Aa Antigravity Midnight</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Akzent</span>
                  <select className="px-3 py-1.5 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs text-white">
                    <option>🔵 Standard (#3B82F6)</option>
                    <option>🟣 Antigravity Purple</option>
                    <option>🟢 OpenCode Emerald</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Hintergrund</span>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#181818] border border-[#555]" />
                    <span>{bgColor}</span>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Vordergrund</span>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-white" />
                    <span>{fgColor}</span>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Schriftart</span>
                  <select className="px-3 py-1.5 rounded-lg bg-[#2b2b2b] border border-[#3a3a3a] text-xs text-white">
                    <option>System (SF Pro / Segoe UI)</option>
                    <option>JetBrains Mono</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: iPad APP SIDELOADING (.ipa) */}
        {activeTab === 'ipad-sideload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Apple iPadOS App (.ipa Sideloading)
                </h1>
                <p className="text-xs text-[#9a9a9a]">
                  Bundle-ID: <code className="text-blue-300">com.xleonttv.cloudkibridge</code> • Native Capacitor iPadOS Build
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1e1e1e] border border-[#2e2e2e] space-y-3 text-xs leading-relaxed text-[#ccc]">
              <div className="text-sm font-semibold text-white">
                So installierst du diese App als echte `.ipa` per Sideloading auf dein iPad:
              </div>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Eigenständiger iPadOS-Modus integriert:</strong> Diese App läuft komplett
                  standalone auf dem iPad (kein PC im Hintergrund nötig) und verbindet sich direkt mit
                  deiner eingetragenen Linux-VPS-IP (<code className="text-blue-300">{serverConfig.host || '168.119.42.108'}</code>).
                </li>
                <li>
                  <strong>Automatischer `.ipa`-Build (für Sideloadly / AltStore / SideStore):</strong>
                  Im Projekt liegt das native iPadOS Capacitor-Projekt (<code className="text-emerald-300">ios/</code>) sowie die fertige GitHub-Actions-Pipeline{' '}
                  <code className="text-emerald-300">.github/workflows/build-ipad-ipa.yml</code>. Sobald du den Ordner in ein GitHub-Repo pushst, baut GitHub kostenlos mit Xcode die fertige Datei{' '}
                  <code className="text-white font-semibold">CloudKIBridge-iPadOS.ipa</code>.
                </li>
                <li>
                  <strong>Aufs iPad sideloaden:</strong> Lade die <code className="text-white">CloudKIBridge-iPadOS.ipa</code> in{' '}
                  <strong>Sideloadly</strong> (am Windows-PC per USB/Wi-Fi) oder direkt auf dem iPad in{' '}
                  <strong>SideStore / AltStore / Feather</strong> und installiere sie.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 5: CLOUD-COMPUTER & GPU / VERBINDUNGEN */}
        {(activeTab === 'cloud-computer' ||
          activeTab === 'verbindungen' ||
          (activeTab !== 'profil' &&
            activeTab !== 'nutzung' &&
            activeTab !== 'allgemein' &&
            activeTab !== 'darstellung' &&
            activeTab !== 'ipad-sideload')) && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">
                Cloud-Computer, GPU-Erkennung & Accounts
              </h1>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOnboarding();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white"
              >
                SSH-Server / Accounts neu konfigurieren
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#1e1e1e] border border-[#2c2c2c] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span>Automatische Server-Grafikkarten-Erkennung (GPU vs. VPS)</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verbunden ({serverConfig.host || 'VPS'})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#151515] border border-[#282828]">
                  <div className="text-[#888]">Erkannte Hardware</div>
                  <div className="font-semibold text-white mt-0.5">
                    {serverConfig.hardware.cpuModel} ({serverConfig.hardware.ramTotalGb} GB RAM)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#151515] border border-[#282828]">
                  <div className="text-[#888]">Aktiver Render-Modus (Unity & Blender)</div>
                  <div className="font-semibold text-blue-300 mt-0.5">
                    {serverConfig.hardware.renderBackend}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
                <span className="text-xs text-[#aaa]">
                  Test-Umschalter: Simuliere Server mit dedizierter NVIDIA-GPU vs. normaler CPU-VPS
                </span>
                <button
                  type="button"
                  onClick={() => onToggleGpuMode(!serverConfig.hardware.hasDedicatedGpu)}
                  className="px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#343434] text-xs text-white"
                >
                  {serverConfig.hardware.hasDedicatedGpu
                    ? 'Auf CPU-VPS (Mesa LLVMpipe) umschalten'
                    : 'Auf NVIDIA-GPU (VirtualGL) umschalten'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
