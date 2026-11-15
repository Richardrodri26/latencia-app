import { z } from "zod";
import type { Alternative } from "@/lib/stats/hypothesis";

// Mensajes de validación de Zod en español.
z.config(z.locales.es());

export const phaseSchema = z.enum(["piloto", "principal"]);
export const orderSchema = z.enum(["intercalado", "aleatorio"]);
export const targetIdSchema = z.enum(["A", "B"]);

export const targetSchema = z.object({
  id: targetIdSchema,
  name: z.string().min(1, "El nombre es obligatorio").max(40, "Máximo 40 caracteres"),
  url: z.url({ protocol: /^https?$/, error: "Ingresa una URL válida (http o https)" }),
});

export const experimentConfigSchema = z.object({
  phase: phaseSchema,
  targets: z.tuple([targetSchema, targetSchema]),
  samplesPerTarget: z.number().int().min(10, "Mínimo 10").max(1000, "Máximo 1000"),
  warmup: z.number().int().min(0, "Mínimo 0").max(10, "Máximo 10"),
  delayMs: z.number().int().min(0, "Mínimo 0").max(2000, "Máximo 2000"),
  timeoutMs: z.number().int().min(500, "Mínimo 500").max(15000, "Máximo 15000"),
  slaMs: z.number().int().min(10, "Mínimo 10").max(10000, "Máximo 10000"),
  order: orderSchema,
  network: z.string().max(60, "Máximo 60 caracteres").optional(),
});

export const measurementSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  phase: phaseSchema,
  target: targetIdSchema,
  seq: z.number().int(),
  startedAt: z.iso.datetime(),
  latencyMs: z.number().nonnegative().nullable(),
  status: z.number().int().nullable(),
  ok: z.boolean(),
  bytes: z.number().int().nullable(),
  error: z.enum(["timeout", "network", "http"]).nullable(),
  warmup: z.boolean(),
});

export const measureRequestSchema = z.object({
  runId: z.string().min(1),
  phase: phaseSchema,
  targets: z.tuple([targetSchema, targetSchema]),
  countPerTarget: z.number().int().min(1).max(20),
  seqOffset: z.number().int().min(0),
  warmupRemaining: z.number().int().min(0).max(10),
  delayMs: z.number().int().min(0).max(2000),
  timeoutMs: z.number().int().min(500).max(15000),
  order: orderSchema,
});

export type Phase = z.infer<typeof phaseSchema>;
export type TargetId = z.infer<typeof targetIdSchema>;
export type Target = z.infer<typeof targetSchema>;
export type ExperimentConfig = z.infer<typeof experimentConfigSchema>;
export type Measurement = z.infer<typeof measurementSchema>;
export type MeasureRequest = z.infer<typeof measureRequestSchema>;

/** Estado persistido en localStorage (clave latencialab:v1). */
export const persistedStateSchema = z.object({
  config: experimentConfigSchema,
  measurements: z.array(measurementSchema),
  confidence: z.union([z.literal(0.9), z.literal(0.95), z.literal(0.99)]),
});
export type PersistedState = z.infer<typeof persistedStateSchema>;

export const CONFIDENCE_LEVELS = [0.9, 0.95, 0.99] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Prueba de hipótesis de la diferencia de medias (docs/06): α de la tabla de clase. */
export const ALPHA_LEVELS = [0.01, 0.05, 0.1] as const;
export type AlphaLevel = (typeof ALPHA_LEVELS)[number];

export const alternativeSchema = z.enum(["menor", "mayor", "distinto"]);

export const hypothesisFormSchema = z.object({
  delta0: z
    .number({ error: "Ingresa un número (ms)" })
    .min(-10000, "Mínimo −10000")
    .max(10000, "Máximo 10000"),
  alternative: alternativeSchema,
  alpha: z.union([z.literal(0.01), z.literal(0.05), z.literal(0.1)]),
});
export type HypothesisFormValues = z.infer<typeof hypothesisFormSchema>;

export const DEFAULT_HYPOTHESIS: HypothesisFormValues = {
  delta0: 0,
  alternative: "distinto",
  alpha: 0.05,
};

// `lib/stats` no importa Zod: este chequeo de tipos garantiza que `Alternative` y el esquema coinciden.
const _alternativeMatches: z.infer<typeof alternativeSchema> extends Alternative
  ? Alternative extends z.infer<typeof alternativeSchema>
    ? true
    : never
  : never = true;
void _alternativeMatches;
