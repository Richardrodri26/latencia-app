"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { histogram } from "@/lib/stats";

type Props = {
  data: number[];
  slaMs: number;
  color: "chart-1" | "chart-2";
  title: string;
};

export function Histogram({ data, slaMs, color, title }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos para el histograma.</p>;
  }
  const bins = Math.min(20, Math.max(6, Math.ceil(Math.log2(data.length)) + 1));
  // El rango incluye el SLA para poder dibujar la línea vertical siempre.
  const hi = Math.max(Math.max(...data), slaMs * 1.02);
  const lo = Math.min(Math.min(...data), slaMs);
  const bars = histogram(data, bins, [lo, hi]);
  const slaBin = bars.find((b) => slaMs >= b.x0 && slaMs <= b.x1);
  const config: ChartConfig = { count: { label: "Peticiones", color: `var(--${color})` } };
  const rows = bars.map((b) => ({ center: Math.round(b.center), range: `${b.x0.toFixed(0)}–${b.x1.toFixed(0)} ms`, count: b.count }));

  return (
    <figure>
      <figcaption className="mb-1 text-sm font-medium">{title}</figcaption>
      <ChartContainer config={config} className="aspect-[16/9] w-full" role="img" aria-label={`Histograma de latencias de ${title}`}>
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 16 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="center" tickLine={false} axisLine={false} interval="preserveStartEnd" unit=" ms" />
          <YAxis allowDecimals={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent labelKey="range" />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={2} />
          {slaBin && (
            <ReferenceLine
              x={Math.round(slaBin.center)}
              stroke="var(--destructive)"
              strokeDasharray="4 3"
              strokeWidth={2}
              label={{ value: `SLA ${slaMs} ms`, position: "top", fill: "var(--destructive)", fontSize: 11 }}
            />
          )}
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
