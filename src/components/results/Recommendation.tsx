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
          Criterio: mejor media (IC de la diferencia sin 0); si hay empate, menor incumplimiento del SLA y luego menor varianza.
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
