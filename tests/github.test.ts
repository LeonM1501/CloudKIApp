import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitHub, githubRepository } from "../server/github.ts";
import { clientPath } from "../server/clients.ts";
import { shellQuote } from "../server/validation.ts";
import type { Remote } from "../server/ssh.ts";

const exec = promisify(execFile);
test("GitHub URLs accept repository links and reject credentials, paths and shell input", () => {
  assert.deepEqual(githubRepository("https://github.com/owner/repo.git/"), {
    owner: "owner", name: "repo", url: "https://github.com/owner/repo.git",
  });
  for (const input of [
    "https://evil.example/owner/repo", "https://token@github.com/owner/repo",
    "https://github.com/owner/repo/tree/main", "https://github.com/owner/..",
    "https://github.com/owner/repo?token=secret", "https://github.com/owner/$(touch injected)",
  ]) assert.throws(() => githubRepository(input));
});

test("GitHub projects clone, fast-forward, commit and push without overwriting conflicts", {
  skip: process.platform === "win32" ? "Linux SSH-host integration test" : false,
}, async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "cloudki-git-")));
  const bare = join(directory, "origin.git");
  const seed = join(directory, "seed");
  const bin = join(directory, "bin");
  const url = "https://github.com/fixture/project.git";
  const git = (cwd: string, ...args: string[]) => exec("git", ["-C", cwd, ...args]);
  try {
    await mkdir(bin);
    await writeFile(join(bin, "gh"), `#!/bin/sh
if [ "$1" = api ]; then
  if [ "$4" = .login ]; then echo fixture; else echo 123+fixture@users.noreply.github.com; fi
fi
`, { mode: 0o755 });
    await exec("git", ["init", "--bare", "--initial-branch=main", bare]);
    await exec("git", ["clone", bare, seed]);
    await git(seed, "config", "user.name", "Fixture");
    await git(seed, "config", "user.email", "fixture@example.invalid");
    await writeFile(join(seed, "README.txt"), "initial\n");
    await writeFile(join(seed, ".gitignore"), ".env\n");
    await git(seed, "add", ".");
    await git(seed, "commit", "-m", "Initial");
    await git(seed, "push", "origin", "main");
    const remote = {
      connection: { home: directory },
      run: async (command: string) => exec("bash", ["-c", command
        .replaceAll(url, bare)
        .replaceAll(`export PATH=${clientPath}`, `export PATH=${shellQuote(bin)}:"$PATH"`)]),
    } as unknown as Remote;
    const github = new GitHub(remote);
    const project = await github.clone(url);
    assert.equal(project.branch, "main");
    assert.equal((await github.clone(url)).path, project.path);
    await writeFile(join(seed, "upstream.txt"), "upstream\n");
    await git(seed, "add", ".");
    await git(seed, "commit", "-m", "Upstream");
    await git(seed, "push", "origin", "main");
    await github.prepare(project);
    assert.equal(await readFile(join(project.path, "upstream.txt"), "utf8"), "upstream\n");
    await writeFile(join(project.path, "README.txt"), "agent change\n");
    await writeFile(join(project.path, ".env"), "SECRET=fixture-only\n");
    await assert.rejects(github.prepare(project), /Lokale Änderungen/);
    await github.push(project);
    assert.equal((await git(bare, "show", "main:README.txt")).stdout, "agent change\n");
    assert.doesNotMatch((await git(bare, "ls-tree", "--name-only", "main")).stdout, /\.env/);
    const before = (await git(bare, "rev-parse", "main")).stdout;
    await github.push(project);
    assert.equal((await git(bare, "rev-parse", "main")).stdout, before);
    await git(seed, "pull", "--ff-only");
    await writeFile(join(seed, "conflict.txt"), "remote\n");
    await git(seed, "add", ".");
    await git(seed, "commit", "-m", "Concurrent change");
    await git(seed, "push", "origin", "main");
    const upstream = (await git(bare, "rev-parse", "main")).stdout;
    await writeFile(join(project.path, "conflict.txt"), "local\n");
    await assert.rejects(github.push(project));
    assert.equal((await git(bare, "rev-parse", "main")).stdout, upstream);
    assert.equal(await readFile(join(project.path, "conflict.txt"), "utf8"), "local\n");
    await git(project.path, "checkout", "-b", "other");
    await assert.rejects(github.push(project), /Git-Branch wurde geändert/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
