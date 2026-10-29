import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Desktops } from "../server/desktops.ts";
import type { Remote } from "../server/ssh.ts";

test("desktop discovery honors user overrides and excludes hidden, terminal and missing apps", {
  skip: process.platform === "win32" ? "Python discovery runs on the Linux SSH host" : false,
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), "cloudki-apps-"));
  const user = join(directory, "user"); const system = join(directory, "system");
  try {
    await mkdir(user); await mkdir(system);
    const entry = (name: string, extra = "") => `[Desktop Entry]\nType=Application\nName=${name}\nExec=/bin/true\n${extra}`;
    await writeFile(join(system, "paint.desktop"), entry("System Paint"));
    await writeFile(join(user, "paint.desktop"), entry("My Paint"));
    await writeFile(join(system, "hidden.desktop"), entry("Hidden override"));
    await writeFile(join(user, "hidden.desktop"), entry("Hidden", "Hidden=true\n"));
    await writeFile(join(user, "terminal.desktop"), entry("CLI", "Terminal=true\n"));
    await writeFile(join(user, "missing.desktop"), entry("Missing", "TryExec=/nonexistent/cloudki-fixture\n"));
    await writeFile(join(user, "broken.desktop"), "invalid desktop entry");
    const { stdout } = await promisify(execFile)("python3", ["-c", "import runpy,json,sys; ns=runpy.run_path(sys.argv[1]); print(json.dumps(ns['desktop_apps'](sys.argv[2:])))", resolve("scripts/desktop-apps.py"), user, system]);
    const apps = JSON.parse(stdout);
    assert.equal(apps.length, 1);
    assert.equal(apps[0].name, "My Paint");
    assert.equal(apps[0].desktopId, "paint.desktop");
    assert.match(apps[0].id, /^desktop-[a-f0-9]{12}$/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("only discovered apps may be started or streamed", async () => {
  const remote = {
    connection: { home: "/home/fixture" }, requireClient: () => ({}),
    writeFile: async () => {},
    run: async (command: string) => ({ stdout: command.startsWith("python3") ? JSON.stringify({ apps: [{ id: "desktop-fixture", name: "Paint", desktopId: "paint.desktop" }], available: [] }) : "", stderr: "" }),
  } as unknown as Remote;
  const desktops = new Desktops(remote);
  assert.throws(() => desktops.appId("desktop-fixture"), /App nicht gefunden/);
  const status = await desktops.status();
  assert.equal(status.apps.at(-1)?.name, "Paint");
  assert.equal(desktops.appId("desktop-fixture"), "desktop-fixture");
  assert.throws(() => desktops.appId("../../bin/sh"), /App nicht gefunden/);
  assert.throws(() => desktops.port("desktop-fixture"), /App zuerst starten/);
});
