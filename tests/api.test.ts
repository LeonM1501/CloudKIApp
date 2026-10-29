import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, BridgeApi } from "../src/api.ts";

test("SSH errors remain readable after host-key confirmation", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { error: "SSH-Anmeldung abgelehnt. SSH-Schlüssel verwenden." },
      { status: 422 },
    ),
  );
  const api = new BridgeApi("https://bridge.example.com", "test-token");
  await assert.rejects(
    api.request("/api/server/connect", "POST", { fingerprint: "SHA256:test" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.match(error.message, /SSH-Schlüssel/);
      return true;
    },
  );
});

test("WebKit network failures show an actionable message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Load failed");
  });
  await assert.rejects(
    new BridgeApi("https://bridge.example.com", "test-token").request("/api/state"),
    /Internetverbindung und Bridge-Adresse prüfen/,
  );
});
