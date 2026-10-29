import test from "node:test";
import assert from "node:assert/strict";
import { antigravityLoginUrl } from "../src/antigravity-login.ts";

const url = "https://accounts.google.com/o/oauth2/auth?client_id=fixture&code_challenge=abc123&redirect_uri=https%3A%2F%2Fantigravity.google%2Foauth-callback&state=fixture";
test("Antigravity login uses full OSC hyperlinks instead of wrapped terminal text", () => {
  assert.equal(antigravityLoginUrl(`\x1b]8;;${url}\x1b\\Click here\x1b]8;;\x1b\\`), url);
  assert.equal(antigravityLoginUrl(`\x1b]8;;${url}\x07Click here\x1b]8;;\x07`), url);
  const wrapped = url.match(/.{1,42}/g)!.map(line => " " + line).join("\r\n");
  assert.equal(antigravityLoginUrl(`Open the URL below:\r\n${wrapped}\r\n ─────────\r\n`), url);
});
test("incomplete or untrusted Antigravity login links are not shown", () => {
  assert.equal(antigravityLoginUrl("Select login method: Google OAuth"), null);
  assert.equal(antigravityLoginUrl(`\x1b]8;;${url.slice(0, 50)}`), null);
  assert.equal(antigravityLoginUrl(`\x1b]8;;https://evil.example/auth\x07Click here`), null);
  assert.equal(antigravityLoginUrl(`\x1b]8;;https://secret@accounts.google.com/auth\x07Click here`), null);
});
