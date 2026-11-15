"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CsvImportExport } from "@/components/data/CsvImportExport";
import { MeasurementsTable } from "@/components/data/MeasurementsTable";
import { useExperiment } from "@/context/ExperimentContext";

export default function DatosPage() {
  const { hydrated, measurements } = useExperiment();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Datos</h1>
        <p className="text-muted-foreground">
          Todas las mediciones guardadas en este navegador. Puedes exportarlas, importar un archivo o cargar el dataset de
          respaldo si falla internet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar y exportar</CardTitle>
          <CardDescription>
            Formato CSV: id, runId, phase, target, seq, startedAt, latencyMs, status, ok, bytes, error, warmup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CsvImportExport />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mediciones</CardTitle>
        </CardHeader>
        <CardContent>
          {!hydrated ? (
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          ) : measurements.length === 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">Aún no hay datos: ve a Experimento o carga el dataset de respaldo.</p>
              <Link href="/experimento" className={buttonVariants()}>
                Ir a Experimento
              </Link>
            </div>
          ) : (
            <MeasurementsTable data={measurements} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
