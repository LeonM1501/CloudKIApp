import { lazy, Suspense } from "react";
import type { BridgeApi } from "../api";
const Session = lazy(() =>
  import("./TerminalSession").then((module) => ({
    default: module.TerminalSession,
  })),
);
export function Terminal(props: {
  api: BridgeApi;
  purpose?: string;
  target?: string;
}) {
  return (
    <Suspense fallback={<p className="subtle">Terminal wird geladen �</p>}>
      <Session {...props} />
    </Suspense>
  );
}
