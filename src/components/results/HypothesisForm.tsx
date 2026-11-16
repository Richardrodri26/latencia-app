"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/SimpleSelect";
import { alternativeLabel } from "@/lib/hypothesisText";
import {
  ALPHA_LEVELS,
  DEFAULT_HYPOTHESIS,
  alternativeSchema,
  hypothesisFormSchema,
  type HypothesisFormValues,
} from "@/lib/schemas";

type Props = {
  /** Se llama con los valores ya validados cada vez que cambian. */
  onChange: (values: HypothesisFormValues) => void;
};

/** Envía al padre los valores solo cuando pasan el esquema; si no, el padre conserva el último válido. */
function EmitValid({ values, onChange }: { values: unknown; onChange: Props["onChange"] }) {
  // Pacer: al teclear δ₀ no se recalcula la prueba en cada tecla, solo al pausar 150 ms.
  const emit = useDebouncedCallback(onChange, { wait: 150 });
  useEffect(() => {
    const parsed = hypothesisFormSchema.safeParse(values);
    if (parsed.success) emit(parsed.data);
  }, [values, emit]);
  return null;
}

export function HypothesisForm({ onChange }: Props) {
  const form = useForm({
    defaultValues: DEFAULT_HYPOTHESIS,
    validators: { onChange: hypothesisFormSchema },
  });

  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
      <form.Field name="delta0">
        {(f) => (
          <Field>
            <FieldLabel htmlFor="h-delta0">δ₀ (valor de H₀, ms)</FieldLabel>
            <Input
              id="h-delta0"
              type="number"
              inputMode="decimal"
              step="any"
              value={Number.isNaN(f.state.value) ? "" : f.state.value}
              onChange={(e) => f.handleChange(e.target.value === "" ? NaN : Number(e.target.value))}
              onBlur={f.handleBlur}
              aria-invalid={f.state.meta.errors.length > 0}
              aria-describedby={
                f.state.meta.errors.length > 0 ? "h-delta0-desc h-delta0-error" : "h-delta0-desc"
              }
            />
            <FieldDescription id="h-delta0-desc">0 = sin diferencia</FieldDescription>
            <FieldError id="h-delta0-error" errors={f.state.meta.errors as Array<{ message?: string } | undefined>} />
          </Field>
        )}
      </form.Field>

      <form.Field name="alternative">
        {(f) => (
          <Field>
            <FieldLabel htmlFor="h-alternative">Hipótesis alternativa H₁</FieldLabel>
            <SimpleSelect
              id="h-alternative"
              value={f.state.value}
              options={alternativeSchema.options.map((v) => ({ value: v, label: alternativeLabel[v] }))}
              onChange={(v) => {
                const parsed = alternativeSchema.safeParse(v);
                if (parsed.success) f.handleChange(parsed.data);
              }}
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="alpha">
        {(f) => (
          <Field>
            <FieldLabel>Nivel de significancia α</FieldLabel>
            <div role="group" aria-label="Nivel de significancia α" className="flex gap-1">
              {ALPHA_LEVELS.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={a === f.state.value ? "default" : "outline"}
                  aria-pressed={a === f.state.value}
                  onClick={() => f.handleChange(a)}
                >
                  {Math.round(a * 100)}%
                </Button>
              ))}
            </div>
            <FieldDescription>Si no lo dan, se asume 5 %.</FieldDescription>
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values}>
        {(values) => <EmitValid values={values} onChange={onChange} />}
      </form.Subscribe>
    </form>
  );
}
