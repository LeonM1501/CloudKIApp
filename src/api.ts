export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: any,
  ) {
    super(message);
  }
}
export class BridgeApi {
  constructor(
    readonly base: string,
    private token: string,
  ) {}
  async request<T = any>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const result = await response
      .json()
      .catch(() => ({ error: "Die Adresse liefert keine Bridge-API." }));
    if (!response.ok)
      throw new ApiError(
        result.error ?? `HTTP ${response.status}`,
        response.status,
        result.details,
      );
    return result;
  }
  async socket(purpose: string, target = "") {
    const { ticket } = await this.request("/api/socket-ticket", "POST", {
      purpose,
      target,
    });
    const url = new URL(`${this.base}/ws`, window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return new WebSocket(url, ["cloudki", `ticket.${ticket}`]);
  }
}
export function bridgeAddress(value: string) {
  if (!value.trim() && ["http:", "https:"].includes(location.protocol))
    return "";
  const url = new URL(value.trim());
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  )
    throw new Error(
      "Nur die Bridge-Adresse eingeben, ohne Pfad oder Zugangsdaten.",
    );
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error(
      "Die Bridge benötigt HTTPS. HTTP ist nur für lokale Entwicklung erlaubt.",
    );
  return url.origin;
}
