"use client";

import { Progress } from "@/components/ui/progress";
import type { Progress as ProgressState, RunStatus } from "@/context/ExperimentContext";

const LABELS: Record<RunStatus, string> = {
  idle: "En espera",
  running: "Midiendo...",
  done: "Terminado",
  cancelled: "Cancelado (se conservó lo medido)",
  error: "Error",
};

export function RunProgress({ status, progress }: { status: RunStatus; progress: ProgressState }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{LABELS[status]}</span>
        <span className="text-muted-foreground tabular-nums">
          {progress.done} / {progress.total} peticiones ({pct}%)
        </span>
      </div>
      <Progress value={pct} aria-label="Progreso de la medición" />
    </div>
  );
}
