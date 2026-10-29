# CloudKI Bridge — handoff context

> Maintain this file whenever architecture, deployment, storage, security posture, external services, or major features change. Never store credentials here.

## Identity and status

- Repository: https://github.com/LeonM1501/CloudKIApp
- Starting commit: `a51496b` (single initial commit). Work branch: `codex/real-bridge-ipad`.
- 2026-10-29: replaced the original simulated backend and fabricated UI data with functional protocol adapters and a responsive shell. User initially selected a locally validated handoff; subsequently authorized direct publication to `main` and the GitHub Actions IPA build. No deployment to a Linux host was requested.
- Not a production acceptance claim. No real provider account, Linux graphical app, or iPad IPA has been tested. See `VALIDATION.md` and the capability matrix in `README.md` before making promises.

## Runtime and entry points

Node >=22.16, React 19, Vite 6, TypeScript, Capacitor 8, Express, ssh2, ws, noVNC 1.7, xterm 6. `npm ci`, `npm test`, `npm run build`, `npm run dev` / `npm start`. `.env` is loaded by Node; required `BRIDGE_TOKEN` is generated with `npm run token`.

- `server/index.ts`: authenticated single-owner API, tickets, WebSocket bridges, lifecycle and mutations.
- `server/ssh.ts`: pinned host-key verification, SSH process/SFTP helpers, account profiles.
- `server/providers.ts`: Codex app-server, OpenCode ACP, Antigravity stream-json, approvals and transcript handoff.
- `server/rpc.ts`: bounded newline JSON-RPC transport, timeouts and disconnect rejection.
- `server/desktops.ts`: separate Xvfb/Openbox/VNC app sessions; explicit apt installation commands.
- `scripts/browser-mcp.mjs`: dependency-free MCP/CDP adapter uploaded to the SSH host when Chromium starts.
- `src/App.tsx`, `src/components/Setup.tsx`: main UI, first-run flow, real account setup.
- `src/components/RemoteWorkspace.tsx`, `Terminal.tsx`: real VNC/PTY surfaces. Never restore fake editor/browser screens.
- `src/index.css`: narrow-device overlay behavior and wide resizable panes.

## Data/security model

One trusted owner and one configured SSH target per process. The bridge listens on loopback; deploy behind HTTPS. All API requests need a random bearer token. The UI retains it only in memory. WebSockets use bounded, expiring, single-use tickets carried in the subprotocol header, not a persistent token in the URL.

`.bridge-data/state.json` stores metadata and transcripts using queued atomic replacements. Credentials are not stored there. Provider-owned credentials and uploads reside in `~/.cloudki/` on the SSH host. Profile directories are not OS/tenant isolation; a client may also consult inherited workspace rules or keyrings. No arbitrary multi-user hosting support.

Chat history is sent as explicit untrusted conversation data for each new native provider session. It includes file references and completed/failed tool information, not hidden reasoning. This is deliberately bounded and may consume more tokens than native resumption. Unknown server request types fail closed. Codex command/file approvals and OpenCode permission requests are implemented; other interactive request types are a known limitation.

## Recent changes and open work

- Removed hardcoded users, IPs, quota percentages, device codes, sample chats and fake terminal/editor results; no simulation fallback exists in production code.
- Added actual SSH/SFTP and native protocol calls, error propagation, persistence, local tests, responsive onboarding/settings, remote app launch and browser MCP scaffolding.
- HTTPS-only external API addresses; disabled arbitrary iOS cleartext loads; iPadOS target 17; removed generated `dist` from version control.
- Added pinned CI checks, OSV, Gitleaks, Dependabot, and reproducible `npm ci` IPA build. The publication request triggers GitHub Actions; inspect the actual run status/artifacts for current evidence. Branch protection has not been changed.
- Antigravity quota API and strict account isolation need real verification. Headless mode currently only supports explicitly acknowledged full access. OpenCode quotas are unavailable through ACP. GPU acceleration and Unity/Blender-specific MCP editing are not implemented.
- General plugin marketplace, native Apple Liquid Glass, richer provider questions/elicitation, automatic summarization and native session resumption remain future work.

## Next action

Use a dedicated Linux test user. Install official clients on its noninteractive PATH, configure HTTPS for the bridge, then follow `docs/SETUP.md` and record the actual versions and live results in `VALIDATION.md`. Do not infer passing integration tests from the deterministic protocol fixtures. Preserve the original Git history. After the authorized push, verify CI and supply the unsigned IPA; device signing and provider logins remain with the owner.
