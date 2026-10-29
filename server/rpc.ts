import type { Duplex } from "node:stream";
import { EventEmitter } from "node:events";
import { StringDecoder } from "node:string_decoder";
export class Rpc extends EventEmitter {
  private sequence = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private buffer = "";
  private decoder = new StringDecoder("utf8");
  closed = false;
  constructor(readonly stream: Duplex) {
    super();
    stream.on("data", (chunk) => {
      this.buffer += this.decoder.write(Buffer.from(chunk));
      if (this.buffer.length > 4_000_000) {
        this.close(new Error("Provider-Ausgabe zu groß"));
        return;
      }
      let split: number;
      while ((split = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, split);
        this.buffer = this.buffer.slice(split + 1);
        if (!line.trim()) continue;
        let message: any;
        try {
          message = JSON.parse(line);
        } catch {
          this.close(new Error("Provider hat ungültiges JSON gesendet"));
          return;
        }
        if (!message || typeof message !== "object" || Array.isArray(message)) {
          this.close(new Error("Provider hat ungültige RPC-Daten gesendet"));
          return;
        }
        if (message.method)
          this.emit(
            message.id === undefined ? "notification" : "request",
            message,
          );
        else {
          const pending = this.pending.get(message.id);
          if (!pending) continue;
          this.pending.delete(message.id);
          clearTimeout(pending.timer);
          message.error
            ? pending.reject(
                new Error(message.error.message || "Provider-Fehler"),
              )
            : pending.resolve(message.result);
        }
      }
    });
    stream.on("error", (error) => this.close(error));
    stream.on("close", () =>
      this.close(new Error("Provider-Verbindung beendet")),
    );
  }
  call(method: string, params: unknown = {}, timeout = 30000): Promise<any> {
    if (this.closed) return Promise.reject(new Error("Provider ist getrennt"));
    if (this.pending.size >= 100)
      return Promise.reject(new Error("Zu viele Provider-Anfragen"));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method}: Zeitlimit überschritten`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }
  notify(method: string, params: unknown = {}) {
    this.write({ jsonrpc: "2.0", method, params });
  }
  respond(id: string | number, result: unknown) {
    this.write({ jsonrpc: "2.0", id, result });
  }
  reject(id: string | number, message: string) {
    this.write({ jsonrpc: "2.0", id, error: { code: -32601, message } });
  }
  private write(message: unknown) {
    if (!this.closed) this.stream.write(JSON.stringify(message) + "\n");
  }
  close(error = new Error("Provider beendet")) {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    this.stream.destroy();
    this.emit("closed", error);
  }
}
