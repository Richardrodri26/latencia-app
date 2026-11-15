"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ExperimentForm } from "@/components/experiment/ExperimentForm";
import { RunProgress } from "@/components/experiment/RunProgress";
import { LastMeasurements } from "@/components/experiment/LastMeasurements";
import { useExperiment } from "@/context/ExperimentContext";
import { useRunExperiment } from "@/hooks/useRunExperiment";
import { countPhase, replaceMessage } from "@/lib/measurements";
import type { ExperimentConfig } from "@/lib/schemas";

export default function ExperimentoPage() {
  const { hydrated, config, measurements, status, progress, clearData } = useExperiment();
  const { run, cancel, isRunning } = useRunExperiment();

  // Reemplazar es destructivo: si la fase ya tiene datos, se pide confirmación antes de medir.
  const handleRun = (cfg: ExperimentConfig) => {
    const existing = countPhase(measurements, cfg.phase);
    if (existing > 0 && !window.confirm(replaceMessage(cfg.phase, existing))) return;
    run(cfg);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Experimento</h1>
        <p className="text-muted-foreground">
          Configura las dos APIs y ejecuta el piloto (30 peticiones por API) o el experimento principal. Las
          peticiones se miden desde el servidor, una a la vez, de forma intercalada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Los valores se guardan en este navegador.</CardDescription>
        </CardHeader>
        <CardContent>
          {hydrated ? (
            <ExperimentForm initial={config} isRunning={isRunning} onRun={handleRun} onCancel={cancel} />
          ) : (
            <p className="text-sm text-muted-foreground">Cargando configuración...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RunProgress status={status} progress={progress} />
          <h2 className="text-sm font-semibold">Últimas 10 mediciones</h2>
          <LastMeasurements measurements={measurements} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRunning || measurements.length === 0}
            onClick={() => {
              if (window.confirm("¿Borrar todas las mediciones guardadas en este navegador?")) clearData();
            }}
          >
            Borrar datos
          </Button>
          {(status === "done" || status === "cancelled") && measurements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href="/muestreo" className={buttonVariants({ variant: "outline" })}>
                Calcular tamaño de muestra
              </Link>
              <Link href="/resultados" className={buttonVariants()}>
                Ver resultados
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
