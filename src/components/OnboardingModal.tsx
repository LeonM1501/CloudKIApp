import React, { useState } from 'react';
import {
  Server,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Terminal,
  User,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { ProviderAccount, ServerConnectionConfig, UserProfile } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  userProfile: UserProfile;
  serverConfig: ServerConnectionConfig;
  accounts: ProviderAccount[];
  onConnectServer: (data: {
    host: string;
    port: number;
    username: string;
    password?: string;
    simulateGpu: boolean;
  }) => Promise<void>;
  onConfigureAccounts: (data: {
    username: string;
    codexCount: number;
    antigravityCount: number;
    opencodeCount: number;
  }) => Promise<void>;
  onVerifyAccount: (accountId: string) => Promise<void>;
  onComplete: () => Promise<void>;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  userProfile,
  serverConfig,
  accounts,
  onConnectServer,
  onConfigureAccounts,
  onVerifyAccount,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [appUsername, setAppUsername] = useState(userProfile.username || 'xLeonTTV');
  const [sshHost, setSshHost] = useState(serverConfig.host || '168.119.42.108');
  const [sshPort, setSshPort] = useState(serverConfig.port || 22);
  const [sshUser, setSshUser] = useState(serverConfig.username || 'root');
  const [sshPassword, setSshPassword] = useState('••••••••••••');
  const [simulateGpu, setSimulateGpu] = useState(serverConfig.hardware.hasDedicatedGpu);
  const [connecting, setConnecting] = useState(false);
  const [hardwareChecked, setHardwareChecked] = useState(false);

  // Step 2: Provider selection & account counts
  const [useCodex, setUseCodex] = useState(true);
  const [codexCount, setCodexCount] = useState(2);
  const [useAntigravity, setUseAntigravity] = useState(true);
  const [antigravityCount, setAntigravityCount] = useState(3);
  const [useOpenCode, setUseOpenCode] = useState(true);
  const [opencodeCount, setOpencodeCount] = useState(1);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleServerConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await onConnectServer({
        host: sshHost,
        port: Number(sshPort) || 22,
        username: sshUser,
        password: sshPassword,
        simulateGpu,
      });
      setHardwareChecked(true);
    } finally {
      setConnecting(false);
    }
  };

  const handleProceedToLogins = async () => {
    await onConfigureAccounts({
      username: appUsername,
      codexCount: useCodex ? codexCount : 0,
      antigravityCount: useAntigravity ? antigravityCount : 0,
      opencodeCount: useOpenCode ? opencodeCount : 0,
    });
    setStep(3);
  };

  const copyCode = (id: string, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const allAuthenticated =
    accounts.length > 0 && accounts.every((a) => a.status === 'authenticated');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Progress Header */}
        <div className="px-6 py-4 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Cloud-GPTX-Antigravity Bridge • Einrichtung
              </h2>
              <p className="text-xs text-[#9a9a9a]">
                Schritt {step} von 3:{' '}
                {step === 1
                  ? 'Profil & SSH-Server verbinden (inkl. GPU/VPS-Check)'
                  : step === 2
                  ? 'KI-Clients & Account-Anzahl auswählen'
                  : 'Accounts per Device-Code anmelden'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s as 1 | 2 | 3)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : step > s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#262626] text-[#888]'
                }`}
              >
                {s}
              </button>
            ))}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 px-2.5 py-1 rounded-lg text-xs text-[#9a9a9a] hover:text-white hover:bg-[#262626]"
              >
                Schließen
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === 1 && (
            <form onSubmit={handleServerConnect} className="space-y-4">
              {/* App Profile Username */}
              <div className="p-4 rounded-xl bg-[#212121] border border-[#2e2e2e] space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Dein App-Profil & Benutzername</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#9a9a9a] mb-1">
                      Account-Username (wird links unten angezeigt)
                    </label>
                    <input
                      type="text"
                      value={appUsername}
                      onChange={(e) => setAppUsername(e.target.value)}
                      placeholder="z.B. xLeonTTV"
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#181818] border border-[#2b2b2b] w-full">
                      <div className="w-8 h-8 rounded-full bg-[#b08d57] text-black font-bold text-xs flex items-center justify-center">
                        {(appUsername || 'XL').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-xs">
                        <div className="font-medium text-white">{appUsername || 'xLeonTTV'}</div>
                        <div className="text-[#888]">Cloud Bridge Plus</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SSH Server Details */}
              <div className="p-4 rounded-xl bg-[#212121] border border-[#2e2e2e] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>Linux-Server / VPS verbinden (SSH)</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    SSH2 Bridge
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-[#9a9a9a] mb-1">SSH-IP / Hostname</label>
                    <input
                      type="text"
                      value={sshHost}
                      onChange={(e) => setSshHost(e.target.value)}
                      placeholder="z.B. 168.119.42.108"
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9a9a9a] mb-1">SSH-Port</label>
                    <input
                      type="number"
                      value={sshPort}
                      onChange={(e) => setSshPort(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#9a9a9a] mb-1">Benutzername</label>
                    <input
                      type="text"
                      value={sshUser}
                      onChange={(e) => setSshUser(e.target.value)}
                      placeholder="root"
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9a9a9a] mb-1">Passwort</label>
                    <input
                      type="password"
                      value={sshPassword}
                      onChange={(e) => setSshPassword(e.target.value)}
                      placeholder="SSH Passwort"
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* GPU vs VPS Mode Toggle for Testing */}
                <div className="pt-2 border-t border-[#2d2d2d] flex items-center justify-between gap-4">
                  <div className="text-xs text-[#aaa]">
                    <span className="font-medium text-white">Hardware-Erkennung:</span> Die Bridge prüft automatisch via{' '}
                    <code className="text-blue-300">nvidia-smi</code> & <code className="text-blue-300">/dev/dri</code>, ob eine Grafikkarte verbaut ist, und nutzt sonst automatisch{' '}
                    <span className="text-emerald-400">Mesa LLVMpipe (CPU-Rendering)</span> für Unity & Blender.
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer shrink-0 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#333]">
                    <input
                      type="checkbox"
                      checked={simulateGpu}
                      onChange={(e) => setSimulateGpu(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>Server hat dedizierte GPU</span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    disabled={connecting}
                    className="px-4 py-2 rounded-xl bg-[#2c2c2c] hover:bg-[#383838] text-white text-xs font-medium border border-[#3d3d3d] transition-colors flex items-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-blue-400" />
                    {connecting ? 'Prüfe Server & GPU...' : 'Server testen & Hardware erkennen'}
                  </button>

                  {hardwareChecked && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Verbunden mit {serverConfig.hardware.hostname}
                    </span>
                  )}
                </div>
              </div>

              {/* Hardware Detection Result Box */}
              <div className="p-4 rounded-xl bg-[#161f2c] border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                    <Cpu className="w-4 h-4" />
                    <span>Erkannte Server-Grafik & Display-Pipeline</span>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      serverConfig.hardware.hasDedicatedGpu
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {serverConfig.hardware.hasDedicatedGpu
                      ? `Hardware-GPU aktiv (${serverConfig.hardware.gpuName})`
                      : 'Reiner VPS ohne GPU -> Mesa LLVMpipe CPU-Modus aktiv'}
                  </span>
                </div>
                <p className="text-xs text-[#b8c4d4]">
                  • <strong>Render-Backend:</strong> {serverConfig.hardware.renderBackend}
                  <br />• <strong>App-Streaming (Unity & Blender):</strong> {serverConfig.hardware.displayProtocol} (zeigt dir nur das App-Fenster statt des Server-Desktops!)
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <span>Weiter zur Client- & Account-Auswahl</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-[#aaa]">
                Wähle aus, welche KI-Clients im Hintergrund auf deinem Server als Bridge laufen sollen, und gib an, wie viele Accounts du jeweils verbinden möchtest:
              </p>

              {/* Codex Card */}
              <div
                className={`p-4 rounded-xl border transition-colors ${
                  useCodex
                    ? 'bg-[#212121] border-blue-500/50'
                    : 'bg-[#181818] border-[#2b2b2b] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCodex}
                      onChange={(e) => setUseCodex(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">OpenAI Codex CLI / App Bridge</div>
                      <div className="text-xs text-[#9a9a9a]">
                        Modelle: GPT-6.1 Terra, GPT-6.1 Sol, GPT-6 Astra, GPT-6 Sol, GPT-5.6...
                      </div>
                    </div>
                  </label>
                  {useCodex && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#aaa]">Accounts:</span>
                      <select
                        value={codexCount}
                        onChange={(e) => setCodexCount(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#383838] text-xs text-white"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Account' : 'Accounts'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Antigravity Card */}
              <div
                className={`p-4 rounded-xl border transition-colors ${
                  useAntigravity
                    ? 'bg-[#212121] border-purple-500/50'
                    : 'bg-[#181818] border-[#2b2b2b] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAntigravity}
                      onChange={(e) => setUseAntigravity(e.target.checked)}
                      className="w-4 h-4 accent-purple-500 rounded"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">Google Antigravity (agy) Bridge</div>
                      <div className="text-xs text-[#9a9a9a]">
                        Modelle: Gemini 4 Argon (High), Gemini 3.1 Pro, Claude 4.5 Sonnet, Claude 4.5 Opus (einzelne Limits pro Modellgruppe)
                      </div>
                    </div>
                  </label>
                  {useAntigravity && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#aaa]">Accounts:</span>
                      <select
                        value={antigravityCount}
                        onChange={(e) => setAntigravityCount(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#383838] text-xs text-white"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Account' : 'Accounts'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* OpenCode Card */}
              <div
                className={`p-4 rounded-xl border transition-colors ${
                  useOpenCode
                    ? 'bg-[#212121] border-emerald-500/50'
                    : 'bg-[#181818] border-[#2b2b2b] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useOpenCode}
                      onChange={(e) => setUseOpenCode(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">OpenCode Client Bridge</div>
                      <div className="text-xs text-[#9a9a9a]">
                        Modelle: OpenCode Claude Sonnet 4, DeepSeek R2 Coder, Qwen 3 235B Coder
                      </div>
                    </div>
                  </label>
                  {useOpenCode && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#aaa]">Accounts:</span>
                      <select
                        value={opencodeCount}
                        onChange={(e) => setOpencodeCount(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#383838] text-xs text-white"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Account' : 'Accounts'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl bg-[#262626] hover:bg-[#303030] text-xs text-white"
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={handleProceedToLogins}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2"
                >
                  <span>Okay • Jetzt Accounts anmelden</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
                <strong>Anmeldung auf dem Server:</strong> Öffne für jeden Account die angegebene Website, gib den einmaligen Device-Code ein und klicke auf{' '}
                <em>„Anmeldung prüfen / Fertig“</em>. Alle Accounts laufen danach isoliert parallel auf der Bridge.
              </div>

              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const isDone = acc.status === 'authenticated';
                  return (
                    <div
                      key={acc.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-[#212121] border-[#333]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              acc.provider === 'codex'
                                ? 'bg-blue-500/20 text-blue-300'
                                : acc.provider === 'antigravity'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {acc.provider}
                          </span>
                          <span className="text-sm font-semibold text-white">{acc.label}</span>
                        </div>

                        {isDone ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Angemeldet ({acc.models.length} Modelle erkannt)
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400">Wartet auf Device-Login...</span>
                        )}
                      </div>

                      {!isDone && (
                        <div className="mt-3 pt-3 border-t border-[#2e2e2e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 text-xs">
                            <div className="text-[#bbb]">
                              1. Öffne:{' '}
                              <a
                                href={acc.authUrl || 'https://auth.openai.com/device'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                {acc.authUrl || 'https://auth.openai.com/device'}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-[#bbb]">
                              <span>2. Code eingeben:</span>
                              <code className="px-2 py-0.5 rounded bg-[#121212] border border-[#3a3a3a] text-white font-mono font-bold tracking-wider">
                                {acc.deviceCode || 'K9X4-7M2P'}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyCode(acc.id, acc.deviceCode || 'K9X4-7M2P')}
                                className="p-1 rounded hover:bg-[#333] text-[#aaa] hover:text-white"
                                title="Code kopieren"
                              >
                                {copiedId === acc.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onVerifyAccount(acc.id)}
                            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shrink-0"
                          >
                            Ich habe mich angemeldet ✓
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-[#262626] hover:bg-[#303030] text-xs text-white"
                >
                  Zurück
                </button>

                <button
                  type="button"
                  onClick={onComplete}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {allAuthenticated
                      ? 'Einführung abschließen & Bridge starten'
                      : 'Alle bestätigen & Bridge starten'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
