"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { SimpleSelect } from "@/components/SimpleSelect";
import { PresetPicker } from "@/components/experiment/PresetPicker";
import { VerifyApis } from "@/components/experiment/VerifyApis";
import { experimentConfigSchema, type ExperimentConfig, type Phase } from "@/lib/schemas";

type ErrorList = Array<{ message?: string } | undefined>;

const DEFAULT_N: Record<Phase, number> = { piloto: 30, principal: 100 };

type NumberProps = {
  id: string;
  label: string;
  hint?: string;
  value: number;
  disabled?: boolean;
  errors: ErrorList;
  onChange: (v: number) => void;
  onBlur: () => void;
};

function NumberField({ id, label, hint, value, disabled, errors, onChange, onBlur }: NumberProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        disabled={disabled}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        onBlur={onBlur}
        aria-invalid={errors.length > 0}
      />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={errors} />
    </Field>
  );
}

type Props = {
  initial: ExperimentConfig;
  isRunning: boolean;
  onRun: (config: ExperimentConfig) => void;
  onCancel: () => void;
};

export function ExperimentForm({ initial, isRunning, onRun, onCancel }: Props) {
  const form = useForm({
    defaultValues: initial,
    validators: { onChange: experimentConfigSchema },
    onSubmit: ({ value }) => onRun(experimentConfigSchema.parse(value)),
  });

  // Los errores solo se muestran cuando el campo fue tocado o se intentó enviar.
  const shown = (meta: { isTouched: boolean; errors: unknown[] }, submitted: number): ErrorList =>
    meta.isTouched || submitted > 0 ? (meta.errors as ErrorList) : [];

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Subscribe selector={(s) => s.submissionAttempts}>
          {(attempts) => (
            <>
              {([0, 1] as const).map((i) => (
                <form.Field key={i} name={`targets[${i}].name`}>
                  {(nameField) => (
                    <form.Field name={`targets[${i}].url`}>
                      {(urlField) => (
                        <PresetPicker
                          id={i === 0 ? "A" : "B"}
                          name={nameField.state.value}
                          url={urlField.state.value}
                          nameErrors={shown(nameField.state.meta, attempts)}
                          urlErrors={shown(urlField.state.meta, attempts)}
                          disabled={isRunning}
                          onName={nameField.handleChange}
                          onUrl={urlField.handleChange}
                          onBlurName={nameField.handleBlur}
                          onBlurUrl={urlField.handleBlur}
                        />
                      )}
                    </form.Field>
                  )}
                </form.Field>
              ))}
            </>
          )}
        </form.Subscribe>
      </div>

      <form.Subscribe selector={(s) => s.submissionAttempts}>
        {(attempts) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <form.Field name="phase">
              {(f) => (
                <Field>
                  <FieldLabel htmlFor="phase">Fase</FieldLabel>
                  <SimpleSelect
                    id="phase"
                    value={f.state.value}
                    disabled={isRunning}
                    options={[
                      { value: "piloto", label: "Piloto" },
                      { value: "principal", label: "Principal" },
                    ]}
                    onChange={(v) => {
                      const next = v as Phase;
                      const current = form.getFieldValue("samplesPerTarget");
                      // Si n sigue en el valor por defecto de la fase anterior, usar el de la nueva.
                      if (current === DEFAULT_N[f.state.value]) {
                        form.setFieldValue("samplesPerTarget", DEFAULT_N[next]);
                      }
                      f.handleChange(next);
                    }}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="samplesPerTarget">
              {(f) => (
                <NumberField
                  id="samplesPerTarget"
                  label="Peticiones por API (n)"
                  hint="Piloto: 30. Principal: el n calculado en Muestreo."
                  value={f.state.value}
                  disabled={isRunning}
                  errors={shown(f.state.meta, attempts)}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                />
              )}
            </form.Field>
            <form.Field name="warmup">
              {(f) => (
                <NumberField
                  id="warmup"
                  label="Calentamiento por API"
                  hint="Peticiones iniciales que se descartan (DNS/TLS en frío)."
                  value={f.state.value}
                  disabled={isRunning}
                  errors={shown(f.state.meta, attempts)}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                />
              )}
            </form.Field>
            <form.Field name="delayMs">
              {(f) => (
                <NumberField
                  id="delayMs"
                  label="Pausa entre peticiones (ms)"
                  value={f.state.value}
                  disabled={isRunning}
                  errors={shown(f.state.meta, attempts)}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                />
              )}
            </form.Field>
            <form.Field name="timeoutMs">
              {(f) => (
                <NumberField
                  id="timeoutMs"
                  label="Tiempo máximo por petición (ms)"
                  value={f.state.value}
                  disabled={isRunning}
                  errors={shown(f.state.meta, attempts)}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                />
              )}
            </form.Field>
            <form.Field name="slaMs">
              {(f) => (
                <NumberField
                  id="slaMs"
                  label="Umbral del SLA (ms)"
                  value={f.state.value}
                  disabled={isRunning}
                  errors={shown(f.state.meta, attempts)}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                />
              )}
            </form.Field>
            <form.Field name="order">
              {(f) => (
                <Field>
                  <FieldLabel htmlFor="order">Orden de las peticiones</FieldLabel>
                  <SimpleSelect
                    id="order"
                    value={f.state.value}
                    disabled={isRunning}
                    options={[
                      { value: "intercalado", label: "Intercalado (A, B, A, B...)" },
                      { value: "aleatorio", label: "Aleatorio" },
                    ]}
                    onChange={(v) => f.handleChange(v as ExperimentConfig["order"])}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="network">
              {(f) => (
                <Field>
                  <FieldLabel htmlFor="network">Red usada (opcional)</FieldLabel>
                  <Input
                    id="network"
                    placeholder="Ej. WiFi de casa"
                    disabled={isRunning}
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    onBlur={f.handleBlur}
                    aria-invalid={shown(f.state.meta, attempts).length > 0}
                  />
                  <FieldError errors={shown(f.state.meta, attempts)} />
                </Field>
              )}
            </form.Field>
          </div>
        )}
      </form.Subscribe>

      <div className="flex flex-wrap items-start gap-4">
        <form.Subscribe selector={(s) => ({ values: s.values, canSubmit: s.canSubmit })}>
          {({ values, canSubmit }) => (
            <>
              <div className="flex gap-2">
                {isRunning ? (
                  <Button type="button" variant="destructive" onClick={onCancel}>
                    Cancelar
                  </Button>
                ) : (
                  <Button type="submit" disabled={!canSubmit}>
                    Ejecutar {values.phase === "piloto" ? "piloto" : "experimento principal"}
                  </Button>
                )}
              </div>
              <VerifyApis targets={values.targets} timeoutMs={values.timeoutMs} disabled={isRunning} />
            </>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
