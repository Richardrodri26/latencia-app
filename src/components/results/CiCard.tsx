"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "@/components/results/MathText";
import type { Explanation } from "@/lib/ciText";
import { minus } from "@/lib/format";
import type { ConfidenceInterval } from "@/lib/stats";

type Props = {
  title: string;
  ci: ConfidenceInterval | null;
  explanation?: Explanation;
  interpretation?: string;
  unit?: string;
  digits?: number;
  /** Parámetro que se muestra en el resultado: (θ̂ᵢ ≤ θ ≤ θ̂ₛ). Por defecto θ. */
  parameter?: string;
  /** Si es true no se presenta el intervalo como resultado ni su interpretación. */
  notApplicable?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
};

const labelClass = "text-xs font-semibold uppercase text-muted-foreground";

export function CiCard({
  title,
  ci,
  explanation,
  interpretation,
  unit = "",
  digits = 2,
  parameter = "θ",
  notApplicable = false,
  badge,
  children,
}: Props) {
  const show = (x: number) => `${minus(x.toFixed(digits))}${unit ? ` ${unit}` : ""}`;
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
            <div>
              <p className={labelClass}>Fórmula</p>
              <p className="font-mono text-xs break-words">
                <MathText text={explanation.formula} />
              </p>
            </div>

            <ol className="space-y-2">
              {explanation.steps.map((s) => (
                <li key={s.title}>
                  <p className="font-semibold">
                    <MathText text={s.title} />
                  </p>
                  <p className="font-mono text-xs whitespace-pre-line break-words">
                    <MathText text={s.text} />
                  </p>
                </li>
              ))}
              {!notApplicable && interpretation && (
                <li>
                  <p className="font-semibold">Paso {explanation.steps.length + 1} · Interpretación</p>
                  <p>{interpretation}</p>
                </li>
              )}
            </ol>

            {!notApplicable && (
              <div>
                <p className={labelClass}>Resultado</p>
                <p className="text-base font-semibold tabular-nums">
                  ({show(ci.lower)} ≤ {parameter} ≤ {show(ci.upper)}) = {Math.round(ci.confidence * 100)} %
                </p>
                <p className="text-xs text-muted-foreground">Estimación puntual: {show(ci.estimate)}</p>
              </div>
            )}

            {ci.warnings.map((w) => (
              <Alert key={w}>
                <AlertDescription>
                  <span className="font-semibold">Aviso: </span>
                  {w}
                </AlertDescription>
              </Alert>
            ))}

            {notApplicable && (
              <details className="rounded-md border p-2">
                <summary className="cursor-pointer font-medium">Cálculo de referencia (no aplica)</summary>
                <p className="mt-2 font-mono text-xs tabular-nums">
                  [{show(ci.lower)} ; {show(ci.upper)}]
                </p>
              </details>
            )}
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}
