"use client";

import { useMemo } from "react";
import { useExperiment } from "@/context/ExperimentContext";
import type { Phase } from "@/lib/schemas";
import { computeResults, type Results } from "@/lib/results";

export type { ApiResults, Comparison, Counted, Results } from "@/lib/results";

/** Todos los cálculos de lib/stats para una fase, memoizados por datos y confianza. */
export function useResults(phase: Phase): Results {
  const { measurements, config, confidence } = useExperiment();
  const slaMs = config.slaMs;
  const nameA = config.targets[0].name;
  const nameB = config.targets[1].name;

  return useMemo(
    () => computeResults(measurements, phase, confidence, slaMs, nameA, nameB),
    [measurements, phase, confidence, slaMs, nameA, nameB],
  );
}
