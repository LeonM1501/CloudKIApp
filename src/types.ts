export type ProviderType = 'codex' | 'antigravity' | 'opencode';

export type PermissionMode =
  | 'ask'          // Genehmigung anfordern (Zum Bearbeiten externer Dateien und für die Internetnutzung immer nachfragen)
  | 'auto_safe'    // Für mich genehmigen (Nur bei potenziell unsicheren Aktionen nachfragen)
  | 'full_access'  // Vollzugriff (Uneingeschränkter Zugriff auf das Internet und alle Dateien auf deinem Computer)
  | 'restricted';  // Eingeschränkter Zugriff (Eingeschränkter Zugriff auf das Internet und alle Dateien auf deinem Computer)

export type EffortLevel = 'Niedrig' | 'Mittel' | 'Hoch' | 'Max';

export interface QuotaMetric {
  label: string;           // e.g. "5 Std." or "Wöchentlich" or "Gemini • 5 Std."
  percentRemaining: number; // 0..100
  resetAt: string;         // e.g. "18:26" or "4. Nov."
  modelGroup?: string;     // e.g. "Codex & Work", "Gemini", "Claude"
}

export interface ModelOption {
  id: string;
  name: string;            // e.g. "GPT-6.1 Terra", "GPT-6.1 Sol", "Gemini 4 Argon", "Claude 4.5 Sonnet"
  provider: ProviderType;
  accountId: string;
  accountLabel: string;    // e.g. "Codex #1 (Haupt)", "Antigravity #2"
  description?: string;
  isDefault?: boolean;
  available: boolean;
  quotaPercent: number;
  supportsEffort: boolean;
}

export interface ProviderAccount {
  id: string;
  provider: ProviderType;
  index: number;           // 1, 2, 3...
  label: string;           // e.g. "Codex Account #1", "Antigravity Account #1"
  usernameOrEmail: string;
  status: 'unauthenticated' | 'pending_device_code' | 'authenticated';
  deviceCode?: string;     // e.g. "K9X4-7M2P"
  authUrl?: string;        // e.g. "https://auth.openai.com/device"
  quotas: QuotaMetric[];
  models: ModelOption[];
}

export interface HardwareProfile {
  detected: boolean;
  isSimulatedVps: boolean;
  hostname: string;
  os: string;
  cpuModel: string;
  cpuCores: number;
  ramTotalGb: number;
  hasDedicatedGpu: boolean;
  gpuName: string | null;
  gpuVramGb: number | null;
  renderBackend: 'NVIDIA VirtualGL / Hardware GPU' | 'Mesa LLVMpipe (CPU Software Rendering)';
  displayProtocol: 'Xpra / KasmVNC Single-Window (Rootless)';
  driverFlags: string;
}

export interface ServerConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  useSimulatedVps?: boolean;
  connected: boolean;
  lastConnectedAt?: string;
  hardware: HardwareProfile;
}

export interface UserProfile {
  username: string;        // e.g. "xLeonTTV"
  handle: string;          // e.g. "@leonm1501"
  initials: string;        // e.g. "XL"
  avatarColor: string;     // e.g. "#b08d57"
  planName: string;        // e.g. "Plus"
  onboardingCompleted: boolean;
  stats: {
    totalTokens: string;   // "3,1 Mrd."
    peakTokens: string;    // "204 Mio."
    longestTask: string;   // "2 Std. 48 Min."
    longestStreak: string; // "25 Tage"
    currentStreak: string; // "25 Tage"
  };
}

export interface ToolExecutionStep {
  id: string;
  type: 'mcp' | 'command' | 'image' | 'file' | 'browser' | 'handoff' | 'unity' | 'blender';
  title: string;
  detail?: string;
  command?: string;
  output?: string;
  status: 'running' | 'done' | 'error';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: ProviderType;
  accountId?: string;
  accountLabel?: string;
  modelName?: string;
  effort?: EffortLevel;
  thinkingText?: string;
  toolSteps?: ToolExecutionStep[];
  attachments?: { name: string; type: string; size?: string }[];
  handoffFrom?: {
    previousModel: string;
    previousAccount: string;
    newModel: string;
    newAccount: string;
  };
}

export interface ChatThread {
  id: string;
  title: string;
  projectId: string | null; // null = Ohne Projekt / Angeheftet
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  hasWarning?: boolean;
  activeAccountId: string;
  activeModelId: string;
  effort: EffortLevel;
  permissionMode: PermissionMode;
  messages: ChatMessage[];
  outputs?: { title: string; type: string; path: string }[];
  sources?: { name: string; type: string }[];
}

export interface ProjectFolder {
  id: string;
  name: string;
  serverPath: string;
  pinned?: boolean;
}

export interface BrowserAiCursor {
  visible: boolean;
  x: number; // 0..100 percentage
  y: number; // 0..100 percentage
  action: 'idle' | 'moving' | 'clicking' | 'typing' | 'scrolling' | 'analyzing';
  label: string;
}

export interface RemoteAppStatus {
  id: 'unity' | 'blender';
  name: string;
  installed: boolean;
  installing: boolean;
  installProgress: number;
  installStepText: string;
  running: boolean;
  version: string;
  availableVersions: string[];
  loggedInUser: string | null;
  windowTitle: string;
  renderMode: string;
  fps: number;
  currentProject: string | null;
  activeSceneOrModel: string;
  lastAiAction: string | null;
}
