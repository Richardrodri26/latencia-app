"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { SimpleSelect } from "@/components/SimpleSelect";
import { ApiSection } from "@/components/results/ApiSection";
import { CiForestChart } from "@/components/results/CiForestChart";
import { ComparisonPanel } from "@/components/results/ComparisonPanel";
import { ConfidenceSelector } from "@/components/results/ConfidenceSelector";
import { DescriptiveTable } from "@/components/results/DescriptiveTable";
import { HypothesisPanel } from "@/components/results/HypothesisPanel";
import { Recommendation } from "@/components/results/Recommendation";
import { useExperiment } from "@/context/ExperimentContext";
import { useResults } from "@/hooks/useResults";
import type { Phase } from "@/lib/schemas";

export default function ResultadosPage() {
  const { hydrated, measurements } = useExperiment();
  const [chosenPhase, setPhase] = useState<Phase | null>(null);
  // Por defecto: principal si hay datos; si no, piloto.
  const phase: Phase =
    chosenPhase ?? (!measurements.some((m) => m.phase === "principal") && measurements.some((m) => m.phase === "piloto") ? "piloto" : "principal");
  const results = useResults(phase);

  const hasAny = measurements.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Resultados</h1>
        <p className="text-muted-foreground">
          Descriptivos, intervalos de confianza por API y comparación entre A y B. Solo se usan mediciones con ok = true y
          sin calentamiento para las latencias.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <Field className="w-48">
          <FieldLabel htmlFor="res-phase">Fase</FieldLabel>
          <SimpleSelect
            id="res-phase"
            value={phase}
            onChange={(v) => setPhase(v as Phase)}
            options={[
              { value: "principal", label: "Principal" },
              { value: "piloto", label: "Piloto" },
            ]}
          />
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Nivel de confianza</span>
          <ConfidenceSelector />
        </div>
      </div>

      {!hydrated ? (
        <p className="text-muted-foreground">Cargando datos...</p>
      ) : !hasAny || results.total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay datos</CardTitle>
            <CardDescription>
              {hasAny
                ? `No hay mediciones de la fase ${phase}. Cambia de fase o ejecuta esa fase en Experimento.`
                : "Ve a Experimento para medir las APIs, o carga el dataset de respaldo en Datos."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/experimento" className={buttonVariants()}>
              Ir a Experimento
            </Link>
            <Link href="/datos" className={buttonVariants({ variant: "outline" })}>
              Ir a Datos
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Descriptivos</CardTitle>
              <CardDescription>
                Fase {phase} · SLA = {results.slaMs} ms · {results.total} mediciones en total
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <DescriptiveTable a={results.a} b={results.b} />
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-2">
            <ApiSection api={results.a} slaMs={results.slaMs} />
            <ApiSection api={results.b} slaMs={results.slaMs} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Medias con su intervalo de confianza</CardTitle>
              <CardDescription>{"Las barras de error muestran el IC de la media (Z si n ≥ 30, t si n < 30); la línea roja es el SLA."}</CardDescription>
            </CardHeader>
            <CardContent>
              <CiForestChart a={results.a} b={results.b} slaMs={results.slaMs} />
            </CardContent>
          </Card>

          {results.comparison ? (
            <>
              <section className="space-y-4" aria-labelledby="comparacion">
                <h2 id="comparacion" className="text-xl font-semibold">
                  Comparación A vs. B
                </h2>
                <ComparisonPanel results={results} comparison={results.comparison} />
              </section>
              <HypothesisPanel results={results} />
              <Recommendation comparison={results.comparison} />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Comparación A vs. B</CardTitle>
                <CardDescription>Se necesitan al menos 2 mediciones válidas por API para comparar.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
