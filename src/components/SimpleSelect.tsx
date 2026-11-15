"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Option = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

/** Select de shadcn con lista de opciones simple (muestra la etiqueta, no el valor). */
export function SimpleSelect({ id, value, options, onChange, ariaLabel, className, disabled }: Props) {
  return (
    <Select
      value={value}
      items={options}
      disabled={disabled}
      onValueChange={(v) => {
        if (typeof v === "string") onChange(v);
      }}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
