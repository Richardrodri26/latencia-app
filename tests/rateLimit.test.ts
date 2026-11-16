import { describe, expect, it } from "vitest";
import { clientIp, createLimiter } from "@/lib/rateLimit.server";

describe("createLimiter", () => {
  it("limita por ventana deslizante y da Retry-After", () => {
    let t = 0;
    const l = createLimiter({ maxRequests: 3, windowMs: 60_000, maxConcurrent: 10, now: () => t });
    for (let i = 0; i < 3; i++) {
      const a = l.acquire("ip");
      expect(a.ok).toBe(true);
      if (a.ok) a.release();
      t += 1000;
    }
    const r = l.acquire("ip");
    expect(r).toMatchObject({ ok: false, reason: "rate" });
    if (!r.ok) expect(r.retryAfterSec).toBe(57); // la más vieja (t=0) sale a los 60 s; ahora t=3 s
    t = 60_000;
    expect(l.acquire("ip").ok).toBe(true); // la ventana avanzó
  });
  it("una petición simultánea por IP; release la libera (una sola vez)", () => {
    const l = createLimiter({ maxRequests: 100, windowMs: 60_000, maxConcurrent: 1 });
    const a = l.acquire("ip");
    expect(l.acquire("ip")).toMatchObject({ ok: false, reason: "concurrent" });
    expect(l.acquire("otra").ok).toBe(true);
    if (a.ok) {
      a.release();
      a.release();
    }
    expect(l.acquire("ip").ok).toBe(true);
  });
  it("acota la memoria con muchas claves", () => {
    const l = createLimiter({ maxRequests: 5, windowMs: 1000, maxConcurrent: 1, maxKeys: 10 });
    for (let i = 0; i < 100; i++) {
      const a = l.acquire(`ip-${i}`);
      if (a.ok) a.release();
    }
    expect(l.size()).toBeLessThanOrEqual(11);
  });
});

describe("clientIp", () => {
  it("x-real-ip, luego primer x-forwarded-for, luego unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
