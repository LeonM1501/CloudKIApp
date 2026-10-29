import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Setup } from "../src/components/Setup.tsx";
import { BridgeApi } from "../src/api.ts";
import { emptyState } from "../server/store.ts";

test("onboarding resumes at the first incomplete step", () => {
  const state = emptyState();
  const render = () => renderToStaticMarkup(createElement(Setup, {
    api: new BridgeApi("https://bridge.example.com", "test-token"),
    state,
    refresh: async () => {},
  }));
  assert.match(render(), /Weiter zum Server/);
  state.profile.username = "Tester";
  assert.match(render(), /Linux-Server verbinden/);
  state.connection = {
    host: "127.0.0.1", port: 22, username: "tester", home: "/home/tester",
    fingerprint: "SHA256:test", hardware: "RAM: 8.0 GiB", connected: true,
  };
  assert.match(render(), /Mit deinen Accounts arbeiten/);
  state.connection.connected = false;
  assert.match(render(), /Linux-Server verbinden/);
  state.profile.onboardingComplete = true;
  state.connection.connected = true;
  assert.match(render(), /Linux-Server verbinden/);
});
