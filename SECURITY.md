# Security scope

This is a single-owner development bridge with server execution capabilities. It is not a multi-tenant hosted service. Anyone holding `BRIDGE_TOKEN` has the owner's bridge access, including the terminal. Do not share the token between unrelated users. Run the SSH side as an unprivileged dedicated user on a trusted host, behind appropriate network controls.

## Local audit record — 2026-10-29

Scope: the rewritten HTTP/WebSocket boundary, SSH connection/commands, account profiles, chat persistence and provider adapters. Applied domains: SSH/server access, auth/identity, web endpoints, LLM tool access, dependency hygiene, personal-data storage, network exposure and bounded resource use. This was part of the authorized app implementation, not a legal or production certification.

### Unauthenticated execution and state exposure in the original demo

- Evidence: original `a51496b:server/index.ts` used unrestricted CORS, no API authentication and an unprotected WebSocket server; `/api/terminal/exec` accepted commands for the shared SSH connection.
- Scenario/severity: Critical if publicly exposed with a real SSH connection. A remote caller could execute commands as that SSH user and read shared state.
- Fix: mandatory random bearer token for every API route, exact origin allowlist, default loopback binding, single-use 30-second WebSocket tickets in subprotocol headers. The old terminal route is removed. UI keeps the persistent key in memory only.
- Verification: local HTTP tests exercise missing token, foreign origin, old route, invalid IDs and ticket replay. Mutation test proves removing auth causes test failures. Sweep covers all API routes and WebSocket upgrades.
- Not verified: external reverse-proxy configuration and real network exposure. Default HTTPS deployment is an operator responsibility.

### SSH trust and fabricated success

- Evidence: original `/api/server/connect` did not verify host keys and converted SSH failure to a simulated connected server. Original login/install routes also fabricated success.
- Scenario/severity: High. User could submit credentials to an unverified host and trust work that never ran.
- Fix: SHA256 host-key confirmation before authentication; remembered key must continue matching. No failure-to-success fallback. SSH command exit codes, timeouts and output bounds are enforced. Path operands are shell-quoted.
- Verification: a real ephemeral SSH server test proves zero password authentication attempts before trust, accepts the verified key, refuses changed keys, and propagates bad credentials/nonzero command exits. Source sweep found no remaining demo-success fallback.

### Provider and data boundaries

- Each account gets dedicated profile paths. Ambient API-key credentials are removed from launched client environments. This is not complete sandbox/tenant isolation; underlying provider keyrings and workspace settings require live review.
- Codex command/file approvals and OpenCode ACP permission requests require frontend answers unless the explicitly selected mode permits automatic execution. Unknown request types fail closed. Antigravity headless and the browser MCP plugin are unavailable unless the user explicitly selects full access.
- Model catalogs and quotas are read from clients; unsupported data is marked unavailable. Model catalogs do not prove entitlement. Tool calls/answers are displayed as text, never arbitrary HTML.
- Transcript handoff marks history as data, includes tool outcomes, and never copies secret environment variables or hidden reasoning into the prompt. Attachments are referenced by server path; file contents and webpages remain untrusted input.
- `state.json` uses atomic queued writes, mode 0600; its directory uses mode 0700 on POSIX. Corruption stops loading rather than destroying history. Windows ACLs and encrypted disks must be managed separately.
- Profiles, browser cookies, uploads and native provider history have a separate lifetime from Bridge chats. See README for retention. Use filesystem quotas: the per-process upload cap is not a lifetime disk quota.

### Desktop boundary and process lifecycle

- Separate Xvfb display per app; Chromium sandbox is not disabled. Root desktop launch is refused. VNC/CDP listen on loopback; SSH and authenticated WebSockets provide transport access control.
- Local processes on the same host can reach those loopback services. This is acceptable only for the documented dedicated trusted host, not shared untrusted shell accounts.
- Closing a terminal/VNC WebSocket closes its SSH channel; late-opened channels are closed if the requesting socket already went away. Provider RPCs reject outstanding work on exit and time out.
- Real Linux process cleanup, CDP identity/port ownership, graphics performance and reconnection behavior have not been demonstrated. Treat desktop integration as requiring acceptance testing before reliance.

### Dependencies and CI

- Local `npm audit --json`: zero known vulnerabilities at the tested lockfile state.
- New packages: noVNC (MPL-2.0), xterm/addon-fit (MIT); registry metadata and upstream repositories inspected. noVNC is unmodified and corresponding source/notices are included under `public/licenses/`.
- Pinned checkout/setup-node/upload-artifact/OSV/Gitleaks refs were verified with `git ls-remote`. Workflows use minimum explicit permissions and reproducible installs; no `pull_request_target` execution.
- CI workflows were added during the local phase; the later publication request triggers them. Inspect current Actions results. Secret scan, OSV CI and branch-protection gates are **not passed** merely because configuration files exist. No repo settings were changed.

## STRIDE summary

- Spoofing: bearer auth, one-time tickets and pinned SSH keys; token theft still grants owner access.
- Tampering: validated IDs/paths, fixed desktop/installation commands and explicit provider permission modes. Full-access agents can intentionally alter the owner's workspace.
- Repudiation: actual chat/tool records, no claim of tamper-proof audit logging.
- Information disclosure: no persisted SSH password or persistent token in URL/localStorage; chats/profiles still require OS-level storage protection.
- Denial of service: input, output, concurrent run, connection, ticket, chat and upload limits; no long-duration load/memory test.
- Elevation of privilege: no automatic sudo approval, no root desktop browser, no implicit permission escalation. Host/user isolation remains an operator prerequisite.

## Release gate

Local checks do not authorize public release. Complete `VALIDATION.md` on the actual target environment, verify provider terms for the intended use, and resolve any resulting high/critical findings first. No commercial, privacy-law or general launch-readiness review was performed.
