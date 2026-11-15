"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ApiResults } from "@/hooks/useResults";

const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "—");

export function DescriptiveTable({ a, b }: { a: ApiResults; b: ApiResults }) {
  const rows: Array<[string, (r: ApiResults) => string]> = [
    ["n (válidas, sin calentamiento)", (r) => String(r.descriptive.n)],
    ["Media x̄ (ms)", (r) => fmt(r.descriptive.mean)],
    ["Varianza s² (ms²)", (r) => fmt(r.descriptive.variance)],
    ["Desviación estándar s (ms)", (r) => fmt(r.descriptive.sd)],
    ["Mínimo (ms)", (r) => fmt(r.descriptive.min)],
    ["Mediana (ms)", (r) => fmt(r.descriptive.median)],
    ["Percentil 95 (ms)", (r) => fmt(r.descriptive.p95)],
    ["Máximo (ms)", (r) => fmt(r.descriptive.max)],
    ["Asimetría g₁", (r) => fmt(r.descriptive.skewness, 4)],
    ["Coef. de variación s/x̄", (r) => fmt(r.descriptive.cv, 4)],
    ["Error estándar s/√n (ms)", (r) => fmt(Math.sqrt(r.descriptive.variance / r.descriptive.n))],
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estadístico</TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-chart-1" aria-hidden />
              API A · {a.name}
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-chart-2" aria-hidden />
              API B · {b.name}
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([label, get]) => (
          <TableRow key={label}>
            <TableCell>{label}</TableCell>
            <TableCell className="text-right tabular-nums">{get(a)}</TableCell>
            <TableCell className="text-right tabular-nums">{get(b)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
