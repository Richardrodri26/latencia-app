"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useExperiment } from "@/context/ExperimentContext";
import { parseCsv, parseJson, toCsv, type ParseResult, type RowError } from "@/lib/csv";

function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvImportExport() {
  const { measurements, replaceMeasurements, clearData } = useExperiment();
  const [errors, setErrors] = useState<RowError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const stamp = () => new Date().toISOString().slice(0, 10);

  function applyResult(result: ParseResult, source: string) {
    setErrors(result.errors);
    if (result.valid.length === 0) {
      toast.error(`No se importó ninguna fila válida de ${source}.`);
      return;
    }
    if (
      measurements.length > 0 &&
      !window.confirm("La importación reemplaza las mediciones actuales. ¿Continuar?")
    ) {
      return;
    }
    replaceMeasurements(result.valid);
    const msg = `Se importaron ${result.valid.length} mediciones de ${source}.`;
    if (result.errors.length > 0) toast.warning(`${msg} ${result.errors.length} filas inválidas omitidas.`);
    else toast.success(msg);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith(".json");
    applyResult(isJson ? parseJson(text) : parseCsv(text), file.name);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function loadBackup() {
    try {
      const res = await fetch("/data/respaldo.csv", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      applyResult(parseCsv(await res.text()), "respaldo.csv");
    } catch {
      toast.error("No se pudo cargar el dataset de respaldo.");
    }
  }

  const empty = measurements.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={empty} onClick={() => download(`latenciaLab-${stamp()}.csv`, toCsv(measurements), "text/csv")}>
          Exportar CSV
        </Button>
        <Button
          variant="outline"
          disabled={empty}
          onClick={() => download(`latenciaLab-${stamp()}.json`, JSON.stringify(measurements, null, 2), "application/json")}
        >
          Exportar JSON
        </Button>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          Importar CSV / JSON
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          aria-label="Archivo CSV o JSON a importar"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => void loadBackup()}>
          Cargar dataset de respaldo
        </Button>
        <Button
          variant="destructive"
          disabled={empty}
          onClick={() => {
            if (window.confirm("¿Borrar todas las mediciones guardadas en este navegador?")) {
              clearData();
              setErrors([]);
            }
          }}
        >
          Borrar datos
        </Button>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{errors.length} filas inválidas (se omitieron)</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
              {errors.slice(0, 100).map((e, i) => (
                <li key={i}>
                  {e.row === 0 ? "Archivo" : `Fila ${e.row}`}: {e.message}
                </li>
              ))}
              {errors.length > 100 && <li>... y {errors.length - 100} más</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
