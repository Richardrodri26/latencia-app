"use client";

import { Badge } from "@/components/ui/badge";
import { CiCard } from "@/components/results/CiCard";
import { NumberLine } from "@/components/results/NumberLine";
import type { Comparison, Results } from "@/hooks/useResults";
import {
  explainDiffProportions,
  explainPooled,
  explainRatio,
  explainWelch,
} from "@/lib/ciText";
import {
  interpretDiffMeans,
  interpretDiffProportions,
  interpretVarianceRatio,
} from "@/lib/stats";

export function ComparisonPanel({ results, comparison }: { results: Results; comparison: Comparison }) {
  const { a, b } = results;
  const { means, diffSla } = comparison;
  const da = a.descriptive;
  const db = b.descriptive;
  const chosenIsPooled = means.equalVariances;
  const secondary = chosenIsPooled ? means.welch : means.pooled;

  const explainDiff = (ci: typeof means.chosen, pooled: boolean) =>
    pooled ? explainPooled(ci, da, db) : explainWelch(ci, da, db);

  return (
    <div className="space-y-4">
      <CiCard
        title="1. Razón de varianzas σ²(A) / σ²(B)"
        ci={means.ratio}
        explanation={explainRatio(means.ratio, da, db)}
        interpretation={interpretVarianceRatio(means.ratio, a.name, b.name)}
        digits={4}
      >
        <NumberLine
          lower={means.ratio.lower}
          upper={means.ratio.upper}
          estimate={means.ratio.estimate}
          reference={1}
          digits={4}
          label="Razón de varianzas"
        />
        <p className="rounded-md bg-muted p-2 text-sm">
          {means.equalVariances
            ? "El intervalo contiene 1: las varianzas pueden considerarse iguales, se usa el IC de la diferencia con varianza agrupada."
            : "El intervalo no contiene 1: las varianzas son distintas, se usa el IC de Welch (gl no entero)."}
        </p>
      </CiCard>

      <CiCard
        title="2. Diferencia de medias μ(A) − μ(B)"
        ci={means.chosen}
        explanation={explainDiff(means.chosen, chosenIsPooled)}
        interpretation={interpretDiffMeans(means.chosen, a.name, b.name)}
        unit="ms"
        badge={<Badge>{chosenIsPooled ? "Agrupado (elegido)" : "Welch (elegido)"}</Badge>}
      >
        <NumberLine
          lower={means.chosen.lower}
          upper={means.chosen.upper}
          estimate={means.chosen.estimate}
          reference={0}
          label="Diferencia de medias"
        />
        <details className="rounded-md border p-2 text-sm">
          <summary className="cursor-pointer font-medium">
            Dato secundario: IC {chosenIsPooled ? "de Welch" : "agrupado"}
          </summary>
          <div className="mt-2 space-y-1">
            <p className="font-mono text-xs break-words">{explainDiff(secondary, !chosenIsPooled).formula}</p>
            <p className="font-mono text-xs break-words">{explainDiff(secondary, !chosenIsPooled).substitution}</p>
            <p className="font-semibold tabular-nums">
              [{secondary.lower.toFixed(2)} ms ; {secondary.upper.toFixed(2)} ms]
            </p>
          </div>
        </details>
      </CiCard>

      <CiCard
        title="3. Diferencia de proporciones que incumplen el SLA p(A) − p(B)"
        ci={diffSla}
        explanation={explainDiffProportions(diffSla, a.sla.x, a.sla.n, b.sla.x, b.sla.n)}
        interpretation={interpretDiffProportions(diffSla, a.name, b.name)}
        digits={4}
      >
        <NumberLine
          lower={diffSla.lower}
          upper={diffSla.upper}
          estimate={diffSla.estimate}
          reference={0}
          digits={4}
          label="Diferencia de proporciones"
        />
      </CiCard>
    </div>
  );
}
