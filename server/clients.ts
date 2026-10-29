import type { Provider } from "../src/types.ts";
import { choice, shellQuote } from "./validation.ts";

export const clientPath = '"$HOME/.local/bin:$HOME/.opencode/bin:$HOME/.local/share/cloudki-node/bin:$HOME/.local/share/cloudki/clients/codex/bin:$HOME/.local/share/cloudki/clients/opencode/bin:$PATH"';

export function installClientCommand(provider: Provider) {
  choice(provider, ["codex", "antigravity", "opencode"] as const);
  const binary = provider === "antigravity" ? "agy" : provider;
  const install = provider === "antigravity"
    ? `command -v curl >/dev/null || { echo 'curl fehlt auf dem SSH-Server.' >&2; exit 1; }
installer=$(mktemp)
trap 'rm -f -- "$installer"' EXIT
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' https://antigravity.google/cli/install.sh -o "$installer"
bash "$installer" --dir "$HOME/.local/bin"`
    : `command -v npm >/dev/null || { echo 'Node.js und npm fehlen auf dem SSH-Server.' >&2; exit 1; }
npm install --global --prefix "$HOME/.local/share/cloudki/clients/${provider}" --no-audit --no-fund ${provider === "codex" ? "@openai/codex" : "opencode-ai"}`;
  return `bash -c ${shellQuote(`set -eu
export PATH=${clientPath}
if ! command -v ${binary} >/dev/null 2>&1; then
${install}
fi
${binary} --version` )}`;
}
