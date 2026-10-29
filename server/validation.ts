import { timingSafeEqual } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function text(
  value: unknown,
  name: string,
  max = 500,
  empty = false,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim()) ||
    value.includes("\0")
  )
    throw new HttpError(400, `${name}: ungültiger Wert`);
  return value;
}
export function choice<T extends string>(
  value: unknown,
  options: readonly T[],
): T {
  if (typeof value !== "string" || !options.includes(value as T))
    throw new HttpError(400, "Ungültige Auswahl");
  return value as T;
}
export function id(value: unknown): string {
  const result = text(value, "ID", 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(result))
    throw new HttpError(400, "Ungültige ID");
  return result;
}
export function shellQuote(value: string): string {
  if (value.includes("\0"))
    throw new HttpError(400, "Ungültiges Shell-Argument");
  return "'" + value.replaceAll("'", "'\\''") + "'";
}
export function authorized(header: string | undefined, token: string): boolean {
  const received = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
export function absolutePath(value: unknown): string {
  const result = text(value, "Pfad", 4096);
  if (!result.startsWith("/") || /[\r\n]/.test(result))
    throw new HttpError(400, "Ein absoluter Linux-Pfad ist nötig");
  return result;
}
