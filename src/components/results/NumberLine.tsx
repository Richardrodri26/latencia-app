"use client";

import { minus } from "@/lib/format";
import { numberLineScale } from "@/lib/numberLine";

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
  const { pct } = numberLineScale(lower, upper, reference);
  const contains = lower <= reference && upper >= reference;
  const f = (v: number) => minus(v.toFixed(digits));
  const ref = minus(String(reference));
  const left = (v: number) => `${pct(v)}%`;

  return (
    <figure
      className="py-2"
      role="img"
      aria-label={`${label}: intervalo de ${f(lower)} a ${f(upper)}; estimación ${f(estimate)}; ${contains ? "contiene" : "no contiene"} ${ref}`}
    >
      <div className="relative mx-2 h-12">
        <div className="absolute inset-x-0 top-8 h-px bg-border" />
        <div
          className={`absolute top-[26px] h-3 rounded-full ${contains ? "bg-muted-foreground/60" : "bg-primary"}`}
          style={{ left: left(lower), width: `${pct(upper) - pct(lower)}%` }}
        />
        <div className="absolute top-[18px] h-7 w-0.5 -translate-x-1/2 bg-destructive" style={{ left: left(reference) }} />
        <span className="absolute top-0 -translate-x-1/2 text-xs leading-4 font-semibold text-destructive" style={{ left: left(reference) }}>
          {ref}
        </span>
        <div
          className="absolute top-[25px] size-3.5 -translate-x-1/2 rounded-full border-2 border-background bg-foreground"
          style={{ left: left(estimate) }}
          title={`Estimación: ${f(estimate)}`}
        />
      </div>
      {/* Extremos hacia afuera de la barra: cada valor queda junto a su extremo y nunca se solapan entre sí. */}
      <div className="relative mx-2 h-4 text-xs text-muted-foreground tabular-nums">
        <span className="absolute -translate-x-full pr-1.5 whitespace-nowrap" style={{ left: left(lower) }}>
          {f(lower)}
        </span>
        <span className="absolute pl-1.5 whitespace-nowrap" style={{ left: left(upper) }}>
          {f(upper)}
        </span>
      </div>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground tabular-nums">
        {contains ? `Contiene ${ref}` : `No contiene ${ref}`} · estimación {f(estimate)}
      </figcaption>
    </figure>
  );
}
