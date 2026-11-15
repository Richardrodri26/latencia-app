"use client";

import { minus } from "@/lib/format";

type Props = {
  lower: number;
  upper: number;
  estimate: number;
  /** Valor de referencia marcado en la recta (0 para diferencias). */
  reference: number;
  digits?: number;
  label: string;
};

export function NumberLine({ lower, upper, estimate, reference, digits = 2, label }: Props) {
  const lo = Math.min(lower, reference);
  const hi = Math.max(upper, reference);
  const pad = (hi - lo) * 0.15 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const contains = lower <= reference && upper >= reference;
  const f = (v: number) => minus(v.toFixed(digits));
  const ref = minus(String(reference));

  return (
    <figure
      className="py-2"
      role="img"
      aria-label={`${label}: intervalo de ${f(lower)} a ${f(upper)}; ${contains ? "contiene" : "no contiene"} ${ref}`}
    >
      <div className="relative mx-2 h-10">
        <div className="absolute inset-x-0 top-5 h-px bg-border" />
        <div
          className={`absolute top-4 h-3 rounded-full ${contains ? "bg-muted-foreground/60" : "bg-primary"}`}
          style={{ left: pos(lower), width: `calc(${pos(upper)} - ${pos(lower)})` }}
        />
        <div className="absolute top-2 h-7 w-0.5 bg-destructive" style={{ left: pos(reference) }} />
        <span className="absolute top-0 -translate-x-1/2 text-xs font-semibold text-destructive" style={{ left: pos(reference) }}>
          {ref}
        </span>
        <div
          className="absolute top-3.5 size-3.5 -translate-x-1/2 rounded-full border-2 border-background bg-foreground"
          style={{ left: pos(estimate) }}
          title={`Estimación: ${f(estimate)}`}
        />
      </div>
      <figcaption className="flex justify-between px-2 text-xs text-muted-foreground tabular-nums">
        <span>{f(lower)}</span>
        <span>{contains ? `Contiene ${ref}` : `No contiene ${ref}`}</span>
        <span>{f(upper)}</span>
      </figcaption>
    </figure>
  );
}
