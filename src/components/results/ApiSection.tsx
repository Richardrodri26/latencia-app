"use client";

import { CiCard } from "@/components/results/CiCard";
import { Histogram } from "@/components/results/Histogram";
import type { ApiResults } from "@/hooks/useResults";
import {
  explainMeanT,
  explainMeanZ,
  explainProportion,
  explainSd,
  explainVariance,
} from "@/lib/ciText";
import {
  interpretFailures,
  interpretMean,
  interpretSd,
  interpretSla,
  interpretVariance,
} from "@/lib/stats";

export function ApiSection({ api, slaMs }: { api: ApiResults; slaMs: number }) {
  const d = api.descriptive;
  const color = api.id === "A" ? "chart-1" : "chart-2";
  const dot = api.id === "A" ? "bg-chart-1" : "bg-chart-2";
  return (
    <section className="space-y-4" aria-labelledby={`api-${api.id}`}>
      <h2 id={`api-${api.id}`} className="flex items-center gap-2 text-xl font-semibold">
        <span className={`inline-block size-3 rounded-full ${dot}`} aria-hidden />
        API {api.id} · {api.name}
      </h2>

      <Histogram data={api.latencies} slaMs={slaMs} color={color} title={`API ${api.id} · ${api.name}`} />

      <CiCard
        title="Media μ (t de Student, σ desconocida)"
        ci={api.meanT}
        explanation={api.meanT ? explainMeanT(api.meanT, d) : undefined}
        interpretation={api.meanT ? interpretMean(api.meanT, api.name) : undefined}
        unit="ms"
      />
      <CiCard
        title="Media μ (aproximación normal z)"
        ci={api.meanZ}
        explanation={api.meanZ ? explainMeanZ(api.meanZ, d) : undefined}
        interpretation={api.meanZ ? "Para n grande este intervalo coincide prácticamente con el de la t." : undefined}
        unit="ms"
      />
      <CiCard
        title="Desviación estándar σ (χ²)"
        ci={api.sd}
        explanation={api.sd ? explainSd(api.sd, d) : undefined}
        interpretation={api.sd ? interpretSd(api.sd, api.name) : undefined}
        unit="ms"
      />
      <CiCard
        title="Varianza σ² (χ²)"
        ci={api.variance}
        explanation={api.variance ? explainVariance(api.variance, d) : undefined}
        interpretation={api.variance ? interpretVariance(api.variance, api.name) : undefined}
        unit="ms²"
      />
      <CiCard
        title={`Proporción que incumple el SLA (> ${slaMs} ms)`}
        ci={api.sla.ci}
        explanation={api.sla.ci ? explainProportion(api.sla.ci, api.sla.x, api.sla.n) : undefined}
        interpretation={api.sla.ci ? interpretSla(api.sla.ci, api.name, slaMs) : undefined}
        digits={4}
      />
      <CiCard
        title="Tasa de fallos"
        ci={api.failures.ci}
        explanation={api.failures.ci ? explainProportion(api.failures.ci, api.failures.x, api.failures.n) : undefined}
        interpretation={api.failures.ci ? interpretFailures(api.failures.ci, api.name) : undefined}
        digits={4}
      />
    </section>
  );
}
