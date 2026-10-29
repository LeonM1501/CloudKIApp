export type Provider = "codex" | "opencode" | "antigravity";
export type Permission = "ask" | "workspace" | "read-only" | "full";
export type AppId = "browser" | "blender" | "unity" | `desktop-${string}`;
export interface DesktopApp { id: AppId; name: string; desktopId?: string }
export interface Model {
  id: string;
  name: string;
  efforts?: string[];
}
export interface Quota {
  label: string;
  remaining: number;
  resetsAt: number | null;
}
export interface Account {
  id: string;
  provider: Provider;
  label: string;
  status: "disconnected" | "ready" | "authenticated" | "error";
  identity?: string;
  error?: string;
  checkedAt?: string;
  models: Model[];
  quotas: Quota[];
  quotaError?: string;
  login?: { url: string; code: string };
}
export interface Connection {
  host: string;
  port: number;
  username: string;
  fingerprint: string;
  connected: boolean;
  home?: string;
  hardware?: string;
}
export interface Attachment {
  name: string;
  path: string;
  size: number;
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  accountId?: string;
  model?: string;
  attachments?: Attachment[];
  status?: "running" | "complete" | "failed" | "cancelled";
  error?: string;
  events?: { id: string; title: string; detail: string; status?: string }[];
  tokens?: number;
}
export interface Chat {
  id: string;
  title: string;
  projectId: string | null;
  pinned: boolean;
  messages: Message[];
  updatedAt: string;
  /** Optionaler, vom Besitzer vorgegebener Kontext für Spezialchats. */
  systemPrompt?: string;
  kind?: "update-assistant";
}
export interface Project {
  id: string;
  name: string;
  path: string;
  repository?: string;
  branch?: string;
  syncing?: boolean;
  syncError?: string;
}
export interface State {
  version: 2;
  profile: { username: string; onboardingComplete: boolean };
  connection: Connection | null;
  accounts: Account[];
  projects: Project[];
  chats: Chat[];
}
export interface Approval {
  id: string;
  chatId: string;
  title: string;
  detail: string;
  options: { id: string; name: string }[];
}
export const PROVIDERS: Record<Provider, string> = {
  codex: "Codex",
  opencode: "OpenCode",
  antigravity: "Antigravity",
};
