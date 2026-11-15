"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_CONFIG } from "@/lib/presets";
import { removePhase } from "@/lib/measurements";
import type { ConfidenceLevel, ExperimentConfig, Measurement, Phase } from "@/lib/schemas";
import { clearState, loadState, saveState } from "@/lib/storage";

export type RunStatus = "idle" | "running" | "done" | "cancelled" | "error";
export type Progress = { done: number; total: number };

type State = {
  config: ExperimentConfig;
  measurements: Measurement[];
  status: RunStatus;
  confidence: ConfidenceLevel;
  progress: Progress;
};

const INITIAL: State = {
  config: DEFAULT_CONFIG,
  measurements: [],
  status: "idle",
  confidence: 0.95,
  progress: { done: 0, total: 0 },
};

// Almacén externo: permite leer localStorage sin desajustes de hidratación
// (el servidor siempre usa INITIAL; el cliente carga lo guardado después de hidratar).
let state: State = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function getSnapshot(): State {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    const saved = loadState();
    if (saved) state = { ...INITIAL, ...saved };
  }
  return state;
}
const getServerSnapshot = () => INITIAL;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(patch: Partial<State>) {
  state = { ...getSnapshot(), ...patch };
  if ("config" in patch || "measurements" in patch || "confidence" in patch) {
    saveState({ config: state.config, measurements: state.measurements, confidence: state.confidence });
  }
  listeners.forEach((l) => l());
}

type Actions = {
  setConfig: (config: ExperimentConfig) => void;
  setConfidence: (c: ConfidenceLevel) => void;
  setStatus: (s: RunStatus) => void;
  setProgress: (p: Progress) => void;
  addMeasurements: (m: Measurement[]) => void;
  replaceMeasurements: (m: Measurement[]) => void;
  removePhaseMeasurements: (phase: Phase) => void;
  clearData: () => void;
};

type ContextValue = State & Actions & { hydrated: boolean };

const ExperimentContext = createContext<ContextValue | null>(null);

const subscribeNoop = () => () => {};

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const setConfig = useCallback((config: ExperimentConfig) => update({ config }), []);
  const setConfidence = useCallback((confidence: ConfidenceLevel) => update({ confidence }), []);
  const setStatus = useCallback((status: RunStatus) => update({ status }), []);
  const setProgress = useCallback((progress: Progress) => update({ progress }), []);
  const addMeasurements = useCallback(
    (m: Measurement[]) => update({ measurements: [...getSnapshot().measurements, ...m] }),
    [],
  );
  const replaceMeasurements = useCallback((m: Measurement[]) => update({ measurements: m }), []);
  const removePhaseMeasurements = useCallback(
    (phase: Phase) => update({ measurements: removePhase(getSnapshot().measurements, phase) }),
    [],
  );
  const clearData = useCallback(() => {
    clearState();
    update({
      measurements: [],
      status: "idle",
      progress: { done: 0, total: 0 },
    });
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      ...snapshot,
      hydrated,
      setConfig,
      setConfidence,
      setStatus,
      setProgress,
      addMeasurements,
      replaceMeasurements,
      removePhaseMeasurements,
      clearData,
    }),
    [
      snapshot,
      hydrated,
      setConfig,
      setConfidence,
      setStatus,
      setProgress,
      addMeasurements,
      replaceMeasurements,
      removePhaseMeasurements,
      clearData,
    ],
  );

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment(): ContextValue {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error("useExperiment debe usarse dentro de ExperimentProvider");
  return ctx;
}
