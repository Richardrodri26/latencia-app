import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { checkUrl, checkUrlStatic, clearUrlGuardCache, isPrivateHost, isPrivateIp } from "@/lib/urlGuard.server";
import { MAX_BODY_BYTES, MAX_REDIRECTS, measureOnce } from "@/lib/measure.server";
import { maxCountForBudget, measureRequestSchema, worstCaseBatchMs, MAX_BATCH_BUDGET_MS } from "@/lib/schemas";

beforeEach(() => {
  clearUrlGuardCache();
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("isPrivateIp", () => {
  it("rechaza IPv4 privadas, loopback, link-local, CGNAT, multicast y sin especificar", () => {
    for (const ip of [
      "127.0.0.1", "127.255.0.1", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
      "100.64.0.1", "100.127.255.255", "0.0.0.0", "224.0.0.1", "239.1.1.1", "255.255.255.255", "198.18.0.1",
    ]) expect(isPrivateIp(ip), ip).toBe(true);
  });
  it("acepta IPv4 públicas y bordes", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1", "1.1.1.1"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
  it("rechaza IPv6 locales, ULA, link-local, multicast y IPv4 mapeadas/embebidas", () => {
    for (const ip of [
      "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "febf::1", "ff02::1",
      "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "::ffff:a9fe:a9fe", "::ffff:10.0.0.1",
      "64:ff9b::7f00:1", "2002:7f00:1::1", "2001:db8::1", "2001:0:4136:e378:8000:63bf:3fff:fdd2",
    ]) expect(isPrivateIp(ip), ip).toBe(true);
  });
  it("acepta IPv6 públicas", () => {
    for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) expect(isPrivateIp(ip), ip).toBe(false);
  });
  it("texto no IP falla cerrado", () => {
    expect(isPrivateIp("no-es-ip")).toBe(true);
  });
});

describe("isPrivateHost", () => {
  it("nombres internos y formas alternativas de IP", () => {
    for (const h of ["localhost", "LOCALHOST.", "api.localhost", "foo.internal", "printer.local", "metadata", "[::1]", "0.0.0.0"]) {
      expect(isPrivateHost(h), h).toBe(true);
    }
    expect(isPrivateHost("jsonplaceholder.typicode.com")).toBe(false);
  });
  it("URL normaliza IPs decimales/hex/abreviadas a su forma punteada", () => {
    for (const u of ["http://2130706433/", "http://0x7f.1/", "http://127.1/", "http://[::ffff:7f00:1]/", "http://0177.0.0.1/"]) {
      expect(checkUrlStatic(u).ok, u).toBe(false);
    }
  });
});

describe("checkUrlStatic / checkUrl", () => {
  it("rechaza protocolo, credenciales, puertos y URL larga", () => {
    expect(checkUrlStatic("ftp://example.com/").ok).toBe(false);
    expect(checkUrlStatic("file:///etc/passwd").ok).toBe(false);
    expect(checkUrlStatic("https://user:pass@example.com/").ok).toBe(false);
    expect(checkUrlStatic("https://user@example.com/").ok).toBe(false);
    expect(checkUrlStatic("https://example.com:22/").ok).toBe(false);
    expect(checkUrlStatic("https://example.com:6379/").ok).toBe(false);
    expect(checkUrlStatic(`https://example.com/${"a".repeat(3000)}`).ok).toBe(false);
  });
  it("acepta puertos por defecto y alternos permitidos", () => {
    for (const u of ["https://example.com/", "http://example.com:80/", "https://example.com:443/", "http://example.com:8080/", "https://example.com:8443/x"]) {
      expect(checkUrlStatic(u).ok, u).toBe(true);
    }
  });
  it("rechaza si CUALQUIER dirección resuelta es privada", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "::ffff:127.0.0.1", family: 6 },
    ]);
    const r = await checkUrl("https://mixto.example.com/");
    expect(r.ok).toBe(false);
  });
  it("rechaza si no resuelve y acepta si resuelve a públicas (con caché)", async () => {
    lookupMock.mockRejectedValueOnce(new Error("ENOTFOUND"));
    expect((await checkUrl("https://nadie.example.com/")).ok).toBe(false);
    expect((await checkUrl("https://ok.example.com/")).ok).toBe(true);
    await checkUrl("https://ok.example.com/otra");
    expect(lookupMock).toHaveBeenCalledTimes(2); // la segunda de ok.example.com sale de la caché
  });
  it("ALLOW_PRIVATE_URLS=true permite hosts y puertos locales, pero no credenciales ni otros protocolos", async () => {
    vi.stubEnv("ALLOW_PRIVATE_URLS", "true");
    expect((await checkUrl("http://localhost:3000/api")).ok).toBe(true);
    expect((await checkUrl("http://10.0.0.1:9000/")).ok).toBe(true);
    expect((await checkUrl("http://u:p@localhost/")).ok).toBe(false);
    expect((await checkUrl("ftp://localhost/")).ok).toBe(false);
    expect(lookupMock).not.toHaveBeenCalled();
  });
});

describe("measureOnce: redirecciones, cuerpo y GET", () => {
  const redirect = (to: string, status = 302) => new Response(null, { status, headers: { location: to } });

  it("usa GET, redirect manual y sigue un redirect público sumando saltos", async () => {
    const fetchMock = vi.fn(async (...args: [string, RequestInit?]) => (args[0].endsWith("/a") ? redirect("/b") : new Response("hola")));
    vi.stubGlobal("fetch", fetchMock);
    const r = await measureOnce("https://x.example.com/a", 1000);
    expect(r).toMatchObject({ ok: true, status: 200, bytes: 4, error: null });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["https://x.example.com/a", "https://x.example.com/b"]);
    for (const c of fetchMock.mock.calls) expect(c[1]).toMatchObject({ method: "GET", redirect: "manual" });
  });
  it("redirect a host privado (literal o por DNS) se rechaza sin hacer la petición", async () => {
    for (const target of ["http://169.254.169.254/latest", "http://localhost/admin", "http://[::1]/", "http://interno.example.com/"]) {
      clearUrlGuardCache();
      lookupMock.mockImplementation(async (h: string) => [{ address: h === "interno.example.com" ? "10.1.1.1" : "93.184.216.34", family: 4 }]);
      const fetchMock = vi.fn(async (url: string) => (url.includes("x.example.com") ? redirect(target) : new Response("secreto")));
      vi.stubGlobal("fetch", fetchMock);
      const r = await measureOnce("https://x.example.com/", 1000);
      expect(r).toMatchObject({ ok: false, latencyMs: null, error: "network" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
  it("demasiadas redirecciones -> fallo", async () => {
    const fetchMock = vi.fn(async () => redirect("/loop"));
    vi.stubGlobal("fetch", fetchMock);
    const r = await measureOnce("https://x.example.com/", 1000);
    expect(r.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });
  it("cuerpo mayor al tope -> fallo y se cancela la lectura", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        sent++;
        c.enqueue(chunk);
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    const r = await measureOnce("https://x.example.com/", 5000);
    expect(r).toMatchObject({ ok: false, error: "network" });
    expect(sent * chunk.byteLength).toBeLessThan(MAX_BODY_BYTES + 4 * chunk.byteLength);
  });
  it("content-length declarado mayor al tope -> fallo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { headers: { "content-length": String(MAX_BODY_BYTES + 1) } })));
    expect((await measureOnce("https://x.example.com/", 1000)).ok).toBe(false);
  });
  it("timeout -> error timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new Error("abort"))))),
    );
    const r = await measureOnce("https://x.example.com/", 500);
    expect(r).toMatchObject({ ok: false, error: "timeout" });
  });
});

describe("límites Zod de la solicitud", () => {
  const base = {
    runId: "r", phase: "piloto",
    targets: [
      { id: "A", name: "A", url: "https://a.example.com/" },
      { id: "B", name: "B", url: "https://b.example.com/" },
    ],
    countPerTarget: 2, seqOffset: 0, warmupRemaining: 0, delayMs: 100, timeoutMs: 5000, order: "intercalado",
  };
  const ok = (o: object) => measureRequestSchema.safeParse({ ...base, ...o }).success;

  it("acepta el uso normal (lotes de 2, timeout 5 s, pausa 100 ms)", () => expect(ok({})).toBe(true));
  it("rechaza valores fuera de rango", () => {
    expect(ok({ countPerTarget: 11 })).toBe(false);
    expect(ok({ warmupRemaining: 3 })).toBe(false); // > countPerTarget
    expect(ok({ delayMs: 2001 })).toBe(false);
    expect(ok({ timeoutMs: 15001 })).toBe(false);
    expect(ok({ seqOffset: 100_001 })).toBe(false);
    expect(ok({ runId: "x".repeat(65) })).toBe(false);
    expect(ok({ targets: [base.targets[0]] })).toBe(false);
    expect(ok({ targets: [...base.targets, base.targets[0]] })).toBe(false);
    expect(ok({ targets: [{ ...base.targets[0], url: `https://a.example.com/${"a".repeat(2100)}` }, base.targets[1]] })).toBe(false);
  });
  it("rechaza lotes cuyo peor caso no cabe en el presupuesto", () => {
    expect(worstCaseBatchMs(2, 5000, 100)).toBe(20_300);
    expect(ok({ countPerTarget: 10, timeoutMs: 5000 })).toBe(false); // 20 x 5 s = 100 s
    expect(ok({ countPerTarget: 2, timeoutMs: 15000, delayMs: 2000 })).toBe(false); // 66 s
  });
  it("maxCountForBudget siempre produce lotes válidos", () => {
    for (const timeoutMs of [500, 5000, 15000]) {
      for (const delayMs of [0, 100, 2000]) {
        const c = maxCountForBudget(timeoutMs, delayMs);
        expect(c).toBeGreaterThanOrEqual(1);
        expect(worstCaseBatchMs(c, timeoutMs, delayMs)).toBeLessThanOrEqual(MAX_BATCH_BUDGET_MS);
      }
    }
    expect(maxCountForBudget(15000, 2000)).toBe(1);
    expect(maxCountForBudget(5000, 100)).toBeGreaterThanOrEqual(2);
  });
});
