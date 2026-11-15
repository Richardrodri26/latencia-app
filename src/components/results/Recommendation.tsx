"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Comparison } from "@/hooks/useResults";

export function Recommendation({ comparison }: { comparison: Comparison }) {
  const r = comparison.recommendation;
  return (
    <Card className={r.winner ? "border-primary" : undefined}>
      <CardHeader>
        <CardTitle>Recomendación</CardTitle>
        <CardDescription>
          Criterio: diferencia de medias (si su IC no contiene al cero, gana la más rápida); si lo contiene, diferencia de proporciones que incumplen el SLA; si ambos contienen al cero, no hay evidencia suficiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium" role="status">
          {r.text}
        </p>
      </CardContent>
    </Card>
  );
}
