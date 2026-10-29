import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Box,
  Clock,
  Columns,
  Target,
  MoreHorizontal,
  GitBranch,
  LayoutGrid,
  Edit,
  Search,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  ShieldAlert,
  Hand,
  ShieldCheck,
  Lock,
  Sparkles,
  Mic,
  ArrowUp,
  Paperclip,
  Lightbulb,
  PenTool,
  Terminal,
  Eye,
  Wrench,
  Check,
  RefreshCw,
  Zap,
  Monitor,
  AlertCircle,
  Copy,
  Layers,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type {
  BrowserAiCursor,
  ChatMessage,
  ChatThread,
  EffortLevel,
  ModelOption,
  PermissionMode,
  ProjectFolder,
  ProviderAccount,
  ProviderType,
  RemoteAppStatus,
  ServerConnectionConfig,
  UserProfile,
} from './types';
import { INITIAL_CHATS, INITIAL_PROJECTS } from './data/initialData';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfilePopover } from './components/ProfilePopover';
import { SettingsModal } from './components/SettingsModal';
import { RightSplitWorkspace } from './components/RightSplitWorkspace';
import { SketchModal } from './components/SketchModal';

// Helper to build default models on-device (so the sideloaded iPad app works 100% standalone too!)
function createDefaultAccounts(): ProviderAccount[] {
  const makeModels = (
    provider: ProviderType,
    accountId: string,
    accountLabel: string,
    exhausted = false
  ): ModelOption[] => {
    if (provider === 'codex') {
      const q = exhausted ? 0 : 85;
      return [
        { id: `${accountId}:gpt-6.1-terra`, name: 'GPT-6.1 Terra', provider, accountId, accountLabel, isDefault: true, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-6.1-sol`, name: 'GPT-6.1 Sol', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-6-astra`, name: 'GPT-6 Astra', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-6-sol`, name: 'GPT-6 Sol', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-6-luna`, name: 'GPT-6 Luna', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-5.6-sol`, name: 'GPT-5.6 Sol', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-5.6-terra`, name: 'GPT-5.6 Terra', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
        { id: `${accountId}:gpt-5.6-luna`, name: 'GPT-5.6 Luna', provider, accountId, accountLabel, available: true, quotaPercent: q, supportsEffort: true },
      ];
    }
    if (provider === 'antigravity') {
      return [
        { id: `${accountId}:gemini-4-argon`, name: 'Gemini 4 Argon (High)', provider, accountId, accountLabel, isDefault: true, available: true, quotaPercent: 98, supportsEffort: true },
        { id: `${accountId}:gemini-3.1-pro`, name: 'Gemini 3.1 Pro', provider, accountId, accountLabel, available: true, quotaPercent: 98, supportsEffort: true },
        { id: `${accountId}:claude-4.5-sonnet`, name: 'Claude 4.5 Sonnet (AGY)', provider, accountId, accountLabel, available: true, quotaPercent: 76, supportsEffort: true },
        { id: `${accountId}:claude-4.5-opus`, name: 'Claude 4.5 Opus (AGY)', provider, accountId, accountLabel, available: true, quotaPercent: 64, supportsEffort: true },
      ];
    }
    return [
      { id: `${accountId}:opencode-sonnet`, name: 'OpenCode • Claude Sonnet 4', provider, accountId, accountLabel, isDefault: true, available: true, quotaPercent: 92, supportsEffort: true },
      { id: `${accountId}:opencode-deepseek-r2`, name: 'OpenCode • DeepSeek R2 Coder', provider, accountId, accountLabel, available: true, quotaPercent: 95, supportsEffort: true },
    ];
  };

  return [
    {
      id: 'codex-1',
      provider: 'codex',
      index: 1,
      label: 'Codex #1 (xLeonTTV)',
      usernameOrEmail: 'xLeonTTV (Plus)',
      status: 'authenticated',
      quotas: [
        { label: '5 Std.', percentRemaining: 0, resetAt: '18:26', modelGroup: 'Codex & Work' },
        { label: 'Wöchentlich', percentRemaining: 58, resetAt: '4. Nov.', modelGroup: 'Codex & Work' },
      ],
      models: makeModels('codex', 'codex-1', 'Codex #1 (xLeonTTV)', true),
    },
    {
      id: 'codex-2',
      provider: 'codex',
      index: 2,
      label: 'Codex #2 (Backup)',
      usernameOrEmail: 'leon.backup@openai.user',
      status: 'authenticated',
      quotas: [
        { label: '5 Std.', percentRemaining: 85, resetAt: '20:15', modelGroup: 'Codex & Work' },
        { label: 'Wöchentlich', percentRemaining: 91, resetAt: '6. Nov.', modelGroup: 'Codex & Work' },
      ],
      models: makeModels('codex', 'codex-2', 'Codex #2 (Backup)', false),
    },
    {
      id: 'antigravity-1',
      provider: 'antigravity',
      index: 1,
      label: 'Antigravity #1 (Main)',
      usernameOrEmail: 'leon.agy1@gmail.com',
      status: 'authenticated',
      quotas: [
        { label: 'Gemini • 5 Std.-Limit', percentRemaining: 98, resetAt: '19:45', modelGroup: 'Gemini' },
        { label: 'Gemini • Wöchentlich', percentRemaining: 70, resetAt: '4. Nov.', modelGroup: 'Gemini' },
        { label: 'Claude • 5 Std.-Limit', percentRemaining: 76, resetAt: '19:10', modelGroup: 'Claude' },
      ],
      models: makeModels('antigravity', 'antigravity-1', 'Antigravity #1 (Main)', false),
    },
    {
      id: 'antigravity-2',
      provider: 'antigravity',
      index: 2,
      label: 'Antigravity #2 (Dev)',
      usernameOrEmail: 'leon.agy2@gmail.com',
      status: 'authenticated',
      quotas: [
        { label: 'Gemini • 5 Std.-Limit', percentRemaining: 100, resetAt: '21:00', modelGroup: 'Gemini' },
        { label: 'Gemini • Wöchentlich', percentRemaining: 94, resetAt: '5. Nov.', modelGroup: 'Gemini' },
      ],
      models: makeModels('antigravity', 'antigravity-2', 'Antigravity #2 (Dev)', false),
    },
    {
      id: 'opencode-1',
      provider: 'opencode',
      index: 1,
      label: 'OpenCode #1',
      usernameOrEmail: 'opencode@vps',
      status: 'authenticated',
      quotas: [
        { label: '5 Std.-Limit', percentRemaining: 92, resetAt: '20:00', modelGroup: 'OpenCode' },
        { label: 'Wöchentlich', percentRemaining: 88, resetAt: '5. Nov.', modelGroup: 'OpenCode' },
      ],
      models: makeModels('opencode', 'opencode-1', 'OpenCode #1', false),
    },
  ];
}

export function App() {
  // Core State (works both connected to Backend Bridge & standalone on sideloaded iPad!)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: 'xLeonTTV',
    handle: '@leonm1501',
    initials: 'XL',
    avatarColor: '#b08d57',
    planName: 'Plus',
    onboardingCompleted: false,
    stats: {
      totalTokens: '3,1 Mrd.',
      peakTokens: '204 Mio.',
      longestTask: '2 Std. 48 Min.',
      longestStreak: '25 Tage',
      currentStreak: '25 Tage',
    },
  });

  const [serverConfig, setServerConfig] = useState<ServerConnectionConfig>({
    host: '168.119.42.108',
    port: 22,
    username: 'root',
    connected: true,
    useSimulatedVps: true,
    hardware: {
      detected: true,
      isSimulatedVps: true,
      hostname: 'cloudki-vps-ubuntu24',
      os: 'Ubuntu 24.04.1 LTS (x86_64)',
      cpuModel: 'AMD EPYC 9454P 8-Core vCPU',
      cpuCores: 8,
      ramTotalGb: 16,
      hasDedicatedGpu: false,
      gpuName: null,
      gpuVramGb: null,
      renderBackend: 'Mesa LLVMpipe (CPU Software Rendering)',
      displayProtocol: 'Xpra / KasmVNC Single-Window (Rootless)',
      driverFlags: 'LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe XVFB_WHD=1920x1080x24',
    },
  });

  const [accounts, setAccounts] = useState<ProviderAccount[]>(createDefaultAccounts);
  const [projects, setProjects] = useState<ProjectFolder[]>(INITIAL_PROJECTS);
  const [chats, setChats] = useState<ChatThread[]>(INITIAL_CHATS);

  // Active Navigation State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('proj-cloudki');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null); // null = Empty state ("Woran sollen wir in CloudKIApp arbeiten?")
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Right Split-View Workspace State (Screenshot 155607.png)
  const [rightPaneOpen, setRightPaneOpen] = useState(true);
  const [rightPaneTab, setRightPaneTab] = useState<'browser' | 'unity' | 'blender' | 'terminal'>('browser');

  // Active Composer / Model / Effort / Permission State
  const [activeAccountId, setActiveAccountId] = useState<string>('codex-1');
  const [activeModelId, setActiveModelId] = useState<string>('codex-1:gpt-6.1-terra');
  const [effort, setEffort] = useState<EffortLevel>('Hoch');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('full_access');
  const [planModeActive, setPlanModeActive] = useState(false);
  const [goalText, setGoalText] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string }[]>([]);

  // Popover & Modal States
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('allgemein');
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('/root/projects/');

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [permMenuOpen, setPermMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [effortMenuOpen, setEffortMenuOpen] = useState(false);
  const [sketchModalOpen, setSketchModalOpen] = useState(false);
  const [showPet, setShowPet] = useState(false);

  // Live Model Discovery Check State
  const [discoveringModels, setDiscoveringModels] = useState(false);
  const [lastModelCheck, setLastModelCheck] = useState<string>('Gerade eben');

  // Remote Apps State (Unity & Blender)
  const [remoteApps, setRemoteApps] = useState<Record<'unity' | 'blender', RemoteAppStatus>>({
    unity: {
      id: 'unity',
      name: 'Unity Hub & Editor (Single-Window Xpra Stream)',
      installed: true,
      installing: false,
      installProgress: 100,
      installStepText: 'Unity 6000.0.23f1 LTS & Unity-MCP Bridge bereit',
      running: true,
      version: '6000.0.23f1 LTS',
      availableVersions: ['6000.0.23f1 LTS (Unity 6)', '2022.3.50f1 LTS', '2021.3.44f1 LTS'],
      loggedInUser: 'xLeonTTV (Unity ID)',
      windowTitle: 'ShooterTrying - GrenadeThrow.anim - Unity 6000.0.23f1 LTS <OpenGL Core / LLVMpipe>',
      renderMode: 'Mesa LLVMpipe (CPU Software Rendering)',
      fps: 24,
      currentProject: '/root/projects/ShooterTrying',
      activeSceneOrModel: 'Assets/Animations/GrenadeThrow_V2.anim',
      lastAiAction: 'Handgelenk-Rotation & rechte Schulter-IK der Granatenanimation geglättet',
    },
    blender: {
      id: 'blender',
      name: 'Blender 4.3 LTS (3D Viewport & Python Bridge)',
      installed: true,
      installing: false,
      installProgress: 100,
      installStepText: 'Blender 4.3 LTS + AI Mesh Generator Addon bereit',
      running: true,
      version: '4.3.0 LTS',
      availableVersions: ['4.3.0 LTS', '4.2.3 LTS', '3.6.16 LTS'],
      loggedInUser: 'Lokales Server-Profil',
      windowTitle: 'Blender 4.3 - [Tactical_Rifle_Mk4.blend] (Single-Window Stream)',
      renderMode: 'Mesa LLVMpipe (CPU Software Rendering)',
      fps: 48,
      currentProject: '/root/projects/ShooterTrying/Assets/Models',
      activeSceneOrModel: 'Tactical_Rifle_Mk4 (18.420 Tris, PBR Rigged)',
      lastAiAction: 'Picatinny-Rail, Mündungsfeuerdämpfer & Magazin-Geometrie per Python-API generiert',
    },
  });

  // Live AI Browser Cursor State
  const [aiCursor, setAiCursor] = useState<BrowserAiCursor>({
    visible: false,
    x: 45,
    y: 40,
    action: 'idle',
    label: 'KI-Browser bereit',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Sync with backend if reachable
  useEffect(() => {
    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.userProfile) setUserProfile(data.userProfile);
        if (data?.serverConfig) setServerConfig(data.serverConfig);
        if (data?.providerAccounts) setAccounts(data.providerAccounts);
        if (data?.remoteApps) setRemoteApps(data.remoteApps);
      })
      .catch(() => {
        // Running standalone on iPad without local PC server – uses internal state seamlessly
      });
  }, []);

  const currentChat = chats.find((c) => c.id === selectedChatId) || null;
  const currentProject =
    projects.find((p) => p.id === (currentChat?.projectId ?? selectedProjectId)) || null;

  // Find currently selected account & model object
  const allModels: ModelOption[] = accounts.flatMap((a) => a.models);
  const currentModel: ModelOption =
    allModels.find((m) => m.id === activeModelId) ||
    allModels[0] || {
      id: 'codex-1:gpt-6.1-terra',
      name: 'GPT-6.1 Terra',
      provider: 'codex',
      accountId: 'codex-1',
      accountLabel: 'Codex #1 (xLeonTTV)',
      available: true,
      quotaPercent: 0,
      supportsEffort: true,
    };

  const currentAccount =
    accounts.find((a) => a.id === currentModel.accountId) || accounts[0];

  const isCurrentAccountExhausted =
    (currentAccount?.quotas[0]?.percentRemaining ?? 100) <= 0;

  // Trigger Live Model Discovery every time user clicks the Model selector button!
  const handleOpenModelMenu = async () => {
    const nextState = !modelMenuOpen;
    setModelMenuOpen(nextState);
    setEffortMenuOpen(false);
    setPermMenuOpen(false);
    setPlusMenuOpen(false);

    if (nextState) {
      setDiscoveringModels(true);
      try {
        const res = await fetch('/api/models/discover');
        if (res.ok) {
          const data = await res.json();
          setLastModelCheck(`${data.checkedAt} (${data.latencyMs}ms)`);
        } else {
          throw new Error('fallback');
        }
      } catch {
        const now = new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastModelCheck(`${now} (19ms)`);
      } finally {
        setTimeout(() => setDiscoveringModels(false), 220);
      }
    }
  };

  // Seamless Mid-Chat Model / Account Switch (Context Handoff!)
  const handleSelectModel = (model: ModelOption) => {
    const prevModel = currentModel;
    setActiveAccountId(model.accountId);
    setActiveModelId(model.id);
    setModelMenuOpen(false);

    if (currentChat && prevModel.id !== model.id) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChat.id
            ? {
                ...c,
                activeAccountId: model.accountId,
                activeModelId: model.id,
              }
            : c
        )
      );
    }
  };

  // Quick 1-Click Switch when Quota is 0% (switches to Antigravity Gemini 4 Argon or Codex #2)
  const handleQuickQuotaSwitch = (targetProvider: 'antigravity' | 'codex2') => {
    const targetAcc =
      targetProvider === 'antigravity'
        ? accounts.find((a) => a.provider === 'antigravity')
        : accounts.find((a) => a.id === 'codex-2');
    const targetMod = targetAcc?.models[0];
    if (targetMod) {
      handleSelectModel(targetMod);
    }
  };

  // Trigger Live AI Browser Cursor Animation
  const triggerAiBrowserDemo = (targetUrl?: string) => {
    setRightPaneOpen(true);
    setRightPaneTab('browser');
    const steps: { x: number; y: number; action: BrowserAiCursor['action']; label: string }[] = [
      { x: 28, y: 24, action: 'moving', label: `Öffne ${targetUrl || 'Webseite'}...` },
      { x: 35, y: 42, action: 'clicking', label: 'Klicke auf Dokumentation / Element' },
      { x: 62, y: 55, action: 'scrolling', label: 'Scrolle & analysiere Viewport-Screenshot' },
      { x: 48, y: 36, action: 'analyzing', label: 'Extrahiere Code & Parameter für Chat' },
    ];

    steps.forEach((s, idx) => {
      setTimeout(() => {
        setAiCursor({
          visible: true,
          x: s.x,
          y: s.y,
          action: s.action,
          label: s.label,
        });
      }, idx * 700);
    });
  };

  // Send Message in Chat (with Automatic Context Handoff if model/provider changed!)
  const handleSendMessage = (customPrompt?: string) => {
    const text = (customPrompt ?? composerText).trim();
    if (!text) return;
    if (!customPrompt) setComposerText('');

    const nowTime = new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: nowTime,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    setAttachments([]);

    let targetChatId = selectedChatId;
    let previousAssistantMsg: ChatMessage | undefined;

    if (!targetChatId) {
      const newChat: ChatThread = {
        id: `chat-${Date.now()}`,
        title: text.slice(0, 42),
        projectId: selectedProjectId,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeAccountId: currentModel.accountId,
        activeModelId: currentModel.id,
        effort,
        permissionMode,
        messages: [userMsg],
        sources: [{ name: `${currentModel.accountLabel} Bridge`, type: currentModel.provider }],
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      targetChatId = newChat.id;
    } else {
      const existing = chats.find((c) => c.id === targetChatId);
      if (existing) {
        const prevMsgs = existing.messages.filter((m) => m.role === 'assistant');
        previousAssistantMsg = prevMsgs[prevMsgs.length - 1];
      }
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
    }

    // Detect if the user switched models/accounts mid-chat -> perform Seamless Context Handoff!
    const didHandoff =
      previousAssistantMsg &&
      (previousAssistantMsg.modelName !== currentModel.name ||
        previousAssistantMsg.accountId !== currentModel.accountId);

    // Check if prompt mentions Unity, Blender, or Browser
    const lower = text.toLowerCase();
    const wantsUnity = lower.includes('unity') || lower.includes('animation') || lower.includes('granate');
    const wantsBlender = lower.includes('blender') || lower.includes('waffe') || lower.includes('modell');
    const wantsBrowser = lower.includes('browser') || lower.includes('webseite') || lower.includes('http');

    if (wantsUnity) {
      setRightPaneOpen(true);
      setRightPaneTab('unity');
    } else if (wantsBlender) {
      setRightPaneOpen(true);
      setRightPaneTab('blender');
    } else if (wantsBrowser) {
      triggerAiBrowserDemo('https://docs.unity3d.com');
    }

    setTimeout(() => {
      const toolSteps: ChatMessage['toolSteps'] = [];

      if (didHandoff && previousAssistantMsg) {
        toolSteps.push({
          id: `th-${Date.now()}`,
          type: 'handoff',
          title: `Context-Handoff durchgeführt: ${previousAssistantMsg.modelName} (${previousAssistantMsg.accountLabel}) → ${currentModel.name} (${currentModel.accountLabel})`,
          detail: 'Gesamter Chat-Verlauf, Arbeitsverzeichnis und aktive Tool-Outputs wurden nahtlos übergeben.',
          status: 'done',
          timestamp: nowTime,
        });
      }

      if (wantsUnity) {
        toolSteps.push(
          {
            id: `tu1-${Date.now()}`,
            type: 'mcp',
            title: 'MCP Unity Integration verwendet, Szenen-Hierarchie & Animation-Curves geladen',
            detail: `Server Render-Mode: ${serverConfig.hardware.renderBackend}`,
            status: 'done',
            timestamp: nowTime,
          },
          {
            id: `tu2-${Date.now()}`,
            type: 'command',
            title: 'Hat Befehle ausgeführt',
            command: `unity-editor-bridge --project ${currentProject?.serverPath || '/root/projects/ShooterTrying'} --apply-ik-fix`,
            output: 'Animation Curve Tangents geglättet. Vorschau im Unity-Tab rechts aktualisiert.',
            status: 'done',
            timestamp: nowTime,
          }
        );
      } else if (wantsBlender) {
        toolSteps.push(
          {
            id: `tb1-${Date.now()}`,
            type: 'blender',
            title: 'Blender 4.3 Python-Bridge ausgeführt (Single-Window Xpra Stream)',
            command: 'blender --background --python scripts/generate_weapon_mesh.py -- --preset tactical_mk4',
            output: 'Generated 18,420 tris PBR weapon mesh + exported FBX to Unity Assets.',
            status: 'done',
            timestamp: nowTime,
          },
          {
            id: `tb2-${Date.now()}`,
            type: 'image',
            title: 'Ein Bild angesehen',
            detail: 'Blender_Viewport_WeaponRender.png',
            status: 'done',
            timestamp: nowTime,
          }
        );
      } else {
        toolSteps.push({
          id: `tc1-${Date.now()}`,
          type: 'command',
          title: 'Hat Befehle ausgeführt',
          command: `cd ${currentProject?.serverPath || '/root/projects/CloudKIApp'} && ls -la`,
          output: `Ausgeführt über ${currentModel.accountLabel} (${currentModel.name}, Aufwand: ${effort})`,
          status: 'done',
          timestamp: nowTime,
        });
      }

      const assistantReply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        timestamp: nowTime,
        provider: currentModel.provider,
        accountId: currentModel.accountId,
        accountLabel: currentModel.accountLabel,
        modelName: currentModel.name,
        effort,
        handoffFrom:
          didHandoff && previousAssistantMsg
            ? {
                previousModel: previousAssistantMsg.modelName || 'Vorheriges Modell',
                previousAccount: previousAssistantMsg.accountLabel || 'Account #1',
                newModel: currentModel.name,
                newAccount: currentModel.accountLabel,
              }
            : undefined,
        thinkingText: didHandoff
          ? `Ich habe den bisherigen Gesprächskontext von ${previousAssistantMsg?.modelName} (${previousAssistantMsg?.accountLabel}) vollständig übernommen und führe die Aufgabe im Projekt ${currentProject?.name || 'Workspace'} nahtlos mit ${currentModel.name} fort.`
          : `Ich analysiere deine Anfrage im Projekt ${currentProject?.name || 'Ohne Projekt'} auf dem Server (${serverConfig.hardware.hostname}, Grafik-Modus: ${serverConfig.hardware.renderBackend}).`,
        content: wantsUnity
          ? `Ich habe die Änderungen direkt im laufenden **Unity Editor** auf dem Server umgesetzt. Du kannst rechts im **Unity Editor**-Tab live in die Szene schauen, die Kamera per Touch drehen und die überarbeitete Animation abspielen.`
          : wantsBlender
          ? `Ich habe **Blender 4.3** auf dem Server angesteuert und das 3D-Waffenmodell generiert. Im rechten Split-Screen unter **Blender 3D** siehst du das Live-Fenster von Blender (ohne den Server-Desktop) und kannst das Modell direkt drehen oder nach Unity exportieren.`
          : `Aufgabe erledigt mit **${currentModel.name}** über **${currentModel.accountLabel}** (Denkaufwand: *${effort}*). Falls das Kontingent dieses Accounts ausläuft, kannst du unten rechts jederzeit live auf einen deiner anderen Accounts oder auf Antigravity/OpenCode umschalten – der Chat-Kontext wird dabei automatisch übertragen.`,
        toolSteps,
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId
            ? { ...c, messages: [...c.messages, assistantReply] }
            : c
        )
      );
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }, 450);
  };

  // Permission label helper (Screenshot 155649.png)
  const getPermissionBadge = () => {
    switch (permissionMode) {
      case 'ask':
        return {
          label: 'Genehmigung anfordern',
          color: 'text-[#d4d4d4]',
          icon: Hand,
        };
      case 'auto_safe':
        return {
          label: 'Für mich genehmigen',
          color: 'text-blue-400',
          icon: ShieldCheck,
        };
      case 'restricted':
        return {
          label: 'Eingeschränkter Zugriff',
          color: 'text-amber-400',
          icon: Lock,
        };
      case 'full_access':
      default:
        return {
          label: 'Uneingeschränkter Zugriff',
          color: 'text-[#e67e45]',
          icon: AlertCircle,
        };
    }
  };

  const permBadge = getPermissionBadge();
  const PermIcon = permBadge.icon;

  const pinnedProjects = projects.filter((p) => p.pinned);
  const regularProjects = projects.filter((p) => !p.pinned);

  const effortLevels: EffortLevel[] = ['Niedrig', 'Mittel', 'Hoch', 'Max'];
  const currentEffortIdx = effortLevels.indexOf(effort);

  return (
    <div className="flex h-screen w-screen bg-[#141414] text-[#ececec] overflow-hidden select-none">
      {/* ======================================================================
          1. FAR-LEFT ICON RAIL (1:1 Screenshot 155607.png)
         ====================================================================== */}
      <div className="w-12 bg-[#141414] border-r border-[#222222] flex flex-col items-center py-3 justify-between shrink-0 z-20">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-xl bg-[#2a2a2a] text-white flex items-center justify-center shadow-sm"
            title="Home / Sidebar umschalten"
          >
            <Home className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setPlusMenuOpen(true)}
            className="w-8 h-8 rounded-xl text-[#8e8e8e] hover:text-white hover:bg-[#202020] flex items-center justify-center transition-colors"
            title="Skills & Plugins"
          >
            <Box className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('profil');
              setSettingsOpen(true);
            }}
            className="w-8 h-8 rounded-xl text-[#8e8e8e] hover:text-white hover:bg-[#202020] flex items-center justify-center transition-colors"
            title="Token-Nutzung & Historie"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setRightPaneOpen(!rightPaneOpen)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              rightPaneOpen
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-[#8e8e8e] hover:text-white hover:bg-[#202020]'
            }`}
            title="Split-View (Browser / Unity / Blender)"
          >
            <Columns className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="w-8 h-8 rounded-xl text-[#8e8e8e] hover:text-white hover:bg-[#202020] flex items-center justify-center transition-colors"
            title="Server & Accounts verbinden"
          >
            <Target className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('allgemein');
              setSettingsOpen(true);
            }}
            className="w-8 h-8 rounded-xl text-[#8e8e8e] hover:text-white hover:bg-[#202020] flex items-center justify-center transition-colors"
            title="Mehr Einstellungen"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setRightPaneOpen(true);
              setRightPaneTab('terminal');
            }}
            className="w-8 h-8 rounded-xl text-[#8e8e8e] hover:text-white hover:bg-[#202020] flex items-center justify-center transition-colors"
            title="Git & SSH Terminal"
          >
            <GitBranch className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setRightPaneOpen(true);
              setRightPaneTab(rightPaneTab === 'unity' ? 'blender' : 'unity');
            }}
            className="w-8 h-8 rounded-xl text-[#8e8e8e] hover:text-white hover:bg-[#202020] flex items-center justify-center transition-colors"
            title="Unity Editor & Blender 3D wechseln"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom-Left User Profile Button ("XL" in Screenshot 155607.png & 155653.png) */}
        <button
          type="button"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-[#141414] shadow-md hover:ring-2 hover:ring-white/40 transition-all"
          style={{ backgroundColor: userProfile.avatarColor || '#b08d57' }}
          title={`${userProfile.username} • Kontingent & Einstellungen`}
        >
          {userProfile.initials || 'XL'}
        </button>
      </div>

      {/* ======================================================================
          2. LEFT PROJECT & CHAT SIDEBAR (1:1 Screenshot 155607.png)
         ====================================================================== */}
      {sidebarOpen && (
        <div className="w-60 bg-[#161616] border-r border-[#242424] flex flex-col h-full shrink-0 z-10">
          {/* Top Brand Bar ("Codex v" in Screenshot 155607.png) */}
          <div className="h-11 px-3.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-blue-400 transition-colors"
            >
              <span>Codex</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
            </button>

            <div className="flex items-center gap-1 text-[#8e8e8e]">
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="p-1.5 rounded-lg hover:bg-[#242424] hover:text-white"
                title="SSH-Server & Accounts"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setProjectPopoverOpen(true)}
                className="p-1.5 rounded-lg hover:bg-[#242424] hover:text-white"
                title="Projekte durchsuchen"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Neuer Chat Button */}
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => setSelectedChatId(null)}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[#232323] flex items-center gap-2.5 text-xs text-[#e0e0e0] font-medium transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-[#9a9a9a]" />
              <span>Neuer Chat</span>
            </button>
          </div>

          {/* Scrollable Projects & Chats List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4 text-xs">
            {/* Section: Angeheftet (Pinned without folder icon, 1:1 Screenshot 155607.png) */}
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[11px] font-medium text-[#7a7a7a]">
                Angeheftet
              </div>
              {pinnedProjects.map((pin) => {
                const isSelected = selectedProjectId === pin.id && !selectedChatId;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(pin.id);
                      setSelectedChatId(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg truncate transition-colors ${
                      isSelected
                        ? 'bg-[#282828] text-white font-medium'
                        : 'text-[#d4d4d4] hover:bg-[#202020]'
                    }`}
                  >
                    {pin.name}
                  </button>
                );
              })}
            </div>

            {/* Section: Projekte (With Folder Icons & nested chats, 1:1 Screenshot 155607.png) */}
            <div className="space-y-1.5">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-medium text-[#7a7a7a]">
                <span>Projekte</span>
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(true)}
                  className="hover:text-white"
                  title="Neues Projekt hinzufügen"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {regularProjects.map((proj) => {
                const projChats = chats.filter((c) => c.projectId === proj.id);
                const isProjSelected = selectedProjectId === proj.id && !selectedChatId;

                return (
                  <div key={proj.id} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setSelectedChatId(null);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left transition-colors ${
                        isProjSelected
                          ? 'bg-[#2a2a2a] text-white font-medium'
                          : 'text-[#e0e0e0] hover:bg-[#202020]'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 text-[#a0a0a0] shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </button>

                    {/* Indented Chats under Project */}
                    <div className="pl-6 pr-1 space-y-0.5">
                      {projChats.length === 0 ? (
                        <div className="py-1 text-[11px] text-[#686868]">Keine Chats</div>
                      ) : (
                        projChats.map((ch) => {
                          const isChatActive = selectedChatId === ch.id;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(proj.id);
                                setSelectedChatId(ch.id);
                              }}
                              className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 text-left transition-colors ${
                                isChatActive
                                  ? 'bg-[#2a2a2a] text-white font-medium'
                                  : 'text-[#b8b8b8] hover:bg-[#202020] hover:text-white'
                              }`}
                            >
                              <span className="truncate text-[12px]">{ch.title}</span>
                              {ch.hasWarning && (
                                <AlertCircle className="w-3.5 h-3.5 text-[#e05252] shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          3. CENTER MAIN CHAT AREA (1:1 Screenshots 155607, 155618, 155736)
         ====================================================================== */}
      <div className="flex-1 flex flex-col h-full bg-[#161616] min-w-0 relative">
        {/* Top Chat Header */}
        <div className="h-11 px-4 border-b border-[#242424] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-[#9a9a9a] hover:text-white hover:bg-[#242424]"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            {currentChat ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-white truncate">
                <Folder className="w-3.5 h-3.5 text-[#9a9a9a]" />
                <span className="truncate">{currentChat.title}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-white">Chat</span>
            )}
          </div>

          {/* Right Header Controls (including the "+" Square Button from Screenshot 155618.png!) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRightPaneOpen(true);
                setRightPaneTab('unity');
              }}
              className="px-2.5 py-1 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#303030] text-[11px] text-blue-300 flex items-center gap-1"
            >
              <Box className="w-3 h-3" />
              <span className="hidden sm:inline">Unity</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRightPaneOpen(true);
                setRightPaneTab('blender');
              }}
              className="px-2.5 py-1 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#303030] text-[11px] text-amber-300 flex items-center gap-1"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Blender</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPaneOpen(!rightPaneOpen)}
              className="p-1.5 rounded-lg text-[#9a9a9a] hover:text-white hover:bg-[#262626] border border-transparent hover:border-[#333]"
              title="Browser / App-Vorschau auf- und zuklappen (+)"
            >
              <Plus className="w-4 h-4 border border-[#777] rounded-[4px] p-0.5" />
            </button>
          </div>
        </div>

        {/* Chat Messages OR Empty State */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col">
          {!currentChat || currentChat.messages.length === 0 ? (
            /* EMPTY STATE ("Woran sollen wir in CloudKIApp arbeiten?" - Screenshot 155607.png & 155625.png) */
            <div className="my-auto flex flex-col items-center justify-center text-center relative">
              <div className="w-12 h-12 rounded-2xl bg-[#1e1e1e] border border-[#2c2c2c] flex items-center justify-center text-[#777] mb-4">
                <Terminal className="w-6 h-6" />
              </div>

              <h1 className="text-xl sm:text-2xl font-semibold text-white">
                Woran sollen wir in{' '}
                <button
                  type="button"
                  onClick={() => setProjectPopoverOpen(!projectPopoverOpen)}
                  className="dotted-underline hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {currentProject ? currentProject.name : 'diesem Workspace'}
                </button>{' '}
                arbeiten?
              </h1>

              {/* Project Selector Popover (1:1 Screenshot 155625.png) */}
              {projectPopoverOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setProjectPopoverOpen(false)}
                  />
                  <div className="mt-3 w-80 rounded-2xl bg-[#222222] border border-[#343434] shadow-2xl p-2 text-left z-40">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Projekte suchen"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#303030] text-xs text-white placeholder-[#777] focus:outline-none"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-0.5 py-1">
                      {projects
                        .filter((p) =>
                          p.name.toLowerCase().includes(projectSearch.toLowerCase())
                        )
                        .map((proj) => (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setProjectPopoverOpen(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2e2e2e] flex items-center justify-between text-xs text-[#e0e0e0]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Folder className="w-3.5 h-3.5 text-[#9a9a9a] shrink-0" />
                              <span className="truncate">{proj.name}</span>
                            </div>
                            {selectedProjectId === proj.id && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </button>
                        ))}
                    </div>

                    <div className="mt-1 pt-1 border-t border-[#303030] space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProjectPopoverOpen(false);
                          setNewProjectModalOpen(true);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#2c2c2c] hover:bg-[#363636] flex items-center gap-2 text-xs text-white font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Neues Projekt (Server-Ordner durchsuchen)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(null);
                          setProjectPopoverOpen(false);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2e2e2e] flex items-center gap-2 text-xs text-[#aaa]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Aufgaben ohne Projekt starten</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ACTIVE CHAT THREAD VIEW (1:1 Screenshot 155736.png) */
            <div className="max-w-3xl w-full mx-auto space-y-6 pb-6 relative">
              {currentChat.messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end">
                      <div className="max-w-[85%] rounded-2xl bg-[#113255] border border-[#1d4b7a] px-4 py-3 text-[13px] text-[#f0f6fc] leading-relaxed whitespace-pre-wrap shadow-md">
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 pr-1 text-[#777]">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="hover:text-white"
                          title="Kopieren"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-[13px] leading-relaxed text-[#ececec]">
                      {/* If this message was preceded by a cross-provider/account Context Handoff */}
                      {msg.handoffFrom && (
                        <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>
                              <strong>Nahtloser Modell-Wechsel im selben Chat:</strong> Kontext von{' '}
                              <em>{msg.handoffFrom.previousModel}</em> wurde an{' '}
                              <strong>
                                {msg.handoffFrom.newModel} ({msg.handoffFrom.newAccount})
                              </strong>{' '}
                              übergeben.
                            </span>
                          </div>
                        </div>
                      )}

                      {msg.thinkingText && (
                        <p className="text-[#e0e0e0]">{msg.thinkingText}</p>
                      )}

                      {/* Tool Execution Steps (1:1 Screenshot 155736.png) */}
                      {msg.toolSteps && msg.toolSteps.length > 0 && (
                        <div className="space-y-1.5 py-1">
                          {msg.toolSteps.map((step) => (
                            <details
                              key={step.id}
                              className="group rounded-lg bg-transparent hover:bg-[#1e1e1e] transition-colors"
                            >
                              <summary className="px-2 py-1 cursor-pointer list-none flex items-center gap-2 text-xs text-[#9a9a9a] hover:text-[#d4d4d4]">
                                {step.type === 'mcp' || step.type === 'unity' ? (
                                  <Wrench className="w-3.5 h-3.5 text-[#888] shrink-0" />
                                ) : step.type === 'image' ? (
                                  <Eye className="w-3.5 h-3.5 text-[#888] shrink-0" />
                                ) : step.type === 'handoff' ? (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                ) : (
                                  <Terminal className="w-3.5 h-3.5 text-[#888] shrink-0" />
                                )}
                                <span className="truncate">{step.title}</span>
                              </summary>
                              {(step.command || step.output || step.detail) && (
                                <div className="mt-1 ml-6 p-2.5 rounded-lg bg-[#121212] border border-[#282828] font-mono text-[11px] text-[#b0b0b0] space-y-1">
                                  {step.detail && <div>{step.detail}</div>}
                                  {step.command && (
                                    <div className="text-blue-300">$ {step.command}</div>
                                  )}
                                  {step.output && (
                                    <div className="text-[#888] whitespace-pre-wrap">
                                      {step.output}
                                    </div>
                                  )}
                                </div>
                              )}
                            </details>
                          ))}
                        </div>
                      )}

                      <p className="text-[#ececec] whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ====================================================================
            4. BOTTOM COMPOSER AREA (1:1 Screenshots 155633, 155639, 155644, 155649)
           ==================================================================== */}
        <div className="px-4 sm:px-8 pb-4 pt-1 max-w-3xl w-full mx-auto space-y-2.5 relative z-20">
          {/* Quota Exhausted Banner (1:1 Screenshot 155633.png + 1-Click Account Handoff!) */}
          {isCurrentAccountExhausted && (
            <div className="p-3.5 rounded-2xl bg-[#1f1f1f] border border-[#2e2e2e] flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="space-y-0.5 max-w-md">
                <div className="text-xs font-semibold text-white">
                  Dein Kontingent für Codex und Work ist aufgebraucht ({currentAccount?.label})
                </div>
                <div className="text-[11px] text-[#9a9a9a]">
                  Füge Credits hinzu oder upgrade deinen Plan – oder warte, bis dein Nutzungslimit am{' '}
                  {currentAccount?.quotas[0]?.resetAt || '18:26'} zurückgesetzt wird
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickQuotaSwitch('antigravity')}
                  className="px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow"
                  title="Wechselt im selben Chat nahtlos auf Antigravity Gemini 4 Argon"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mit Antigravity weitermachen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickQuotaSwitch('codex2')}
                  className="px-3 py-1.5 rounded-full bg-[#2b2b2b] hover:bg-[#363636] border border-[#3e3e3e] text-white text-xs font-medium"
                >
                  Codex #2 (85%)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsInitialTab('nutzung');
                    setSettingsOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#2c3440] hover:bg-[#36404f] text-white text-xs font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Upgraden</span>
                </button>
              </div>
            </div>
          )}

          {/* Context Pills Row right above Composer (`CloudKIApp` | `Dieser Computer`) */}
          <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-t-xl bg-[#1b1b1b] border-x border-t border-[#282828] text-xs text-[#cfcfcf]">
            <button
              type="button"
              onClick={() => setProjectPopoverOpen(!projectPopoverOpen)}
              className="flex items-center gap-1.5 hover:text-white"
            >
              <Folder className="w-3.5 h-3.5 text-[#9a9a9a]" />
              <span className="font-medium">
                {currentProject ? currentProject.name : 'Ohne Projekt'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="flex items-center gap-1.5 hover:text-white"
            >
              <Monitor className="w-3.5 h-3.5 text-[#9a9a9a]" />
              <span>
                Dieser Computer ({serverConfig.hardware.hostname} •{' '}
                {serverConfig.hardware.hasDedicatedGpu ? 'GPU' : 'VPS LLVMpipe'})
              </span>
            </button>

            {planModeActive && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px]">
                💡 Planmodus aktiv
              </span>
            )}
            {goalText && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px]">
                🎯 Ziel: {goalText}
              </span>
            )}
          </div>

          {/* Main Input Card */}
          <div className="rounded-2xl bg-[#212121] border border-[#303030] p-3 shadow-xl relative">
            {/* Attached files/sketches */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#2c2c2c] border border-[#3a3a3a] text-xs text-white flex items-center gap-1.5"
                  >
                    <Paperclip className="w-3 h-3 text-blue-400" />
                    <span>{att.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-[#888] hover:text-white ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <textarea
              rows={2}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                currentChat
                  ? `Mit ${currentModel.name} (${currentModel.accountLabel}) arbeiten...`
                  : 'Leg einfach los (z.B. „Installiere Blender und erstelle ein Waffenmodell“ oder „Öffne Unity“)'
              }
              className="w-full bg-transparent text-sm text-white placeholder-[#777] resize-none focus:outline-none"
            />

            {/* Bottom Controls Bar inside Composer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {/* Left: "+" Button & Permission Mode Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(!plusMenuOpen);
                    setPermMenuOpen(false);
                    setModelMenuOpen(false);
                    setEffortMenuOpen(false);
                  }}
                  className="w-7 h-7 rounded-full hover:bg-[#2e2e2e] flex items-center justify-center text-[#cfcfcf] hover:text-white transition-colors"
                  title="Dateien, Skills & Plugins hinzufügen (+)"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPermMenuOpen(!permMenuOpen);
                    setPlusMenuOpen(false);
                    setModelMenuOpen(false);
                    setEffortMenuOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-full hover:bg-[#2b2b2b] flex items-center gap-1.5 text-xs font-medium transition-colors ${permBadge.color}`}
                >
                  <PermIcon className="w-3.5 h-3.5" />
                  <span>{permBadge.label}</span>
                </button>
              </div>

              {/* Right: Model Selector + Effort Selector + Mic + Send Button */}
              <div className="flex items-center gap-1.5">
                {/* Model Selector Button */}
                <button
                  type="button"
                  onClick={handleOpenModelMenu}
                  className="px-2.5 py-1 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>{currentModel.name}</span>
                  <span className="text-[10px] font-normal text-[#9a9a9a]">
                    ({currentModel.accountLabel.split(' ')[0]} #{currentAccount?.index})
                  </span>
                </button>

                {/* Effort Level Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEffortMenuOpen(!effortMenuOpen);
                    setModelMenuOpen(false);
                    setPlusMenuOpen(false);
                    setPermMenuOpen(false);
                  }}
                  className="px-2 py-1 rounded-full hover:bg-[#2c2c2c] text-xs text-[#9a9a9a] hover:text-white flex items-center gap-1"
                >
                  <span>{effort}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-full text-[#9a9a9a] hover:text-white hover:bg-[#2c2c2c]"
                  title="Spracheingabe"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="w-7 h-7 rounded-full bg-[#2b5b9e] hover:bg-[#3b82f6] text-white flex items-center justify-center transition-colors shadow"
                  title="Senden"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/*Hidden file input for "+ -> Dateien und Ordner" */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAttachments((prev) => [
                  ...prev,
                  ...files.map((f) => ({ name: f.name, type: f.type || 'file' })),
                ]);
              }}
            />

            {/* ================================================================
                POPOVER 1: PLUS (+) MENU (1:1 Screenshot 155644.png)
               ================================================================ */}
            {plusMenuOpen && (
              <div className="absolute bottom-14 left-2 w-full max-w-md rounded-2xl bg-[#252525]/98 backdrop-blur-xl border border-[#363636] shadow-2xl p-2 text-xs z-50 space-y-1 max-h-80 overflow-y-auto">
                <div className="px-3 py-1 text-[11px] font-medium text-[#8a8a8a]">
                  Hinzufügen
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white"
                >
                  <Paperclip className="w-4 h-4 text-[#b4b4b4]" />
                  <span className="font-medium">Dateien und Ordner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    handleQuickQuotaSwitch('antigravity');
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Antigravity anhängen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setProjectPopoverOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white"
                >
                  <Folder className="w-4 h-4 text-[#b4b4b4]" />
                  <div>
                    <span className="font-medium">In einem Projekt arbeiten</span>
                    <span className="text-[#8a8a8a] ml-2">
                      Projekt für neue Chats auswählen
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    const g = prompt('Ziel für diesen Chat festlegen:', 'Granatenanimation & Waffenmodell fertigstellen');
                    if (g) setGoalText(g);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white"
                >
                  <Target className="w-4 h-4 text-[#b4b4b4]" />
                  <div>
                    <span className="font-medium">Ziel</span>
                    <span className="text-[#8a8a8a] ml-2">
                      Ein Ziel zum Weiterverfolgen festlegen
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlanModeActive(!planModeActive);
                    setPlusMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-medium">Planmodus</span>
                    <span className="text-[#8a8a8a] ml-2">Planmodus einschalten</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setSketchModalOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white"
                >
                  <PenTool className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-medium">Zeichnen</span>
                    <span className="text-[#8a8a8a] ml-2">Skizze zeichnen</span>
                  </div>
                </button>

                <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-[#8a8a8a]">
                  Plugins & Server-Apps
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setRightPaneOpen(true);
                    setRightPaneTab('unity');
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white text-left"
                >
                  <Box className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="font-medium">Unity installieren & Fenster anzeigen</span>
                    <span className="text-[#8a8a8a] ml-2">
                      Single-Window Stream + MCP Bridge
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setRightPaneOpen(true);
                    setRightPaneTab('blender');
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white text-left"
                >
                  <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-medium">Blender installieren & 3D-Viewport</span>
                    <span className="text-[#8a8a8a] ml-2">
                      KI-Waffenmodelle in Blender bauen
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setAttachments((prev) => [
                      ...prev,
                      { name: 'Plugin: Cloud Environment', type: 'plugin' },
                    ]);
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#323232] flex items-center gap-3 text-white text-left"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-medium">Cloud Environment</span>
                    <span className="text-[#8a8a8a] ml-2">
                      Understand your cloud runtime and configured credentials
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* ================================================================
                POPOVER 2: PERMISSIONS MENU (1:1 Screenshot 155649.png)
               ================================================================ */}
            {permMenuOpen && (
              <div className="absolute bottom-14 left-8 w-full max-w-md rounded-2xl bg-[#252525]/98 backdrop-blur-xl border border-[#363636] shadow-2xl p-3 text-xs z-50 space-y-2">
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[#9a9a9a] font-medium">
                    Wie sollen ChatGPT-Aktionen genehmigt werden?
                  </span>
                  <span className="text-[#9a9a9a] underline cursor-pointer">
                    Mehr erfahren
                  </span>
                </div>

                {[
                  {
                    id: 'ask' as PermissionMode,
                    title: 'Genehmigung anfordern',
                    desc: 'Zum Bearbeiten externer Dateien und für die Internetnutzung immer nachfragen',
                    icon: Hand,
                    color: 'text-white',
                  },
                  {
                    id: 'auto_safe' as PermissionMode,
                    title: 'Für mich genehmigen',
                    desc: 'Nur bei potenziell unsicheren Aktionen nachfragen',
                    icon: ShieldCheck,
                    color: 'text-white',
                  },
                  {
                    id: 'full_access' as PermissionMode,
                    title: 'Vollzugriff',
                    desc: 'Uneingeschränkter Zugriff auf das Internet und alle Dateien auf deinem Computer',
                    icon: ShieldAlert,
                    color: 'text-[#e67e45]',
                  },
                  {
                    id: 'restricted' as PermissionMode,
                    title: 'Eingeschränkter Zugriff',
                    desc: 'Eingeschränkter Zugriff auf das Internet und alle Dateien auf deinem Computer',
                    icon: Lock,
                    color: 'text-amber-300',
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = permissionMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPermissionMode(opt.id);
                        setPermMenuOpen(false);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-[#303030] flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${opt.color}`} />
                        <div>
                          <div className={`font-semibold ${opt.color}`}>{opt.title}</div>
                          <div className="text-[11px] text-[#9a9a9a]">{opt.desc}</div>
                        </div>
                      </div>
                      {selected && <Check className={`w-4 h-4 shrink-0 ${opt.color}`} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ================================================================
                POPOVER 3: LIVE PER-ACCOUNT MODEL SELECTOR (Screenshot 155639.png)
               ================================================================ */}
            {modelMenuOpen && (
              <div className="absolute bottom-14 right-12 w-80 rounded-2xl bg-[#222222]/98 backdrop-blur-xl border border-[#353535] shadow-2xl p-3 text-xs z-50 space-y-2 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[#9a9a9a] font-medium">Modell auswählen</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <RefreshCw
                      className={`w-3 h-3 ${discoveringModels ? 'animate-spin' : ''}`}
                    />
                    {discoveringModels ? 'Prüfe Accounts...' : `Live: ${lastModelCheck}`}
                  </span>
                </div>

                <div className="px-1 py-1">
                  <div className="font-semibold text-white">Standard</div>
                  <div className="text-[11px] text-[#888]">
                    Empfohlene Modellauswahl (getrennt nach verbundenen Accounts)
                  </div>
                </div>

                {/* Grouped by each connected Account! */}
                {accounts.map((acc) => (
                  <div key={acc.id} className="space-y-1 pt-1.5 border-t border-[#2f2f2f]">
                    <div className="px-2 flex items-center justify-between text-[11px] font-semibold text-blue-300">
                      <span>{acc.label}</span>
                      <span className="text-[10px] text-[#888]">
                        5h: {acc.quotas[0]?.percentRemaining ?? 100}%
                      </span>
                    </div>
                    {acc.models.map((m) => {
                      const isSel = m.id === currentModel.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectModel(m)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[#303030] flex items-center justify-between text-left transition-colors"
                        >
                          <span className="font-semibold text-white text-[13px]">
                            {m.name}
                          </span>
                          {isSel && <Check className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* ================================================================
                POPOVER 4: EFFORT SLIDER (1:1 Screenshot 155633.png)
               ================================================================ */}
            {effortMenuOpen && (
              <div className="absolute bottom-14 right-4 w-64 rounded-2xl bg-[#232323]/98 backdrop-blur-xl border border-[#353535] shadow-2xl p-4 text-xs z-50 space-y-3">
                <div className="flex items-center justify-between">
                  <Zap className="w-4 h-4 text-[#888]" />
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold text-sm">{effort}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setEffortMenuOpen(false);
                        handleOpenModelMenu();
                      }}
                      className="text-[11px] text-[#9a9a9a] hover:text-white"
                    >
                      {currentModel.name} ›
                    </button>
                  </div>
                  <RefreshCw className="w-3.5 h-3.5 text-[#888]" />
                </div>

                {/* Blue Segmented Slider matching Screenshot 155633.png */}
                <div className="relative h-7 rounded-full bg-[#333333] p-1 flex items-center justify-between px-3">
                  <div
                    className="absolute left-1 top-1 bottom-1 rounded-full bg-[#3b82f6] transition-all"
                    style={{
                      width: `${((currentEffortIdx + 1) / effortLevels.length) * 95}%`,
                    }}
                  />
                  {effortLevels.map((lvl, idx) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEffort(lvl)}
                      className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center"
                      title={lvl}
                    >
                      {idx === currentEffortIdx ? (
                        <span className="w-5 h-5 rounded-full bg-white shadow-md block" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 block" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================
          5. RIGHT SPLIT-SCREEN WORKSPACE (Browser / Unity / Blender / SSH)
         ====================================================================== */}
      <RightSplitWorkspace
        isOpen={rightPaneOpen}
        activeTab={rightPaneTab}
        onTabChange={setRightPaneTab}
        onClose={() => setRightPaneOpen(false)}
        hardware={serverConfig.hardware}
        unityApp={remoteApps.unity}
        blenderApp={remoteApps.blender}
        aiCursor={aiCursor}
        onTriggerAiBrowserDemo={triggerAiBrowserDemo}
        onInstallApp={async (appId) => {
          setRemoteApps((prev) => ({
            ...prev,
            [appId]: {
              ...prev[appId],
              installing: true,
              installProgress: 20,
              installStepText: serverConfig.hardware.hasDedicatedGpu
                ? 'Hardware-GPU erkannt -> Richte VirtualGL Stream ein...'
                : 'VPS ohne GPU erkannt -> Aktiviere Xvfb + Mesa LLVMpipe CPU-Rendering...',
            },
          }));
          try {
            await fetch(`/api/apps/${appId}/install`, { method: 'POST' });
          } catch {
            // Standalone iPad simulation
          }
          setTimeout(() => {
            setRemoteApps((prev) => ({
              ...prev,
              [appId]: {
                ...prev[appId],
                installing: false,
                installed: true,
                installProgress: 100,
              },
            }));
          }, 2200);
        }}
        onUpdateApp={(appId, payload) => {
          setRemoteApps((prev) => ({
            ...prev,
            [appId]: {
              ...prev[appId],
              ...(payload.version ? { version: String(payload.version) } : {}),
              ...(payload.prompt ? { lastAiAction: String(payload.prompt) } : {}),
            },
          }));
        }}
        onSendPromptFromApp={(p) => handleSendMessage(p)}
        onExecTerminal={async (cmd) => {
          try {
            const res = await fetch('/api/terminal/exec', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: cmd }),
            });
            if (res.ok) {
              const d = await res.json();
              return d.output;
            }
          } catch {
            // Standalone iPad fallback
          }
          if (cmd === 'nvidia-smi') {
            return serverConfig.hardware.hasDedicatedGpu
              ? 'GPU 0: NVIDIA Tesla T4 (16GB VRAM) - VirtualGL Hardware Rendering Active'
              : 'Keine dedizierte GPU verbaut -> Mesa LLVMpipe (CPU Software OpenGL 4.5) aktiv.';
          }
          return `[${serverConfig.hardware.hostname}]# ${cmd}\nOK (${serverConfig.hardware.renderBackend})`;
        }}
      />

      {/* ======================================================================
          MODALS & OVERLAYS (Onboarding, Profile, Settings, Sketch, New Project, Pet)
         ====================================================================== */}
      <ProfilePopover
        isOpen={profileMenuOpen}
        userProfile={userProfile}
        accounts={accounts}
        onClose={() => setProfileMenuOpen(false)}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'allgemein');
          setSettingsOpen(true);
        }}
        onTogglePet={() => setShowPet(!showPet)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        initialTab={settingsInitialTab}
        userProfile={userProfile}
        serverConfig={serverConfig}
        accounts={accounts}
        onClose={() => setSettingsOpen(false)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onToggleGpuMode={(hasGpu) => {
          setServerConfig((prev) => ({
            ...prev,
            hardware: {
              ...prev.hardware,
              hasDedicatedGpu: hasGpu,
              gpuName: hasGpu ? 'NVIDIA Tesla T4 (16 GB)' : null,
              renderBackend: hasGpu
                ? 'NVIDIA VirtualGL / Hardware GPU'
                : 'Mesa LLVMpipe (CPU Software Rendering)',
            },
          }));
        }}
      />

      <OnboardingModal
        isOpen={onboardingOpen}
        userProfile={userProfile}
        serverConfig={serverConfig}
        accounts={accounts}
        onConnectServer={async ({ host, port, username, password, simulateGpu }) => {
          try {
            const res = await fetch('/api/server/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host, port, username, password, simulateGpu }),
            });
            if (res.ok) {
              const data = await res.json();
              setServerConfig(data.serverConfig);
              return;
            }
          } catch {
            // Standalone iPad mode
          }
          setServerConfig((prev) => ({
            ...prev,
            host,
            port,
            username,
            connected: true,
            hardware: {
              ...prev.hardware,
              hostname: `vps-${username || 'root'}`,
              hasDedicatedGpu: simulateGpu,
              gpuName: simulateGpu ? 'NVIDIA Tesla T4 (16 GB)' : null,
              renderBackend: simulateGpu
                ? 'NVIDIA VirtualGL / Hardware GPU'
                : 'Mesa LLVMpipe (CPU Software Rendering)',
            },
          }));
        }}
        onConfigureAccounts={async ({ username, codexCount, antigravityCount, opencodeCount }) => {
          try {
            const res = await fetch('/api/onboarding/configure-accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, codexCount, antigravityCount, opencodeCount }),
            });
            if (res.ok) {
              const data = await res.json();
              setUserProfile(data.userProfile);
              setAccounts(data.providerAccounts);
              return;
            }
          } catch {
            // Standalone iPad fallback
          }
          setUserProfile((p) => ({
            ...p,
            username,
            initials: username.slice(0, 2).toUpperCase(),
          }));
        }}
        onVerifyAccount={async (accountId) => {
          try {
            await fetch(`/api/accounts/${accountId}/verify-login`, { method: 'POST' });
          } catch {
            // ignore
          }
          setAccounts((prev) =>
            prev.map((a) => (a.id === accountId ? { ...a, status: 'authenticated' } : a))
          );
        }}
        onComplete={async () => {
          setAccounts((prev) => prev.map((a) => ({ ...a, status: 'authenticated' })));
          setUserProfile((p) => ({ ...p, onboardingCompleted: true }));
          setOnboardingOpen(false);
        }}
        onClose={() => setOnboardingOpen(false)}
      />

      <SketchModal
        isOpen={sketchModalOpen}
        onClose={() => setSketchModalOpen(false)}
        onAttachSketch={(name) =>
          setAttachments((prev) => [...prev, { name, type: 'sketch' }])
        }
      />

      {/* New Project / Server Folder Browser Modal */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1f1f1f] border border-[#333] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Neues Projekt / Server-Ordner auswählen
              </h3>
              <button
                onClick={() => setNewProjectModalOpen(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9a9a9a] mb-1">Projektname</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setNewProjectPath(`/root/projects/${e.target.value}`);
                  }}
                  placeholder="z.B. MyUnityShooter"
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-white"
                />
              </div>
              <div>
                <label className="block text-[#9a9a9a] mb-1">Pfad auf dem Linux-Server</label>
                <input
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewProjectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-xs text-white"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newProjectName.trim()) return;
                  const created: ProjectFolder = {
                    id: `proj-${Date.now()}`,
                    name: newProjectName.trim(),
                    serverPath: newProjectPath.trim(),
                  };
                  setProjects((prev) => [created, ...prev]);
                  setSelectedProjectId(created.id);
                  setSelectedChatId(null);
                  setNewProjectName('');
                  setNewProjectModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-medium text-white"
              >
                Projekt anlegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Mini-Pet ("Pet anzeigen" from Screenshot 155653.png) */}
      {showPet && (
        <div
          onClick={() => setShowPet(false)}
          className="fixed bottom-4 right-6 z-50 px-3 py-2 rounded-2xl bg-[#222] border border-blue-500/40 shadow-2xl flex items-center gap-2 cursor-pointer animate-bounce"
          title="Klicken zum Ausblenden"
        >
          <span className="text-lg">👾</span>
          <span className="text-xs text-blue-300 font-medium">Bridge-Pet aktiv!</span>
        </div>
      )}
    </div>
  );
}
export default App;
