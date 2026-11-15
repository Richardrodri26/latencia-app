import { NextResponse } from "next/server";
import * as z from "zod";
import { measureRequestSchema } from "@/lib/schemas";
import { measureBatch, urlAllowed } from "@/lib/measure.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parsed = measureRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(z.flattenError(parsed.error), { status: 400 });
  }

  const blocked = parsed.data.targets.filter((t) => !urlAllowed(t.url));
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: "URL no permitida: solo http/https y no se aceptan hosts locales o privados (ALLOW_PRIVATE_URLS=false).",
        urls: blocked.map((t) => t.url),
      },
      { status: 400 },
    );
  }

  const measurements = await measureBatch(parsed.data);
  return NextResponse.json({ measurements });
}
