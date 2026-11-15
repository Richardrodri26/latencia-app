"use client";

import { Badge } from "@/components/ui/badge";
import { CiCard } from "@/components/results/CiCard";
import { MathText } from "@/components/results/MathText";
import { NumberLine } from "@/components/results/NumberLine";
import type { Comparison, Results } from "@/hooks/useResults";
import { explainDiffMeans, explainDiffProportions } from "@/lib/ciText";
import { interpretDiffMeans, interpretDiffProportions } from "@/lib/stats";

const conditionMet = (x: number, n: number) => {
  const p = x / n;
  return n * p >= 5 && n * (1 - p) >= 5;
};

export function ComparisonPanel({ results, comparison }: { results: Results; comparison: Comparison }) {
  const { a, b } = results;
  const { diffMeans, diffSla } = comparison;

  // La función solo conoce el aviso genérico; aquí se concreta con el nombre de la API afectada.
  const failing = [a, b].filter((r) => !conditionMet(r.sla.x, r.sla.n));
  const diffSlaShown = {
    ...diffSla,
    warnings: failing.map((r) => `En ${r.name} no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5.`),
  };

  return (
    <div className="space-y-4">
      <CiCard
        title="1. IC para la diferencia de medias μ(A) − μ(B)"
        ci={diffMeans}
        explanation={explainDiffMeans(diffMeans, a.descriptive, b.descriptive)}
        interpretation={interpretDiffMeans(diffMeans, a.name, b.name)}
        parameter="μ₁ − μ₂"
        unit="ms"
        badge={<Badge><MathText text={diffMeans.distribution === "z" ? "Z (n_A, n_B ≥ 30)" : "t con Sp (muestras pequeñas)"} /></Badge>}
      >
        <NumberLine
          lower={diffMeans.lower}
          upper={diffMeans.upper}
          estimate={diffMeans.estimate}
          reference={0}
          label="Diferencia de medias"
        />
      </CiCard>

      <CiCard
        title="2. IC para la diferencia de proporciones que incumplen el SLA p(A) − p(B)"
        ci={diffSlaShown}
        explanation={explainDiffProportions(diffSla, a.sla.x, a.sla.n, b.sla.x, b.sla.n)}
        interpretation={interpretDiffProportions(diffSla, a.name, b.name)}
        parameter="p₁ − p₂"
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
