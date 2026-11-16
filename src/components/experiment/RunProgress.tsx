"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import type { Progress as ProgressState, RunStatus } from "@/context/ExperimentContext";
import type { RunNotice } from "@/lib/measurements";

const LABELS: Record<RunStatus, string> = {
  idle: "En espera",
  running: "Midiendo...",
  done: "Terminado",
  cancelled: "Cancelado",
  error: "Error",
};

type Props = {
  status: RunStatus;
  progress: ProgressState;
  waitSeconds?: number | null;
  notice?: RunNotice | null;
};

export function RunProgress({ status, progress, waitSeconds = null, notice = null }: Props) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const label =
    status === "running" && waitSeconds !== null
      ? `Esperando ${waitSeconds} s por el límite de peticiones…`
      : LABELS[status];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm" aria-live="polite">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {progress.done} / {progress.total} peticiones ({pct}%)
        </span>
      </div>
      <Progress value={pct} aria-label="Progreso de la medición" />
      {notice && status !== "running" && (
        <Alert variant={notice.kind === "error" ? "destructive" : "default"}>
          <AlertTitle>{notice.kind === "error" ? "La medición no terminó" : "Ejecución cancelada"}</AlertTitle>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
