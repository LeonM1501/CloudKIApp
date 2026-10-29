import { useEffect, useRef, useState } from "react";
import { Terminal as Xterm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { BridgeApi } from "../api";
export function TerminalSession({
  api,
  purpose = "terminal",
  target = "",
}: {
  api: BridgeApi;
  purpose?: string;
  target?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Verbinden …");
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | undefined;
    const terminal = new Xterm({
      fontSize: 13,
      cursorBlink: true,
      scrollback: 3000,
      theme: { background: "#141414", foreground: "#e8e8e8" },
      allowProposedApi: false,
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(element.current!);
    const resize = () => {
      if (disposed) return;
      fit.fit();
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(
          JSON.stringify({
            type: "resize",
            cols: terminal.cols,
            rows: terminal.rows,
          }),
        );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element.current!);
    const input = terminal.onData((data) => {
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "input", data }));
    });
    void api
      .socket(purpose, target)
      .then((value) => {
        if (disposed) {
          value.close();
          return;
        }
        socket = value;
        socket.onopen = () => {
          setStatus("Live · SSH-Terminal");
          resize();
        };
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "data") terminal.write(data.data);
            if (data.type === "error") setStatus(data.message);
            if (data.type === "exit") {
              setStatus(`Prozess beendet · Exit ${data.code ?? "unbekannt"}`);
              terminal.writeln(`\r\n[Exit ${data.code ?? "unbekannt"}]`);
            }
          } catch {
            setStatus("Ungültige Terminal-Antwort");
          }
        };
        socket.onerror = () => setStatus("Terminal-Verbindung fehlgeschlagen");
        socket.onclose = () =>
          setStatus((previous) =>
            previous.startsWith("Live") ? "Terminal getrennt" : previous,
          );
      })
      .catch((error) => {
        if (!disposed) setStatus(error.message);
      });
    return () => {
      disposed = true;
      observer.disconnect();
      input.dispose();
      socket?.close();
      terminal.dispose();
    };
  }, [api, purpose, target]);
  return (
    <div className="terminal-wrap">
      <p className="subtle small" role="status">
        {status}
      </p>
      <div ref={element} className="terminal" />
    </div>
  );
}
