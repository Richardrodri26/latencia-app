"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/SimpleSelect";
import { useExperiment } from "@/context/ExperimentContext";
import { useResults } from "@/hooks/useResults";
import { sampleSizeMean, sampleSizeProportion } from "@/lib/stats";

const CONF_OPTIONS = [
  { value: "0.9", label: "90%" },
  { value: "0.95", label: "95%" },
  { value: "0.99", label: "99%" },
];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const valid = (x: number) => Number.isFinite(x) && x > 0;

export function SampleSizeCalculator() {
  const router = useRouter();
  const { config, setConfig } = useExperiment();
  const pilot = useResults("piloto");

  const [kind, setKind] = useState<"media" | "proporcion">("media");
  const [conf, setConf] = useState("0.95");
  const [source, setSource] = useState<"A" | "B">("A");
  // null = usar el valor del piloto.
  const [sigmaInput, setSigmaInput] = useState<string | null>(null);
  const [pInput, setPInput] = useState<string | null>(null);
  const [eMean, setEMean] = useState("10");
  const [eProp, setEProp] = useState("0.05");
  const [popInput, setPopInput] = useState("");

  const api = source === "A" ? pilot.a : pilot.b;
  const pilotSd = api.descriptive.sd;
  const pilotP = api.sla.n > 0 ? api.sla.x / api.sla.n : NaN;
  const hasPilot = pilot.total > 0;

  const sigmaDefault = Number.isFinite(pilotSd) ? pilotSd.toFixed(2) : "";
  const pDefault = Number.isFinite(pilotP) ? pilotP.toFixed(4) : "0.5";
  const sigmaText = sigmaInput ?? sigmaDefault;
  const pText = pInput ?? pDefault;

  const confidence = Number(conf);
  const sigma = num(sigmaText);
  const p = num(pText);
  const margin = num(kind === "media" ? eMean : eProp);
  const pop = num(popInput);
  const popSize = valid(pop) ? pop : undefined;

  const okInputs =
    kind === "media" ? valid(sigma) && valid(margin) : Number.isFinite(p) && p >= 0 && p <= 1 && valid(margin);
  const result = !okInputs
    ? null
    : kind === "media"
      ? sampleSizeMean(sigma, margin, confidence, popSize)
      : sampleSizeProportion(p, margin, confidence, popSize);

  const finalN = result ? (result.nFinite ?? result.n) : null;
  const z = result ? result.z.toFixed(4) : "z";

  function useThisN() {
    if (finalN === null) return;
    const n = Math.min(1000, Math.max(10, finalN));
    setConfig({ ...config, phase: "principal", samplesPerTarget: n });
    router.push("/experimento");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora de tamaño de muestra</CardTitle>
        <CardDescription>
          Unidad II. Se redondea siempre hacia arriba. Por defecto usa la desviación estándar y la proporción del piloto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="ss-kind">Parámetro a estimar</FieldLabel>
            <SimpleSelect
              id="ss-kind"
              value={kind}
              onChange={(v) => setKind(v as "media" | "proporcion")}
              options={[
                { value: "media", label: "Media (tiempo de respuesta)" },
                { value: "proporcion", label: "Proporción (incumple SLA)" },
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ss-conf">Confianza</FieldLabel>
            <SimpleSelect id="ss-conf" value={conf} onChange={setConf} options={CONF_OPTIONS} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ss-src">Tomar valores del piloto de</FieldLabel>
            <SimpleSelect
              id="ss-src"
              value={source}
              onChange={(v) => {
                setSource(v as "A" | "B");
                setSigmaInput(null);
                setPInput(null);
              }}
              options={[
                { value: "A", label: `API A · ${config.targets[0].name}` },
                { value: "B", label: `API B · ${config.targets[1].name}` },
              ]}
            />
          </Field>
          {kind === "media" ? (
            <>
              <Field>
                <FieldLabel htmlFor="ss-sigma">σ (desviación estándar, ms)</FieldLabel>
                <Input id="ss-sigma" inputMode="decimal" value={sigmaText} onChange={(e) => setSigmaInput(e.target.value)} />
                <FieldDescription>{hasPilot ? "Precargado con s del piloto." : "Aún no hay piloto: ingresa un valor."}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ss-e">Margen de error E (ms)</FieldLabel>
                <Input id="ss-e" inputMode="decimal" value={eMean} onChange={(e) => setEMean(e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor="ss-p">p (proporción esperada)</FieldLabel>
                <Input id="ss-p" inputMode="decimal" value={pText} onChange={(e) => setPInput(e.target.value)} />
                <FieldDescription>
                  Usa p̂ del piloto o 0.5 (caso más conservador).{" "}
                  <button type="button" className="underline" onClick={() => setPInput("0.5")}>
                    Usar 0.5
                  </button>
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ss-ep">Margen de error E (proporción)</FieldLabel>
                <Input id="ss-ep" inputMode="decimal" value={eProp} onChange={(e) => setEProp(e.target.value)} />
              </Field>
            </>
          )}
          <Field>
            <FieldLabel htmlFor="ss-pop">Tamaño de población N (opcional)</FieldLabel>
            <Input id="ss-pop" inputMode="numeric" placeholder="Infinita" value={popInput} onChange={(e) => setPopInput(e.target.value)} />
            <FieldDescription>Corrección: n′ = n / (1 + (n−1)/N).</FieldDescription>
          </Field>
        </div>

        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Fórmula</p>
          <p className="font-mono">{kind === "media" ? "n = (z(1−α/2) · σ / E)²" : "n = z(1−α/2)² · p(1−p) / E²"}</p>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Sustitución</p>
          {result ? (
            <>
              <p className="font-mono">
                {kind === "media"
                  ? `n = (${z} · ${sigma} / ${margin})² = ${result.raw.toFixed(2)}`
                  : `n = ${z}² · ${p}·(1−${p}) / ${margin}² = ${result.raw.toFixed(2)}`}
              </p>
              {result.nFinite !== undefined && (
                <p className="font-mono">{`n′ = ${result.raw.toFixed(2)} / (1 + (${result.raw.toFixed(2)}−1)/${pop}) → ${result.nFinite}`}</p>
              )}
              <p className="text-2xl font-bold" aria-live="polite">
                n = {finalN} peticiones por API
              </p>
              <p className="text-muted-foreground">
                {result.nFinite !== undefined ? `Sin corrección: ${result.n}. ` : ""}
                Redondeado hacia arriba desde {(result.nFinite !== undefined ? result.raw : result.raw).toFixed(2)}.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Completa valores válidos para calcular.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={finalN === null} onClick={useThisN}>
            Usar este n
          </Button>
          {finalN !== null && finalN > 1000 && (
            <span className="text-sm text-muted-foreground">El experimento admite como máximo 1000; se usará 1000.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
