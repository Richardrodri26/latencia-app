"use client";

import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ApiResults } from "@/hooks/useResults";

const config: ChartConfig = {
  mean: { label: "Media (ms)" },
  A: { label: "API A", color: "var(--chart-1)" },
  B: { label: "API B", color: "var(--chart-2)" },
};

export function CiForestChart({ a, b, slaMs }: { a: ApiResults; b: ApiResults; slaMs: number }) {
  const rows = [a, b]
    .filter((r) => r.mean)
    .map((r) => ({
      api: `${r.id} · ${r.name}`,
      id: r.id,
      mean: r.mean!.estimate,
      error: r.mean!.margin,
      lower: r.mean!.lower,
      upper: r.mean!.upper,
    }));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Datos insuficientes para el gráfico.</p>;

  return (
    <ChartContainer config={config} className="aspect-[16/9] w-full" role="img" aria-label="Medias de A y B con su intervalo de confianza">
      <BarChart data={rows} margin={{ top: 16, right: 16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="api" tickLine={false} axisLine={false} />
        <YAxis unit=" ms" width={64} domain={[0, (max: number) => Math.ceil(Math.max(max, slaMs) * 1.1)]} />
        <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, _n, item) => `${Number(v).toFixed(2)} ms (IC: ${item.payload.lower.toFixed(2)} a ${item.payload.upper.toFixed(2)})`} />} />
        <ReferenceLine y={slaMs} stroke="var(--destructive)" strokeDasharray="4 3" label={{ value: `SLA ${slaMs} ms`, position: "insideTopRight", fill: "var(--destructive)", fontSize: 11 }} />
        <Bar dataKey="mean" radius={4} maxBarSize={80}>
          {rows.map((r) => (
            <Cell key={r.id} fill={`var(--color-${r.id})`} />
          ))}
          <ErrorBar dataKey="error" width={8} strokeWidth={2} stroke="var(--foreground)" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
