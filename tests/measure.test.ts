import { describe, expect, it } from "vitest";
import { buildOrder, isPrivateHost, shuffle, urlAllowed } from "@/lib/measure.server";
import { measureRequestSchema } from "@/lib/schemas";

describe("measure.server", () => {
  it("intercala A,B,A,B", () => {
    expect(buildOrder(3, "intercalado")).toEqual(["A", "B", "A", "B", "A", "B"]);
  });
  it("aleatorio conserva la cantidad por API", () => {
    const o = buildOrder(5, "aleatorio");
    expect(o.filter((x) => x === "A")).toHaveLength(5);
    expect(o.filter((x) => x === "B")).toHaveLength(5);
  });
  it("shuffle no pierde elementos", () => {
    expect([...shuffle([1, 2, 3, 4, 5])].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("detecta hosts privados", () => {
    for (const h of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "172.31.9.9", "169.254.1.1"]) {
      expect(isPrivateHost(h)).toBe(true);
    }
    for (const h of ["172.15.0.1", "172.32.0.1", "jsonplaceholder.typicode.com", "8.8.8.8"]) {
      expect(isPrivateHost(h)).toBe(false);
    }
  });
  it("urlAllowed rechaza protocolos no http", () => {
    expect(urlAllowed("ftp://example.com")).toBe(false);
    expect(urlAllowed("https://example.com/x")).toBe(true);
    expect(urlAllowed("http://localhost:3000")).toBe(false);
  });
  it("el esquema rechaza lotes inválidos", () => {
    expect(measureRequestSchema.safeParse({}).success).toBe(false);
  });
});
