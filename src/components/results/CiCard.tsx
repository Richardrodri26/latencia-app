"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Explanation } from "@/lib/ciText";
import type { ConfidenceInterval } from "@/lib/stats";

type Props = {
  title: string;
  ci: ConfidenceInterval | null;
  explanation?: Explanation;
  interpretation?: string;
  unit?: string;
  digits?: number;
  badge?: ReactNode;
  children?: ReactNode;
};

export function CiCard({ title, ci, explanation, interpretation, unit = "", digits = 2, badge, children }: Props) {
  const show = (x: number) => `${x.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>{title}</span>
          {badge}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!ci || !explanation ? (
          <p className="text-muted-foreground">Datos insuficientes para calcular este intervalo.</p>
        ) : (
          <>
            <dl className="space-y-1">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Fórmula</dt>
                <dd className="font-mono text-xs break-words">{explanation.formula}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Sustitución</dt>
                <dd className="font-mono text-xs break-words">{explanation.substitution}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Resultado ({Math.round(ci.confidence * 100)}%)
                </dt>
                <dd className="text-base font-semibold tabular-nums">
                  [{show(ci.lower)} ; {show(ci.upper)}]
                  <span className="ml-2 text-sm font-normal text-muted-foreground">estimación: {show(ci.estimate)}</span>
                </dd>
              </div>
            </dl>
            {interpretation && (
              <p>
                <span className="font-semibold">Interpretación: </span>
                {interpretation}
              </p>
            )}
            {ci.warnings.map((w) => (
              <Alert key={w}>
                <AlertDescription>
                  <span className="font-semibold">Advertencia: </span>
                  {w}
                </AlertDescription>
              </Alert>
            ))}
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}
