"use client";

import { CiCard } from "@/components/results/CiCard";
import { Histogram } from "@/components/results/Histogram";
import type { ApiResults } from "@/hooks/useResults";
import { explainMean, explainProportion } from "@/lib/ciText";
import {
  interpretFailures,
  interpretMean,
  interpretMeanVsSla,
  interpretSla,
  meanDistribution,
} from "@/lib/stats";

export function ApiSection({ api, slaMs }: { api: ApiResults; slaMs: number }) {
  const d = api.descriptive;
  const color = api.id === "A" ? "chart-1" : "chart-2";
  const dot = api.id === "A" ? "bg-chart-1" : "bg-chart-2";
  const meanDist = meanDistribution(d.n, false) === "z" ? "Z con s, n ≥ 30" : "t de Student, n < 30";
  const mean = api.mean;
  const sla = api.sla.ci;
  const failures = api.failures.ci;
  return (
    <section className="space-y-4" aria-labelledby={`api-${api.id}`}>
      <h2 id={`api-${api.id}`} className="flex items-center gap-2 text-xl font-semibold">
        <span className={`inline-block size-3 rounded-full ${dot}`} aria-hidden />
        API {api.id} · {api.name}
      </h2>

      <Histogram data={api.latencies} slaMs={slaMs} color={color} title={`API ${api.id} · ${api.name}`} />

      <CiCard
        title={`IC para la media μ (${meanDist})`}
        ci={mean}
        explanation={mean ? explainMean(mean, d) : undefined}
        interpretation={
          mean ? `${interpretMean(mean, api.name)} ${interpretMeanVsSla(mean, api.name, slaMs)}` : undefined
        }
        parameter="μ"
        unit="ms"
      />
      <CiCard
        title={`IC para la proporción que incumple el SLA (> ${slaMs} ms)`}
        ci={sla}
        explanation={sla ? explainProportion(sla, api.sla.x, api.sla.n) : undefined}
        interpretation={sla ? interpretSla(sla, api.name, slaMs) : undefined}
        notApplicable={sla?.conditionMet === false}
        parameter="p"
        digits={4}
      />
      <CiCard
        title="IC para la tasa de fallos"
        ci={failures}
        explanation={failures ? explainProportion(failures, api.failures.x, api.failures.n) : undefined}
        interpretation={failures ? interpretFailures(failures, api.name) : undefined}
        notApplicable={failures?.conditionMet === false}
        parameter="p"
        digits={4}
      />
    </section>
  );
}
