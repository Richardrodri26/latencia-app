"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { minus } from "@/lib/format";
import { buildCurve, statisticLabelPosition } from "@/lib/hypothesisCurve";
import type { DiffMeansTest } from "@/lib/stats";

const config: ChartConfig = {
  za: { label: "Z.A. (zona de aceptación)", color: "var(--chart-1)" },
  rc: { label: "R.C. (región crítica)", color: "var(--destructive)" },
};

export function HypothesisCurve({ test }: { test: DiffMeansTest }) {
  const curve = useMemo(() => buildCurve(test), [test]);
  const sym = test.distribution === "z" ? "Z" : "t";
  const arrow = curve.outside === "left" ? " (fuera del gráfico ←)" : curve.outside === "right" ? " (fuera del gráfico →)" : "";
  const statLabel = `${sym} = ${minus(test.statistic.toFixed(2))}${arrow}`;
  const decision = test.decision === "rechaza" ? "se rechaza H₀" : "se acepta H₀";

  return (
    <div className="space-y-2">
      <ChartContainer
        config={config}
        className="aspect-[16/7] w-full"
        role="img"
        aria-label={`Curva de la variante ${sym} con la zona de aceptación y la región crítica: ${decision}`}
      >
        <AreaChart data={curve.points} margin={{ top: 24, right: 16, left: 16 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-curve.limit, curve.limit]}
            allowDataOverflow
            ticks={curve.ticks}
            interval={0}
            tickFormatter={(v: number) => minus(String(Math.round(v * 100) / 100))}
            tickLine={false}
          />
          <YAxis hide domain={[0, "auto"]} />
          <Area dataKey="za" type="monotone" stroke="var(--color-za)" fill="var(--color-za)" fillOpacity={0.25} isAnimationActive={false} />
          <Area dataKey="rc" type="monotone" stroke="var(--color-rc)" fill="var(--color-rc)" fillOpacity={0.45} isAnimationActive={false} />
          {test.pci !== undefined && (
            <ReferenceLine
              x={test.pci}
              stroke="var(--foreground)"
              strokeDasharray="4 3"
              label={{ value: `P.C.I. = ${minus(test.pci.toFixed(4))}`, position: "top", fontSize: 11, fill: "var(--foreground)" }}
            />
          )}
          {test.pcs !== undefined && (
            <ReferenceLine
              x={test.pcs}
              stroke="var(--foreground)"
              strokeDasharray="4 3"
              label={{ value: `P.C.S. = ${test.pcs.toFixed(4)}`, position: "top", fontSize: 11, fill: "var(--foreground)" }}
            />
          )}
          <ReferenceLine
            x={curve.statisticX}
            stroke="var(--primary)"
            strokeWidth={2}
            label={{
              value: statLabel,
              position: statisticLabelPosition(curve.statisticX),
              fontSize: 11,
              fill: "var(--primary)",
            }}
          />
        </AreaChart>
      </ChartContainer>
      <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: "var(--chart-1)" }} />
          Z.A. (zona de aceptación)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: "var(--destructive)" }} />
          R.C. (región crítica)
        </li>
      </ul>
    </div>
  );
}
