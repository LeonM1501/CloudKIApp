import { Capacitor } from "@capacitor/core";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import {
  APP_VERSION,
  IPA_ASSET_NAME,
  IPA_RELEASE_TAG,
  UPDATE_RELEASE_TAG,
  UPDATE_REPOSITORY,
  WEB_ASSET_NAME,
} from "./version";

export interface UpdateManifest {
  version: string;
  bundleId: string;
  checksum: string;
  commit?: string;
  builtAt?: string;
  notes?: string;
  minNativeVersion?: string;
}

export interface UpdateRelease {
  manifest: UpdateManifest;
  downloadUrl: string;
  releaseUrl: string;
  updateAvailable: boolean;
  currentBundleId: string | null;
  nativeVersion: string;
  native: boolean;
}

export interface LiveUpdateStatus {
  native: boolean;
  nativeVersion: string;
  currentBundleId: string | null;
}

export const repositoryUrl = `https://github.com/${UPDATE_REPOSITORY}`;
export const ipaDownloadUrl = `${repositoryUrl}/releases/download/${IPA_RELEASE_TAG}/${IPA_ASSET_NAME}`;
export const liveUpdateReleaseUrl = `${repositoryUrl}/releases/tag/${UPDATE_RELEASE_TAG}`;

function isNative() {
  return Capacitor.isNativePlatform();
}

export async function withDeadline<T>(promise: Promise<T>, action: string, timeout = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Das Update-Modul antwortet nicht: ${action}. App vollständig schließen und erneut versuchen.`)), timeout);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let readiness: Promise<void> | undefined;
/** Muss nach jedem Start aufgerufen werden, damit ein defektes Bundle zurückrollt. */
export function markAppReady(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  if (!readiness) {
    readiness = withDeadline(LiveUpdate.ready(), "App bereitmelden")
      .then(() => undefined)
      .catch((error) => { readiness = undefined; throw error; });
  }
  return readiness;
}

export async function getLiveUpdateStatus(): Promise<LiveUpdateStatus> {
  if (!isNative())
    return {
      native: false,
      nativeVersion: APP_VERSION,
      currentBundleId: null,
    };
  if (!Capacitor.isPluginAvailable("LiveUpdate"))
    throw new Error("Das Update-Modul fehlt in dieser iPad-App. Bitte die aktuelle IPA installieren.");
  await markAppReady();
  const [current, version] = await Promise.all([
    withDeadline(LiveUpdate.getCurrentBundle(), "aktives Bundle lesen"),
    withDeadline(LiveUpdate.getVersionName(), "App-Version lesen"),
  ]);
  return {
    native: true,
    nativeVersion: version.versionName || APP_VERSION,
    currentBundleId: current.bundleId,
  };
}

function parseManifest(release: any): UpdateManifest {
  if (typeof release?.body === "string") {
    const body = release.body.trim();
    const json = body.startsWith("```")
      ? body.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
      : body;
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.bundleId === "string") return parsed;
    } catch {
      // Ältere Releases hatten einen Freitext als Beschreibung.
    }
  }
  throw new Error(
    "Der Release enthält kein lesbares Update-Manifest. Der Workflow muss den Release-Text als JSON schreiben.",
  );
}

function versionParts(value: string) {
  return value
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function compareVersions(left: string, right: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateRelease> {
  const status = await getLiveUpdateStatus();
  const response = await fetch(
    `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/tags/${UPDATE_RELEASE_TAG}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(25000),
    },
  ).catch(() => {
    throw new Error(
      "GitHub ist nicht erreichbar. Internetverbindung prüfen und erneut versuchen.",
    );
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error(
        "Es gibt noch kein Live-Update-Release. Zuerst den Workflow „CloudKI Live-Update veröffentlichen“ auf GitHub ausführen.",
      );
    if (response.status === 403)
      throw new Error(
        "GitHub hat die Anfrage begrenzt. In einigen Minuten erneut versuchen.",
      );
    throw new Error(`GitHub-Release konnte nicht geladen werden (HTTP ${response.status}).`);
  }
  const release = await response.json();
  const manifest = parseManifest(release);
  const asset = (release.assets ?? []).find(
    (item: any) => item.name === WEB_ASSET_NAME,
  );
  if (!asset?.browser_download_url)
    throw new Error(
      `Im Release fehlt das Asset ${WEB_ASSET_NAME}. Workflow prüfen.`,
    );
  if (!manifest.checksum)
    throw new Error("Im Update-Manifest fehlt die SHA-256-Prüfsumme.");
  if (
    manifest.minNativeVersion &&
    compareVersions(status.nativeVersion, manifest.minNativeVersion) < 0
  )
    throw new Error(
      `Dieses Update benötigt die native App-Version ${manifest.minNativeVersion}. Bitte zuerst die neue IPA installieren: ${ipaDownloadUrl}`,
    );
  return {
    manifest,
    downloadUrl: asset.browser_download_url,
    releaseUrl: release.html_url ?? liveUpdateReleaseUrl,
    updateAvailable: status.currentBundleId !== manifest.bundleId,
    currentBundleId: status.currentBundleId,
    nativeVersion: status.nativeVersion,
    native: status.native,
  };
}

export async function installUpdate(
  release: UpdateRelease,
  onProgress?: (progress: number) => void,
) {
  if (!isNative())
    throw new Error(
      "Live-Updates funktionieren nur in der installierten iPad-App. Im Browser wird immer der aktuelle Build geladen.",
    );
  await markAppReady();
  const listener = await withDeadline(LiveUpdate.addListener(
    "downloadBundleProgress",
    (event) => onProgress?.(Math.max(0, Math.min(1, event.progress))),
  ), "Download vorbereiten");
  try {
    await withDeadline(LiveUpdate.downloadBundle({
      url: release.downloadUrl,
      bundleId: release.manifest.bundleId,
      checksum: release.manifest.checksum,
    }), "Update herunterladen", 120000);
    await withDeadline(LiveUpdate.setNextBundle({ bundleId: release.manifest.bundleId }), "Update aktivieren");
    onProgress?.(1);
    await withDeadline(LiveUpdate.reload(), "App neu laden");
  } finally {
    await listener.remove();
  }
}

export async function resetToBundledVersion() {
  if (!isNative())
    throw new Error("Diese Funktion ist nur in der iPad-App verfügbar.");
  await withDeadline(LiveUpdate.reset(), "Version zurücksetzen");
  await withDeadline(LiveUpdate.reload(), "App neu laden");
}
