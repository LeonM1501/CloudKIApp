import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Folder,
  Terminal as TerminalIcon,
  Maximize2,
  PanelRightClose,
  Cpu,
  Play,
  Pause,
  Box,
  Layers,
  Sparkles,
  CheckCircle2,
  Download,
  MousePointer,
  Eye,
  Sliders,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import type {
  BrowserAiCursor,
  HardwareProfile,
  RemoteAppStatus,
} from '../types';

interface RightSplitWorkspaceProps {
  isOpen: boolean;
  activeTab: 'browser' | 'unity' | 'blender' | 'terminal';
  onTabChange: (tab: 'browser' | 'unity' | 'blender' | 'terminal') => void;
  onClose: () => void;
  hardware: HardwareProfile;
  unityApp: RemoteAppStatus;
  blenderApp: RemoteAppStatus;
  aiCursor: BrowserAiCursor;
  onTriggerAiBrowserDemo: (targetUrl?: string) => void;
  onInstallApp: (appId: 'unity' | 'blender') => void;
  onUpdateApp: (appId: 'unity' | 'blender', payload: Record<string, unknown>) => void;
  onSendPromptFromApp: (prompt: string) => void;
  onExecTerminal: (cmd: string) => Promise<string>;
}

export const RightSplitWorkspace: React.FC<RightSplitWorkspaceProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  hardware,
  unityApp,
  blenderApp,
  aiCursor,
  onTriggerAiBrowserDemo,
  onInstallApp,
  onUpdateApp,
  onSendPromptFromApp,
  onExecTerminal,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // Interactive 3D Viewport states for Unity & Blender on iPad (touch/drag rotation)
  const [unityPlaying, setUnityPlaying] = useState(true);
  const [unityFrame, setUnityFrame] = useState(24);
  const [unityCamYaw, setUnityCamYaw] = useState(-22);
  const [unityCamPitch, setUnityCamPitch] = useState(14);
  const [selectedBone, setSelectedBone] = useState('RightHand_Thumb02');
  const [unityVersionSelect, setUnityVersionSelect] = useState(unityApp.version);

  const [blenderYaw, setBlenderYaw] = useState(35);
  const [blenderPitch, setBlenderPitch] = useState(18);
  const [blenderShading, setBlenderShading] = useState<'solid' | 'wireframe' | 'material'>('solid');
  const [weaponPreset, setWeaponPreset] = useState<'rifle' | 'sniper' | 'plasma'>('rifle');

  // Terminal state
  const [termInput, setTermInput] = useState('');
  const [termLogs, setTermLogs] = useState<string[]>([
    `Verbunden mit ${hardware.hostname} (${hardware.os})`,
    `Grafik-Pipeline: ${hardware.renderBackend}`,
    `Tippe 'nvidia-smi', 'glxinfo' oder 'ls -la' zum Testen.`,
  ]);

  useEffect(() => {
    if (!unityPlaying || activeTab !== 'unity') return;
    const t = setInterval(() => {
      setUnityFrame((f) => (f >= 60 ? 0 : f + 1));
    }, 80);
    return () => clearInterval(t);
  }, [unityPlaying, activeTab]);

  if (!isOpen) return null;

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setCurrentUrl(null);
      return;
    }
    const formatted =
      urlInput.startsWith('http://') || urlInput.startsWith('https://')
        ? urlInput
        : `https://${urlInput}`;
    setCurrentUrl(formatted);
    onTriggerAiBrowserDemo(formatted);
  };

  const handleTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termInput.trim()) return;
    const cmd = termInput;
    setTermInput('');
    setTermLogs((prev) => [...prev, `$ ${cmd}`]);
    const out = await onExecTerminal(cmd);
    setTermLogs((prev) => [...prev, out]);
  };

  return (
    <div className="w-full md:w-[46%] lg:w-[48%] bg-[#141414] border-l border-[#262626] flex flex-col h-full select-none shrink-0">
      {/* Top Tab Bar (1:1 Screenshot 155607.png + App Tabs for Unity & Blender) */}
      <div className="h-11 px-2.5 bg-[#161616] border-b border-[#252525] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Browser Tab */}
          <button
            type="button"
            onClick={() => onTabChange('browser')}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'browser'
                ? 'bg-[#262626] text-white font-medium'
                : 'text-[#9a9a9a] hover:bg-[#1f1f1f] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#b4b4b4]" />
            <span>{currentUrl ? new URL(currentUrl).hostname : 'Neuer Tab'}</span>
            {currentUrl && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentUrl(null);
                  setUrlInput('');
                }}
                className="hover:text-white text-[#888] ml-1"
              >
                ×
              </span>
            )}
          </button>

          {/* Unity Editor Single-Window Tab */}
          <button
            type="button"
            onClick={() => onTabChange('unity')}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'unity'
                ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40 font-medium'
                : 'text-[#9a9a9a] hover:bg-[#1f1f1f] hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-blue-400" />
            <span>Unity Editor</span>
          </button>

          {/* Blender 3D Single-Window Tab */}
          <button
            type="button"
            onClick={() => onTabChange('blender')}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'blender'
                ? 'bg-amber-600/25 text-amber-300 border border-amber-500/40 font-medium'
                : 'text-[#9a9a9a] hover:bg-[#1f1f1f] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Blender 3D</span>
          </button>

          {/* Terminal Tab */}
          <button
            type="button"
            onClick={() => onTabChange('terminal')}
            className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
              activeTab === 'terminal'
                ? 'bg-[#262626] text-white font-medium'
                : 'text-[#9a9a9a] hover:bg-[#1f1f1f] hover:text-white'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>SSH</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange('browser');
              setCurrentUrl(null);
              setUrlInput('');
            }}
            className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#222]"
            title="Neuer Browser-Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9a9a9a] hover:text-white hover:bg-[#262626]"
            title="Panel zuklappen"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ====================================================================
          TAB 1: LINUX KI-BROWSER (1:1 Screenshot 155607.png + Live AI Cursor)
         ==================================================================== */}
      {activeTab === 'browser' && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* URL Navigation Bar (Screenshot 155607.png) */}
          <div className="px-3 py-2 bg-[#161616] border-b border-[#242424] flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#222222] rounded-full px-2 py-1 border border-[#2e2e2e]">
              <button
                type="button"
                onClick={() => setCurrentUrl(null)}
                className="p-1 text-[#888] hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 text-[#555]">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onTriggerAiBrowserDemo(currentUrl || 'https://docs.unity3d.com')}
                className="p-1 text-[#aaa] hover:text-white"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleUrlSubmit} className="flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Suchen oder URL eingeben"
                className="w-full px-4 py-1.5 rounded-full bg-[#242424] border border-[#303030] text-xs text-white placeholder-[#8a8a8a] text-center focus:text-left focus:outline-none focus:border-[#484848]"
              />
            </form>

            <button
              type="button"
              onClick={() => onTriggerAiBrowserDemo(currentUrl || 'https://docs.unity3d.com/Manual/AnimationSection.html')}
              className="px-2.5 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/40 text-[11px] text-blue-300 hover:bg-blue-600/30 flex items-center gap-1 shrink-0"
              title="KI im Browser selbstständig navigieren lassen"
            >
              <MousePointer className="w-3 h-3" />
              <span>KI-Maus Demo</span>
            </button>
          </div>

          {/* Browser Body */}
          {!currentUrl ? (
            /* New Tab Start Screen (1:1 Screenshot 155607.png) */
            <div className="flex-1 p-6 overflow-y-auto space-y-7 bg-[#141414]">
              {/* Tools Section */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-white">Tools</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onTabChange('terminal')}
                    className="px-3.5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] border border-[#2c2c2c] flex items-center justify-between text-xs text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#aaa]" />
                      <span>Dateien</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#2c2c2c] text-[10px] text-[#999]">
                      Ctrl+P
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('terminal')}
                    className="px-3.5 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] border border-[#2c2c2c] flex items-center justify-between text-xs text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TerminalIcon className="w-4 h-4 text-[#aaa]" />
                      <span>Terminal</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#2c2c2c] text-[10px] text-[#999]">
                      Ctrl+`
                    </span>
                  </button>
                </div>
              </div>

              {/* Server GUI Apps (Unity & Blender Quick Launchers) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Linux-Server Apps (Single-Window Streaming ohne Desktop)
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    {hardware.hasDedicatedGpu ? 'GPU VirtualGL' : 'VPS Mesa LLVMpipe'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onTabChange('unity')}
                    className="p-3 rounded-xl bg-[#1c2331] hover:bg-[#232d3f] border border-blue-500/30 text-left space-y-1 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Box className="w-4 h-4 text-blue-400" /> Unity Editor
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9ab0d0]">
                      Unity installieren, anmelden & Szenen direkt auf dem iPad bearbeiten
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('blender')}
                    className="p-3 rounded-xl bg-[#2b2118] hover:bg-[#36291e] border border-amber-500/30 text-left space-y-1 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" /> Blender 3D
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-[#d0b49a]">
                      Blender installieren & KI-Waffenmodelle im 3D-Viewport erstellen
                    </p>
                  </button>
                </div>
              </div>

              {/* Vorgeschlagen (1:1 Screenshot 155607.png) */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-white">Vorgeschlagen</div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { title: 'VynNet Appy – App...', url: 'https://vynnet.app', icon: 'V' },
                    { title: 'FC Ultimate Team ...', url: 'https://ea.com/fc-ultimate-team', icon: '🌐' },
                    { title: 'Vibe Sports Contro...', url: 'https://vibesports.dev', icon: '🌐' },
                    { title: 'Qwen FUT Control', url: 'https://qwen-fut.local', icon: '🌐' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setUrlInput(item.url);
                        setCurrentUrl(item.url);
                        onTriggerAiBrowserDemo(item.url);
                      }}
                      className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[#1f1f1f] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#222] border border-[#303030] flex items-center justify-center text-sm text-white group-hover:border-[#444]">
                        {item.icon === 'V' ? (
                          <span className="font-black text-xs bg-black px-1.5 py-0.5 rounded">
                            V.
                          </span>
                        ) : (
                          <Globe className="w-5 h-5 text-[#ccc]" />
                        )}
                      </div>
                      <span className="text-[11px] text-[#bbb] truncate w-full">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Linux Chromium Viewport with Live AI Mouse Cursor */
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                onTriggerAiBrowserDemo(`${currentUrl}#tap(${x},${y})`);
              }}
              className="flex-1 bg-[#11161d] relative overflow-hidden flex flex-col cursor-pointer"
            >
              {/* Simulated Remote Linux Chromium Render Surface */}
              <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#253042] pb-3">
                  <div>
                    <div className="text-xs text-blue-400 font-mono">{currentUrl}</div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Linux Chromium Headless Stream (Playwright + Vision Bridge)
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> KI analysiert DOM & Bild
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#18212f] border border-[#2b3b54] space-y-2">
                    <div className="text-xs font-semibold text-white">
                      Interaktives Web-Element #1 (Humanoid Hand Rig Docs)
                    </div>
                    <p className="text-[11px] text-[#9ab0d0]">
                      Tippe irgendwo in diesen Browser-Stream oder lasse die KI automatisch navigieren, Buttons klicken und Screenshots für den Chat aufnehmen.
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendPromptFromApp(
                          `Analysiere die geöffnete Seite (${currentUrl}) im Linux-Browser und übernimm die Erkenntnisse in mein Projekt.`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium"
                    >
                      Seite durch KI auswerten lassen
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#18212f] border border-[#2b3b54] space-y-2">
                    <div className="text-xs font-semibold text-white">
                      Live Server-Port-Vorschau (localhost:5173 / 8080)
                    </div>
                    <p className="text-[11px] text-[#9ab0d0]">
                      Alle Web-Server, die Codex oder Antigravity auf dem VPS starten, werden automatisch hier im integrierten Linux-Browser gerendert.
                    </p>
                  </div>
                </div>
              </div>

              {/* VISIBLE LIVE AI MOUSE CURSOR OVERLAY */}
              {aiCursor.visible && (
                <div
                  className="pointer-events-none absolute z-30 transition-all duration-500 ease-out"
                  style={{
                    left: `${aiCursor.x}%`,
                    top: `${aiCursor.y}%`,
                  }}
                >
                  <div className="relative">
                    {/* Cursor Ring */}
                    {aiCursor.action === 'clicking' && (
                      <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-blue-500/40 animate-ping" />
                    )}
                    {/* Pointer SVG */}
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="drop-shadow-[0_2px_8px_rgba(59,130,246,0.9)]"
                    >
                      <path
                        d="M4 3L11.5 20L14.2 13.5L20.5 11L4 3Z"
                        fill="#3B82F6"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="mt-1 ml-4 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold whitespace-nowrap shadow-lg border border-blue-300/40">
                      🤖 {aiCursor.label}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: UNITY EDITOR (SINGLE-WINDOW STREAM OHNE LINUX-DESKTOP)
         ==================================================================== */}
      {activeTab === 'unity' && (
        <div className="flex-1 flex flex-col bg-[#181818] overflow-hidden">
          {/* Unity Single-Window Titlebar */}
          <div className="px-3 py-2 bg-[#202020] border-b border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Box className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-white truncate">
                {unityApp.windowTitle}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  hardware.hasDedicatedGpu
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <Cpu className="w-3 h-3" />
                {hardware.hasDedicatedGpu
                  ? `GPU VirtualGL (${unityApp.fps} FPS)`
                  : `VPS CPU-Modus • Mesa LLVMpipe (${unityApp.fps} FPS)`}
              </span>
            </div>
          </div>

          {/* Installer / Version & Account Bar */}
          <div className="px-3 py-2 bg-[#161616] border-b border-[#262626] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[#bbb]">{unityApp.loggedInUser}</span>
              <select
                value={unityVersionSelect}
                onChange={(e) => {
                  setUnityVersionSelect(e.target.value);
                  onUpdateApp('unity', { version: e.target.value });
                }}
                className="px-2 py-1 rounded bg-[#242424] border border-[#363636] text-xs text-white"
              >
                {unityApp.availableVersions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onInstallApp('unity')}
                className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#323232] text-white text-[11px] flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-blue-400" />
                <span>Unity neu installieren / Version wechseln</span>
              </button>
            </div>
          </div>

          {unityApp.installing ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <div className="space-y-1 max-w-md">
                <div className="text-sm font-semibold text-white">
                  Unity Hub & Editor wird auf dem Server eingerichtet ({unityApp.installProgress}%)
                </div>
                <p className="text-xs text-[#9a9a9a]">{unityApp.installStepText}</p>
              </div>
              <div className="w-64 h-2 rounded-full bg-[#262626] overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${unityApp.installProgress}%` }}
                />
              </div>
            </div>
          ) : (
            /* Interactive Unity Editor Single-Window Stream (No Linux Desktop clutter!) */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Unity Top Play/Pause Toolbar */}
              <div className="h-9 px-3 bg-[#252525] border-b border-[#181818] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-[#bbb]">
                  <span className="px-2 py-0.5 rounded bg-[#333] text-white">Hand-Tool</span>
                  <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40">
                    Rotate / IK
                  </span>
                  <span className="text-[#888] hidden sm:inline">
                    Projekt: {unityApp.currentProject}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUnityPlaying(!unityPlaying)}
                    className={`px-3 py-1 rounded flex items-center gap-1 text-xs font-medium ${
                      unityPlaying
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#333] text-[#ccc] hover:bg-[#404040]'
                    }`}
                  >
                    {unityPlaying ? (
                      <>
                        <Pause className="w-3 h-3" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Play
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MCP Server aktiv
                </div>
              </div>

              {/* Split: Hierarchy left + 3D Scene View center + Inspector bottom */}
              <div className="flex-1 flex overflow-hidden">
                {/* Scene Hierarchy */}
                <div className="w-44 bg-[#1e1e1e] border-r border-[#2b2b2b] p-2.5 space-y-1 text-xs overflow-y-auto shrink-0">
                  <div className="text-[10px] font-bold uppercase text-[#777] px-1 mb-1">
                    Hierarchy (ShooterTrying)
                  </div>
                  {[
                    'FirstPersonArms_Rig',
                    '  ├─ LeftArm_IK_Idle',
                    '  ├─ RightArm_Throw',
                    '  ├─ RightHand_Thumb01',
                    '  ├─ RightHand_Thumb02',
                    '  ├─ Cuff_Sleeve_Mesh',
                    '  └─ Grenade_M67_Anchor',
                  ].map((node) => {
                    const clean = node.replace(/[^a-zA-Z0-9_]/g, '');
                    const isSel = selectedBone === clean;
                    return (
                      <button
                        key={node}
                        type="button"
                        onClick={() => setSelectedBone(clean)}
                        className={`w-full text-left px-2 py-1 rounded font-mono text-[11px] truncate ${
                          isSel
                            ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40'
                            : 'text-[#bbb] hover:bg-[#292929]'
                        }`}
                      >
                        {node}
                      </button>
                    );
                  })}
                </div>

                {/* 3D Interactive Scene Viewport */}
                <div
                  onPointerMove={(e) => {
                    if (e.buttons === 1) {
                      setUnityCamYaw((y) => y + e.movementX * 0.6);
                      setUnityCamPitch((p) => Math.max(-45, Math.min(60, p + e.movementY * 0.5)));
                    }
                  }}
                  className="flex-1 bg-gradient-to-b from-[#1b222c] to-[#12161c] relative overflow-hidden flex flex-col justify-between p-3 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#9ab0d0] z-10">
                    <span>
                      #Scene View • Touch/Ziehen zum Drehen ({Math.round(unityCamYaw)}° /{' '}
                      {Math.round(unityCamPitch)}°)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/40 text-emerald-300 font-mono">
                      Frame {unityFrame}/60
                    </span>
                  </div>

                  {/* Visual 3D First-Person Arm + Grenade Rig Preview */}
                  <div className="my-auto flex items-center justify-center">
                    <svg
                      viewBox="0 0 360 220"
                      className="w-full max-w-[360px] h-48 drop-shadow-2xl"
                      style={{
                        transform: `rotateY(${unityCamYaw * 0.35}deg) rotateX(${unityCamPitch * 0.25}deg)`,
                      }}
                    >
                      {/* Perspective Grid */}
                      <g stroke="#2a3648" strokeWidth="1">
                        <line x1="20" y1="190" x2="340" y2="190" />
                        <line x1="50" y1="160" x2="310" y2="160" />
                        <line x1="80" y1="135" x2="280" y2="135" />
                        <line x1="180" y1="120" x2="180" y2="205" />
                      </g>

                      {/* Left Arm (Natural relaxed idle pose) */}
                      <g
                        transform={`translate(0, ${Math.sin((unityFrame / 60) * Math.PI * 2) * 3})`}
                      >
                        <path
                          d="M 45 200 Q 75 150 112 132"
                          stroke="#475569"
                          strokeWidth="22"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <circle cx="112" cy="132" r="11" fill="#94a3b8" />
                      </g>

                      {/* Right Arm + Closed Sleeve Cuff + Hand gripping Grenade cleanly */}
                      <g
                        transform={`translate(${
                          Math.sin((unityFrame / 60) * Math.PI * 2) * 18
                        }, ${-Math.abs(Math.cos((unityFrame / 60) * Math.PI * 2)) * 16})`}
                      >
                        {/* Forearm Sleeve (Closed cuff - no hollow arm bug!) */}
                        <path
                          d="M 300 205 Q 260 150 220 105"
                          stroke="#3b82f6"
                          strokeWidth="26"
                          strokeLinecap="round"
                          fill="none"
                        />
                        {/* Wrist Cuff Seal */}
                        <ellipse
                          cx="220"
                          cy="105"
                          rx="14"
                          ry="10"
                          fill="#1e293b"
                          stroke="#60a5fa"
                          strokeWidth="2"
                        />
                        {/* Grenade Body */}
                        <circle
                          cx="202"
                          cy="82"
                          r="18"
                          fill="#15803d"
                          stroke="#4ade80"
                          strokeWidth="2"
                        />
                        {/* Thumb cleanly wrapping outside grenade (no clipping!) */}
                        <path
                          d="M 218 98 Q 195 96 186 85"
                          stroke="#f8fafc"
                          strokeWidth="7"
                          strokeLinecap="round"
                          fill="none"
                        />
                        {/* IK Gizmo */}
                        <circle
                          cx="202"
                          cy="82"
                          r="26"
                          fill="none"
                          stroke="#f59e0b"
                          strokeDasharray="4 3"
                        />
                      </g>
                    </svg>
                  </div>

                  {/* Last AI Action Banner inside Unity */}
                  <div className="p-2 rounded-lg bg-black/50 border border-blue-500/30 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-blue-200 truncate">
                      ✨ <strong>Letzte KI-Änderung:</strong> {unityApp.lastAiAction}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onSendPromptFromApp(
                          'Importiere das Projekt ShooterTrying in Unity und verfeinere die Granatenanimation am rechten Handgelenk noch weiter.'
                        )
                      }
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0"
                    >
                      KI in Unity arbeiten lassen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 3: BLENDER 3D (SINGLE-WINDOW STREAM + KI-WAFFENMODELL-GENERATOR)
         ==================================================================== */}
      {activeTab === 'blender' && (
        <div className="flex-1 flex flex-col bg-[#181818] overflow-hidden">
          <div className="px-3 py-2 bg-[#202020] border-b border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">{blenderApp.windowTitle}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {hardware.hasDedicatedGpu
                ? `GPU Hardware OpenGL (${blenderApp.fps} FPS)`
                : `VPS CPU • Mesa LLVMpipe (${blenderApp.fps} FPS)`}
            </span>
          </div>

          <div className="px-3 py-2 bg-[#161616] border-b border-[#262626] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {(['solid', 'wireframe', 'material'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBlenderShading(m)}
                  className={`px-2.5 py-1 rounded capitalize text-[11px] ${
                    blenderShading === m
                      ? 'bg-amber-600 text-white font-medium'
                      : 'bg-[#262626] text-[#aaa]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onInstallApp('blender')}
                className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333] text-[11px] text-white flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-amber-400" />
                <span>Blender installieren / Update</span>
              </button>
            </div>
          </div>

          {/* Interactive Blender 3D Viewport */}
          <div
            onPointerMove={(e) => {
              if (e.buttons === 1) {
                setBlenderYaw((y) => y + e.movementX * 0.7);
                setBlenderPitch((p) => Math.max(-45, Math.min(45, p + e.movementY * 0.5)));
              }
            }}
            className="flex-1 bg-[#222222] relative overflow-hidden flex flex-col justify-between p-4 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center justify-between text-[11px] text-[#bbb]">
              <span>
                Blender 4.3 Viewport • Modell: <strong>{blenderApp.activeSceneOrModel}</strong>
              </span>
              <span>Yaw: {Math.round(blenderYaw)}° | Pitch: {Math.round(blenderPitch)}°</span>
            </div>

            {/* 3D Procedural Weapon Mesh Preview */}
            <div className="my-auto flex items-center justify-center">
              <svg
                viewBox="0 0 420 200"
                className="w-full max-w-[400px] h-48"
                style={{
                  transform: `rotateY(${blenderYaw * 0.4}deg) rotateX(${blenderPitch * 0.3}deg)`,
                }}
              >
                {/* Blender Floor Grid */}
                <g stroke="#333" strokeWidth="1">
                  <line x1="10" y1="165" x2="410" y2="165" />
                  <line x1="60" y1="140" x2="360" y2="140" />
                  <line x1="210" y1="40" x2="210" y2="185" stroke="#4d2c2c" />
                </g>

                {/* 3D Tactical Weapon Silhouette (Wireframe / Solid / Material) */}
                <g
                  fill={
                    blenderShading === 'wireframe'
                      ? 'none'
                      : blenderShading === 'material'
                      ? '#3b82f6'
                      : '#64748b'
                  }
                  stroke={blenderShading === 'wireframe' ? '#f59e0b' : '#e2e8f0'}
                  strokeWidth="2"
                >
                  {/* Stock */}
                  <polygon points="45,85 110,80 110,115 45,125" />
                  {/* Receiver Body */}
                  <rect x="110" y="72" width="135" height="36" rx="4" />
                  {/* Optic Scope */}
                  <rect x="145" y="50" width="65" height="18" rx="3" />
                  {/* Handguard & Barrel */}
                  <rect x="245" y="76" width="95" height="22" rx="2" />
                  <rect x="340" y="82" width="48" height="8" rx="2" />
                  {/* Pistol Grip */}
                  <polygon points="130,108 152,108 140,152 118,150" />
                  {/* Curved Magazine */}
                  <polygon points="188,108 214,108 226,162 198,164" />
                </g>
              </svg>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {(['rifle', 'sniper', 'plasma'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setWeaponPreset(preset);
                      onUpdateApp('blender', {
                        prompt: `Neues 3D-Waffenmodell (${preset.toUpperCase()}) per Blender Python API generiert`,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      weaponPreset === preset
                        ? 'bg-amber-600 text-white'
                        : 'bg-[#2e2e2e] text-[#ccc] hover:bg-[#383838]'
                    }`}
                  >
                    {preset === 'rifle'
                      ? 'Sturmgewehr Mk4'
                      : preset === 'sniper'
                      ? 'Sniper Precision'
                      : 'Sci-Fi Plasma-Waffe'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onSendPromptFromApp(
                      'Installiere falls nötig das Blender-Plugin, erstelle ein detailliertes 3D-Waffenmodell in Blender und exportiere es direkt als FBX für mein Unity-Projekt.'
                    )
                  }
                  className="ml-auto px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>KI: Waffenmodell in Blender bauen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: SSH SERVER TERMINAL & FILES
         ==================================================================== */}
      {activeTab === 'terminal' && (
        <div className="flex-1 flex flex-col bg-[#0f0f0f] font-mono text-xs overflow-hidden">
          <div className="px-3 py-2 bg-[#181818] border-b border-[#262626] flex items-center justify-between text-[11px] text-[#9a9a9a]">
            <span>SSH Sitzung • root@{hardware.hostname}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const out = await onExecTerminal('nvidia-smi');
                  setTermLogs((prev) => [...prev, '$ nvidia-smi', out]);
                }}
                className="px-2 py-0.5 rounded bg-[#262626] hover:bg-[#333] text-white"
              >
                Test: nvidia-smi
              </button>
              <button
                type="button"
                onClick={async () => {
                  const out = await onExecTerminal('glxinfo -B');
                  setTermLogs((prev) => [...prev, '$ glxinfo -B', out]);
                }}
                className="px-2 py-0.5 rounded bg-[#262626] hover:bg-[#333] text-white"
              >
                Test: glxinfo
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-[#d4d4d4]">
            {termLogs.map((line, idx) => (
              <pre key={idx} className="whitespace-pre-wrap break-words leading-relaxed">
                {line}
              </pre>
            ))}
          </div>

          <form
            onSubmit={handleTermSubmit}
            className="p-2 bg-[#161616] border-t border-[#262626] flex items-center gap-2"
          >
            <span className="text-emerald-400 font-bold">#</span>
            <input
              type="text"
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              placeholder="SSH-Befehl auf Server ausführen (z.B. nvidia-smi, ls -la)..."
              className="flex-1 bg-transparent text-white focus:outline-none"
            />
          </form>
        </div>
      )}
    </div>
  );
};
