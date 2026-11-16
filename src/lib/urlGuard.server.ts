import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Protección SSRF para /api/measure (docs/decisiones.md, decisiones 66 y 67).
 * Solo servidor: usa node:dns y node:net.
 */

export const MAX_URL_LENGTH = 2048;

/** Puertos aceptados (además del puerto por defecto de cada protocolo) cuando NO se permiten URLs privadas. */
export const ALLOWED_PORTS: ReadonlySet<string> = new Set(["", "80", "443", "8080", "8443"]);

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

const allowPrivate = () => process.env.ALLOW_PRIVATE_URLS === "true";

// ---------- IPv4 ----------

function parseIPv4(s: string): [number, number, number, number] | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => Number.isNaN(n) || n > 255)) return null;
  return nums as [number, number, number, number];
}

function isPrivateIPv4([a, b, c]: readonly number[]): boolean {
  return (
    a === 0 || // "esta red" / 0.0.0.0
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, incluye metadata cloud 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF y TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 6to4 relay
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reservado y broadcast
  );
}

// ---------- IPv6 ----------

/** Expande una IPv6 a 8 grupos de 16 bits (acepta "::" y cola IPv4 punteada). */
export function parseIPv6(input: string): number[] | null {
  let s = input.split("%")[0].toLowerCase();
  if (s.includes(".")) {
    const idx = s.lastIndexOf(":");
    const v4 = parseIPv4(s.slice(idx + 1));
    if (!v4) return null;
    s = `${s.slice(0, idx + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  }
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function embeddedV4(hi: number, lo: number): number[] {
  return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff];
}

function isPrivateIPv6(g: number[]): boolean {
  const zeros5 = g.slice(0, 5).every((x) => x === 0);
  // ::, ::1, IPv4-mapped (::ffff:a.b.c.d) e IPv4-compatible (::a.b.c.d): se evalúa la IPv4 embebida.
  if (zeros5 && (g[5] === 0xffff || g[5] === 0)) return isPrivateIPv4(embeddedV4(g[6], g[7]));
  // NAT64 64:ff9b::/96 (IPv4 embebida) y 64:ff9b:1::/48 (uso local).
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    if (g[2] === 1) return true;
    if (g.slice(2, 6).every((x) => x === 0)) return isPrivateIPv4(embeddedV4(g[6], g[7]));
  }
  if (g[0] === 0x2002) return isPrivateIPv4(embeddedV4(g[1], g[2])); // 6to4
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
  if (g[0] === 0x2001 && g[1] === 0xdb8) return true; // documentación
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // discard 100::/64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (obsoleto)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  return false;
}

/** true si la dirección IP (v4 o v6) es privada, local, reservada o no enrutable públicamente. Texto no válido => true (falla cerrado). */
export function isPrivateIp(address: string): boolean {
  const a = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const family = isIP(a.split("%")[0]);
  if (family === 4) {
    const v4 = parseIPv4(a);
    return v4 ? isPrivateIPv4(v4) : true;
  }
  if (family === 6) {
    const v6 = parseIPv6(a);
    return v6 ? isPrivateIPv6(v6) : true;
  }
  return true;
}

// ---------- Hosts ----------

const PRIVATE_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".lan", ".home.arpa", ".intranet"];

/** Hosts privados o locales (literales IP o nombres evidentemente internos). No resuelve DNS. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (h === "") return true;
  if (isIP(h.split("%")[0]) !== 0) return isPrivateIp(h);
  if (h === "localhost" || PRIVATE_SUFFIXES.some((s) => h.endsWith(s))) return true;
  return !h.includes("."); // nombres de una sola etiqueta (p. ej. "metadata") son internos
}

// ---------- Validación de URLs ----------

/** Validación estática (sin DNS): protocolo, credenciales, puerto y host literal. */
export function checkUrlStatic(raw: string): UrlCheck {
  if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) return { ok: false, reason: "La URL es demasiado larga" };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: "La URL no es válida" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, reason: "Solo se aceptan URLs http o https" };
  if (u.username !== "" || u.password !== "") return { ok: false, reason: "No se aceptan URLs con usuario o contraseña" };
  if (allowPrivate()) return { ok: true, url: u };
  if (!ALLOWED_PORTS.has(u.port)) return { ok: false, reason: "Puerto no permitido (solo 80, 443, 8080 y 8443)" };
  if (isPrivateHost(u.hostname)) return { ok: false, reason: "No se aceptan hosts locales o privados" };
  return { ok: true, url: u };
}

export function urlAllowed(raw: string): boolean {
  return checkUrlStatic(raw).ok;
}

// Caché corta de hosts ya validados: evita un DNS por medición y reduce fallos transitorios.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 500;
const resolvedCache = new Map<string, number>();

export function clearUrlGuardCache(): void {
  resolvedCache.clear();
}

/**
 * Validación completa: estática + resolución DNS. Rechaza si CUALQUIER dirección resuelta es privada.
 * Con ALLOW_PRIVATE_URLS=true solo aplica la validación estática (protocolo y credenciales).
 *
 * Limitación conocida: fetch vuelve a resolver el nombre, por lo que un DNS-rebinding con TTL 0 no se
 * elimina del todo (ver docs/decisiones.md).
 */
export async function checkUrl(raw: string): Promise<UrlCheck> {
  const check = checkUrlStatic(raw);
  if (!check.ok || allowPrivate()) return check;

  const host = check.url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (isIP(host) !== 0) return check; // literal IP: ya evaluado por isPrivateHost

  const expires = resolvedCache.get(host);
  if (expires !== undefined && expires > Date.now()) return check;

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: "No se pudo resolver el nombre del host" };
  }
  if (addresses.length === 0) return { ok: false, reason: "No se pudo resolver el nombre del host" };
  if (addresses.some((a) => isPrivateIp(a.address))) {
    return { ok: false, reason: "El host resuelve a una dirección local o privada" };
  }

  if (resolvedCache.size >= CACHE_MAX) resolvedCache.clear();
  resolvedCache.set(host, Date.now() + CACHE_TTL_MS);
  return check;
}
