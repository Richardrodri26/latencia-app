"use client";

import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SimpleSelect } from "@/components/SimpleSelect";
import { useExperiment } from "@/context/ExperimentContext";
import { describe, histogram, normalPdf, resampleMeans } from "@/lib/stats";

const REPLICAS = 1000;
const config: ChartConfig = {
  density: { label: "Densidad", color: "var(--chart-1)" },
  normal: { label: "Normal", color: "var(--destructive)" },
};

type Variable = "media" | "proporcion";

export function CltSimulator() {
  const { measurements, config: cfg } = useExperiment();
  const [api, setApi] = useState<"A" | "B">("A");
  const [variable, setVariable] = useState<Variable>("media");
  const [m, setM] = useState(30);
  const [seedText, setSeedText] = useState("12345");
  const seed = Number.isFinite(Number(seedText)) ? Math.trunc(Number(seedText)) : 12345;

  // Datos: fase principal si existe; si no, piloto.
  const latencies = useMemo(() => {
    const valid = measurements.filter((x) => x.target === api && x.ok && !x.warmup && x.latencyMs !== null);
    const main = valid.filter((x) => x.phase === "principal");
    return (main.length > 0 ? main : valid).map((x) => x.latencyMs as number);
  }, [measurements, api]);

  const sim = useMemo(() => {
    if (latencies.length < 2) return null;
    const source = variable === "media" ? latencies : latencies.map((x) => (x > cfg.slaMs ? 1 : 0));
    const d = describe(source);
    const mu = d.mean;
    const sigma = variable === "media" ? d.sd : Math.sqrt(mu * (1 - mu));
    const means = resampleMeans(source, m, REPLICAS, seed);
    const dm = describe(means);
    const se = sigma / Math.sqrt(m);
    const bins = variable === "media" ? 14 : 2;
    const original = histogram(source, bins, variable === "media" ? undefined : [0, 1]).map((b) => ({
      x: variable === "media" ? Math.round(b.center) : b.center < 0.5 ? "≤ SLA" : "> SLA",
      density: b.density,
    }));
    const hist = histogram(means, 20);
    const sampling = hist.map((b) => ({
      x: Number(b.center.toFixed(variable === "media" ? 1 : 3)),
      density: b.density,
      normal: normalPdf(b.center, mu, se),
    }));
    return { mu, sigma, se, dm, original, sampling };
  }, [latencies, variable, m, seed, cfg.slaMs]);

  const fmt = (x: number) => (variable === "media" ? x.toFixed(2) : x.toFixed(4));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador del Teorema del Límite Central</CardTitle>
        <CardDescription>
          Unidad I. Los datos medidos se toman como población y se remuestrea con reemplazo ({REPLICAS} réplicas, semilla fija para
          reproducir el resultado).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="clt-api">API</FieldLabel>
            <SimpleSelect
              id="clt-api"
              value={api}
              onChange={(v) => setApi(v as "A" | "B")}
              options={[
                { value: "A", label: `API A · ${cfg.targets[0].name}` },
                { value: "B", label: `API B · ${cfg.targets[1].name}` },
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="clt-var">Variable</FieldLabel>
            <SimpleSelect
              id="clt-var"
              value={variable}
              onChange={(v) => setVariable(v as Variable)}
              options={[
                { value: "media", label: "Media del tiempo de respuesta" },
                { value: "proporcion", label: "Proporción que incumple el SLA" },
              ]}
            />
          </Field>
          <Field>
            <FieldLabel id="clt-m-label">Tamaño de muestra m = {m}</FieldLabel>
            <Slider
              aria-labelledby="clt-m-label"
              min={2}
              max={100}
              step={1}
              value={[m]}
              aria-label="Tamaño de muestra m"
              onValueChange={(v) => setM(Array.isArray(v) ? v[0] : v)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="clt-seed">Semilla</FieldLabel>
            <div className="flex gap-2">
              <Input id="clt-seed" inputMode="numeric" value={seedText} onChange={(e) => setSeedText(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => setSeedText(String(Math.floor(Math.random() * 1e6)))}>
                Nueva
              </Button>
            </div>
          </Field>
        </div>

        {!sim ? (
          <p className="text-muted-foreground">Aún no hay datos: ve a Experimento (o carga el respaldo en Datos) para simular.</p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <figure>
                <figcaption className="mb-1 text-sm font-medium">
                  {variable === "media" ? "Latencias originales (sesgadas)" : "Peticiones: cumple / incumple el SLA"}
                </figcaption>
                <ChartContainer config={config} className="aspect-[16/10] w-full" role="img" aria-label="Distribución de los datos originales">
                  <ComposedChart data={sim.original}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} />
                    <YAxis width={52} tickFormatter={(v: number) => v.toFixed(3)} />
                    <Bar dataKey="density" fill="var(--color-density)" radius={2} />
                  </ComposedChart>
                </ChartContainer>
              </figure>
              <figure>
                <figcaption className="mb-1 text-sm font-medium">
                  Distribución de {variable === "media" ? "las medias muestrales x̄" : "las proporciones muestrales p̂"} (m = {m}) con la
                  normal superpuesta
                </figcaption>
                <ChartContainer config={config} className="aspect-[16/10] w-full" role="img" aria-label="Distribución muestral con curva normal">
                  <ComposedChart data={sim.sampling}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} interval="preserveStartEnd" />
                    <YAxis width={52} tickFormatter={(v: number) => v.toFixed(3)} />
                    <Bar dataKey="density" fill="var(--color-density)" radius={2} />
                    <Line dataKey="normal" type="monotone" stroke="var(--color-normal)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ChartContainer>
              </figure>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={variable === "media" ? "Media de los datos x̄" : "Proporción p̂ de los datos"} value={fmt(sim.mu)} />
              <Stat label="Media de las medias muestrales" value={fmt(sim.dm.mean)} />
              <Stat
                label={variable === "media" ? "Error estándar teórico s/√m" : "Error estándar teórico √(p̂(1−p̂)/m)"}
                value={fmt(sim.se)}
              />
              <Stat label="Desviación de las medias simuladas" value={fmt(sim.dm.sd)} />
            </dl>
            <p className="rounded-md bg-muted p-3 text-sm">
              Aunque las latencias no son normales, la distribución de la media muestral se aproxima a la normal cuando m crece (TLC).
              Con m = {m}, la asimetría de las medias simuladas es g₁ = {sim.dm.skewness.toFixed(3)}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
