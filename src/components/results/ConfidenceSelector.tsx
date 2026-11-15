"use client";

import { Button } from "@/components/ui/button";
import { useExperiment } from "@/context/ExperimentContext";
import { CONFIDENCE_LEVELS } from "@/lib/schemas";

export function ConfidenceSelector() {
  const { confidence, setConfidence } = useExperiment();
  return (
    <div role="group" aria-label="Nivel de confianza" className="flex gap-1">
      {CONFIDENCE_LEVELS.map((c) => (
        <Button
          key={c}
          type="button"
          size="sm"
          variant={c === confidence ? "default" : "outline"}
          aria-pressed={c === confidence}
          onClick={() => setConfidence(c)}
        >
          {Math.round(c * 100)}%
        </Button>
      ))}
    </div>
  );
}
