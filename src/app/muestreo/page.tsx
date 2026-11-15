"use client";

import { CltSimulator } from "@/components/sampling/CltSimulator";
import { SampleSizeCalculator } from "@/components/sampling/SampleSizeCalculator";
import { useExperiment } from "@/context/ExperimentContext";

export default function MuestreoPage() {
  const { hydrated } = useExperiment();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Muestreo</h1>
        <p className="text-muted-foreground">
          Calcula el tamaño de muestra a partir del piloto (Unidad II) y explora la distribución muestral (Unidad I).
        </p>
      </div>
      {hydrated ? (
        <>
          <SampleSizeCalculator />
          <CltSimulator />
        </>
      ) : (
        <p className="text-muted-foreground">Cargando...</p>
      )}
    </div>
  );
}
