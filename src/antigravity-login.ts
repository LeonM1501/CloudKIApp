export function antigravityLoginUrl(output: string): string | null {
  const hyperlink = /\x1b\]8;[^;]*;(https:\/\/[^\x07\x1b]+)(?:\x07|\x1b\\)/.exec(output);
  let candidate = hyperlink?.[1];
  if (!candidate) {
    const plain = output
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\|$)/g, "")
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
    const start = plain.indexOf("https://accounts.google.com/");
    if (start < 0) return null;
    const lines = plain.slice(start).split(/\r?\n/);
    const parts: string[] = [];
    let complete = false;
    for (const line of lines) {
      const value = line.trim();
      if (!value || /\s|[─━]/.test(value)) { complete = true; break; }
      parts.push(value);
    }
    if (!complete) return null;
    candidate = parts.join("");
  }
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname === "accounts.google.com" && !url.username && !url.password
      ? url.href : null;
  } catch {
    return null;
  }
}
