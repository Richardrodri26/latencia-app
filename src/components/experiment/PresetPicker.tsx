"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { SimpleSelect } from "@/components/SimpleSelect";
import { CUSTOM_PRESET_KEY, PRESETS, presetKeyForUrl } from "@/lib/presets";

type ErrorList = Array<{ message?: string } | undefined>;

type Props = {
  id: "A" | "B";
  name: string;
  url: string;
  nameErrors: ErrorList;
  urlErrors: ErrorList;
  disabled?: boolean;
  onName: (v: string) => void;
  onUrl: (v: string) => void;
  onBlurName: () => void;
  onBlurUrl: () => void;
};

/** Selector de API predefinida o URL personalizada para un objetivo (A o B). */
export function PresetPicker({
  id,
  name,
  url,
  nameErrors,
  urlErrors,
  disabled,
  onName,
  onUrl,
  onBlurName,
  onBlurUrl,
}: Props) {
  const [custom, setCustom] = useState(() => presetKeyForUrl(url) === CUSTOM_PRESET_KEY);
  const selected = custom ? CUSTOM_PRESET_KEY : presetKeyForUrl(url);
  const color = id === "A" ? "bg-chart-1" : "bg-chart-2";

  const options = [
    ...PRESETS.map((p) => ({ value: p.key, label: p.name })),
    { value: CUSTOM_PRESET_KEY, label: "URL personalizada" },
  ];

  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <span className={`inline-block size-3 rounded-full ${color}`} aria-hidden />
        API {id}
      </legend>
      <Field>
        <FieldLabel htmlFor={`preset-${id}`}>Preset</FieldLabel>
        <SimpleSelect
          id={`preset-${id}`}
          value={selected}
          options={options}
          onChange={(key) => {
            if (key === CUSTOM_PRESET_KEY) {
              setCustom(true);
              return;
            }
            const preset = PRESETS.find((p) => p.key === key);
            if (preset) {
              setCustom(false);
              onName(preset.name);
              onUrl(preset.url);
            }
          }}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`name-${id}`}>Nombre</FieldLabel>
        <Input
          id={`name-${id}`}
          value={name}
          onChange={(e) => onName(e.target.value)}
          onBlur={onBlurName}
          aria-invalid={nameErrors.length > 0}
        />
        <FieldError errors={nameErrors} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`url-${id}`}>URL (GET)</FieldLabel>
        <Input
          id={`url-${id}`}
          type="url"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          onBlur={onBlurUrl}
          aria-invalid={urlErrors.length > 0}
        />
        <FieldError errors={urlErrors} />
      </Field>
    </fieldset>
  );
}
