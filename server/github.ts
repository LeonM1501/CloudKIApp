import type { Project } from "../src/types.ts";
import { randomUUID } from "node:crypto";
import type { Remote } from "./ssh.ts";
import { clientPath } from "./clients.ts";
import { absolutePath, HttpError, shellQuote as q, text } from "./validation.ts";

export function githubRepository(value: unknown) {
  const input = text(value, "GitHub-Repo", 300).trim();
  const match = /^https:\/\/github\.com\/([a-zA-Z0-9][a-zA-Z0-9-]*)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/.exec(input);
  if (!match || [".", ".."].includes(match[2]))
    throw new HttpError(400, "Eine GitHub-Repo-URL eingeben: https://github.com/NAME/REPO");
  return { owner: match[1], name: match[2], url: `https://github.com/${match[1]}/${match[2]}.git` };
}

export function githubLoginCommand() {
  return `bash -c ${q(`set -eu
export PATH=${clientPath}
if ! command -v gh >/dev/null 2>&1; then
  command -v curl >/dev/null || { echo 'curl fehlt auf dem Server.' >&2; exit 1; }
  command -v node >/dev/null || { echo 'Node.js fehlt auf dem Server.' >&2; exit 1; }
  case "$(uname -m)" in x86_64) arch=amd64;; aarch64|arm64) arch=arm64;; *) echo 'Architektur nicht unterstützt.' >&2; exit 1;; esac
  version=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).tag_name.slice(1)')
  case "$version" in ''|*[!0-9.]*) echo 'Ungültige GitHub-CLI-Version.' >&2; exit 1;; esac
  temporary=$(mktemp -d)
  trap 'rm -rf -- "$temporary"' EXIT
  cd "$temporary"
  file="gh_\${version}_linux_\${arch}.tar.gz"
  curl -fL "https://github.com/cli/cli/releases/download/v$version/$file" -o "$file"
  curl -fsSL "https://github.com/cli/cli/releases/download/v$version/gh_\${version}_checksums.txt" -o checksums.txt
  sha256sum --check --ignore-missing checksums.txt
  tar -xzf "$file"
  mkdir -p "$HOME/.local/bin"
  install -m 755 "gh_\${version}_linux_\${arch}/bin/gh" "$HOME/.local/bin/gh"
fi
gh auth login --hostname github.com --git-protocol https --web`)} `;
}

const environment = `set -eu\nexport PATH=${clientPath}\nexport GIT_TERMINAL_PROMPT=0\n`;
// The helper applies to this command only; GitHub credentials stay on the SSH host.
const git = "git -c credential.helper= -c 'credential.https://github.com.helper=!gh auth git-credential'";

export class GitHub {
  constructor(private remote: Remote) {}
  async clone(value: unknown): Promise<Project> {
    const repository = githubRepository(value);
    const path = absolutePath(`${this.remote.connection!.home}/.cloudki/projects/${repository.owner}/${repository.name}`);
    const result = await this.remote.run(`bash -c ${q(`${environment}
command -v git >/dev/null || { echo 'Git fehlt auf dem SSH-Server.' >&2; exit 1; }
mkdir -p -- ${q(path.substring(0, path.lastIndexOf("/")))}
if [ ! -e ${q(path)} ]; then
  ${git} clone -- ${q(repository.url)} ${q(path)}
fi
cd -- ${q(path)}
test "$(git rev-parse --show-toplevel)" = ${q(path)}
test "$(git remote get-url origin)" = ${q(repository.url)} || { echo 'Der vorhandene Ordner gehört zu einem anderen Repo.' >&2; exit 1; }
git symbolic-ref --short HEAD`)}`, 240000);
    return { id: randomUUID(), name: repository.name, path, repository: repository.url, branch: result.stdout.trim() };
  }
  private script(project: Project, command: string) {
    const repository = githubRepository(project.repository);
    const branch = text(project.branch, "Git-Branch", 250);
    return `bash -c ${q(`${environment}
cd -- ${q(absolutePath(project.path))}
test "$(git rev-parse --show-toplevel)" = ${q(project.path)}
test "$(git remote get-url origin)" = ${q(repository.url)} || { echo 'Git-Remote wurde geändert. Bitte prüfen.' >&2; exit 1; }
test "$(git symbolic-ref --short HEAD)" = ${q(branch)} || { echo 'Git-Branch wurde geändert. Bitte prüfen.' >&2; exit 1; }
command -v gh >/dev/null && gh auth status --hostname github.com >/dev/null 2>&1 || { echo 'Im Projektdialog zuerst GitHub verbinden.' >&2; exit 1; }
${command}`)}`;
  }
  async prepare(project: Project) {
    const result = await this.remote.run(this.script(project, `test -z "$(git status --porcelain)" || { echo 'Lokale Änderungen zuerst über Änderungen hochladen sichern.' >&2; exit 1; }
if ${git} ls-remote --exit-code origin ${q(`refs/heads/${project.branch}`)} >/dev/null; then
  ${git} pull --ff-only origin ${q(project.branch!)}
else
  code=$?
  test "$code" = 2 || exit "$code"
fi`), 90000);
    return result.stdout;
  }
  async push(project: Project) {
    const result = await this.remote.run(this.script(project, `if [ -n "$(git status --porcelain)" ]; then
  author=$(gh api user --jq .login)
  email=$(gh api user --jq '"\\(.id)+\\(.login)@users.noreply.github.com"')
  git add --all
  git -c user.name="$author" -c user.email="$email" commit -m 'CloudKI: Änderungen nach abgeschlossenem Auftrag'
fi
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  ${git} push origin ${q(`HEAD:refs/heads/${project.branch}`)}
fi`), 90000);
    return (result.stdout + result.stderr).trim();
  }
}
