"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HypothesisCurve } from "@/components/results/HypothesisCurve";
import { HypothesisForm } from "@/components/results/HypothesisForm";
import { MathText } from "@/components/results/MathText";
import { concludeDiffMeansTest, explainDiffMeansTest, formatPValue } from "@/lib/hypothesisText";
import type { Results } from "@/lib/results";
import { DEFAULT_HYPOTHESIS, type HypothesisFormValues } from "@/lib/schemas";
import type { Explanation } from "@/lib/ciText";
import { canTestDiffMeans, diffMeansTest, type DiffMeansTest } from "@/lib/stats";

const labelClass = "text-xs font-semibold uppercase text-muted-foreground";
const minus = (s: string) => s.replace(/-/g, "−");

export function HypothesisPanel({ results }: { results: Results }) {
  // Estado local de la página (no se persiste). Si el formulario es inválido se conserva el último válido.
  const [values, setValues] = useState<HypothesisFormValues>(DEFAULT_HYPOTHESIS);
  const { a, b } = results;

  const computable = canTestDiffMeans(a.descriptive, b.descriptive);
  const test = useMemo(
    () => (computable ? diffMeansTest({ a: a.descriptive, b: b.descriptive, ...values }) : null),
    [computable, a.descriptive, b.descriptive, values],
  );
  const explanation = test && explainDiffMeansTest(test, a.descriptive, b.descriptive);
  const rejects = test?.decision === "rechaza";
  const sym = test?.distribution === "z" ? "Z" : "t";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Prueba de hipótesis: diferencia de medias (Unidad IV)</span>
          {test && (
            <Badge>
              {test.distribution === "z" ? (
                <MathText text="Z (n_A, n_B ≥ 30)" />
              ) : (
                "t con Sp (muestras pequeñas)"
              )}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          <MathText text="H₀: μ_A − μ_B = δ₀" /> frente a H₁ según el tipo de prueba. Fase {results.phase}; el nivel de confianza
          de los intervalos no afecta a α.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <HypothesisForm onChange={setValues} />

        {!test || !explanation ? (
          <p className="font-semibold" role="status">
            No se puede calcular el estadístico: la variabilidad de ambas muestras es 0.
          </p>
        ) : (
          <TestBody
            test={test}
            explanation={explanation}
            rejects={rejects}
            sym={sym}
            names={[a.name, b.name]}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TestBody({
  test,
  explanation,
  rejects,
  sym,
  names,
}: {
  test: DiffMeansTest;
  explanation: Explanation;
  rejects: boolean;
  sym: string;
  names: [string, string];
}) {
  return (
    <>
        <HypothesisCurve test={test} />

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
        </ol>

        <div>
          <p className={labelClass}>Resultado</p>
          <p className="tabular-nums">
            {sym} = {minus(test.statistic.toFixed(4))}
            {test.pci !== undefined && <> · P.C.I. = {minus(test.pci.toFixed(4))}</>}
            {test.pcs !== undefined && <> · P.C.S. = {test.pcs.toFixed(4)}</>}
            {" · "}p-valor {formatPValue(test.pValue)}
          </p>
          <p className="text-xs text-muted-foreground">
            La variante {test.inCriticalRegion ? "cae en la R.C." : "cae en la Z.A."}
          </p>
        </div>

        <p className={`text-base font-bold ${rejects ? "text-destructive" : ""}`} role="status">
          <MathText text={concludeDiffMeansTest(test, names[0], names[1])} />
        </p>
    </>
  );
}
