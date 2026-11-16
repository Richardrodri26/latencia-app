"use client";

import { useMutation } from "@tanstack/react-query";
import { useThrottledCallback } from "@tanstack/react-pacer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { postMeasure } from "@/hooks/useRunExperiment";
import type { ExperimentConfig } from "@/lib/schemas";

type Props = { targets: ExperimentConfig["targets"]; timeoutMs: number; disabled?: boolean };

/** Hace 1 petición a cada API y muestra estado y latencia (no se guarda). */
export function VerifyApis({ targets, timeoutMs, disabled }: Props) {
  const mutation = useMutation({
    mutationFn: () =>
      postMeasure({
        runId: "verificacion",
        phase: "piloto",
        targets,
        countPerTarget: 1,
        seqOffset: 0,
        warmupRemaining: 0,
        delayMs: 0,
        timeoutMs,
        order: "intercalado",
      }),
  });

  // Pacer: evita ráfagas de clics (solo se atiende el primero cada 2 s).
  const verify = useThrottledCallback(() => mutation.mutate(), { wait: 2000, trailing: false });

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={disabled || mutation.isPending} onClick={() => verify()}>
        {mutation.isPending ? "Verificando..." : "Verificar APIs"}
      </Button>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "No se pudo verificar"}
        </p>
      )}
      {mutation.data && (
        <ul className="space-y-1 text-sm">
          {mutation.data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2">
              <strong>
                API {m.target} ({targets[m.target === "A" ? 0 : 1].name}):
              </strong>
              <Badge variant={m.ok ? "secondary" : "destructive"}>
                {m.ok ? `OK ${m.status}` : `Fallo ${m.error === "http" ? `HTTP ${m.status}` : m.error === "timeout" ? "timeout" : "de red"}`}
              </Badge>
              {m.latencyMs !== null && <span className="tabular-nums">{m.latencyMs.toFixed(2)} ms</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
