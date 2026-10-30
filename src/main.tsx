import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppUpdate } from "./components/AppUpdate";
import { checkForUpdate, getLiveUpdateStatus, installUpdate, markAppReady } from "./updater";

createRoot(document.getElementById("root")!).render(<StrictMode><AppUpdate onOpenAssistant={() => {}} /></StrictMode>);
void markAppReady().catch(() => {});
void (async () => {
  await new Promise(done => setTimeout(done, 35000));
  try {
    const status = await getLiveUpdateStatus();
    const release = await checkForUpdate();
    if (!release.updateAvailable) throw new Error("Expected a fresh downloadable update in the simulator");
    sessionStorage.setItem("cloudki.simulator.result", JSON.stringify({ phase: "installing", nativeVersion: status.nativeVersion, targetBundle: release.manifest.bundleId }));
    await installUpdate(release);
  } catch (error) {
    sessionStorage.setItem("cloudki.simulator.result", JSON.stringify({ error: String(error) }));
  }
})();
