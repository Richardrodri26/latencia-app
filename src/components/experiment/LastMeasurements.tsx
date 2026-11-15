"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Measurement } from "@/lib/schemas";

export function LastMeasurements({ measurements }: { measurements: Measurement[] }) {
  const last = measurements.slice(-10).reverse();
  if (last.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay mediciones.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>API</TableHead>
          <TableHead>Fase</TableHead>
          <TableHead className="text-right">Latencia (ms)</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Calentamiento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {last.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="tabular-nums">{m.seq}</TableCell>
            <TableCell>{m.target}</TableCell>
            <TableCell>{m.phase}</TableCell>
            <TableCell className="text-right tabular-nums">
              {m.latencyMs === null ? "—" : m.latencyMs.toFixed(2)}
            </TableCell>
            <TableCell>
              <Badge variant={m.ok ? "secondary" : "destructive"}>
                {m.ok ? `OK ${m.status}` : (m.error ?? "fallo")}
              </Badge>
            </TableCell>
            <TableCell>{m.warmup ? "Sí" : "No"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
