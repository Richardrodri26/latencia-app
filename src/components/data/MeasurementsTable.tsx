"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { SimpleSelect } from "@/components/SimpleSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Measurement } from "@/lib/schemas";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, text: sortFn_text },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const helper = createColumnHelper<typeof features, Measurement>();

// Comparación exacta por texto (para filtros tipo "select").
const equalsText = (row: { getValue: <T>(id: string) => T }, columnId: string, value: unknown) =>
  String(row.getValue<unknown>(columnId)) === String(value);

const fmtNullable = (v: number | string | null, digits?: number) =>
  v === null ? "—" : typeof v === "number" && digits !== undefined ? v.toFixed(digits) : String(v);

const columns = helper.columns([
  helper.accessor("seq", { header: "seq", sortFn: "basic" }),
  helper.accessor("phase", { header: "fase", filterFn: equalsText }),
  helper.accessor("target", { header: "API", filterFn: equalsText }),
  helper.accessor("latencyMs", {
    header: "latencia (ms)",
    sortFn: "basic",
    sortUndefined: "last",
    cell: (info) => fmtNullable(info.getValue(), 2),
  }),
  helper.accessor("status", { header: "estado HTTP", sortFn: "basic", cell: (info) => fmtNullable(info.getValue()) }),
  helper.accessor("ok", { header: "ok", filterFn: equalsText, cell: (info) => (info.getValue() ? "sí" : "no") }),
  helper.accessor("bytes", { header: "bytes", sortFn: "basic", cell: (info) => fmtNullable(info.getValue()) }),
  helper.accessor("error", { header: "error", cell: (info) => fmtNullable(info.getValue()) }),
  helper.accessor("warmup", { header: "calentamiento", cell: (info) => (info.getValue() ? "sí" : "no") }),
  helper.accessor("startedAt", { header: "fecha y hora", sortFn: "text" }),
]);

const ALL = "all";

export function MeasurementsTable({ data }: { data: Measurement[] }) {
  const table = useTable({
    features,
    columns,
    data,
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
  });

  const setFilter = (id: string, value: string) => table.getColumn(id)?.setFilterValue(value === ALL ? undefined : value);
  const filterValue = (id: string) => String(table.getColumn(id)?.getFilterValue() ?? ALL);

  const pageCount = table.getPageCount();
  const pageIndex = table.state.pagination.pageIndex;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="f-target">Filtrar por API</FieldLabel>
          <SimpleSelect
            id="f-target"
            value={filterValue("target")}
            onChange={(v) => setFilter("target", v)}
            options={[
              { value: ALL, label: "Todas" },
              { value: "A", label: "API A" },
              { value: "B", label: "API B" },
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="f-phase">Filtrar por fase</FieldLabel>
          <SimpleSelect
            id="f-phase"
            value={filterValue("phase")}
            onChange={(v) => setFilter("phase", v)}
            options={[
              { value: ALL, label: "Todas" },
              { value: "piloto", label: "Piloto" },
              { value: "principal", label: "Principal" },
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="f-ok">Filtrar por estado</FieldLabel>
          <SimpleSelect
            id="f-ok"
            value={filterValue("ok")}
            onChange={(v) => setFilter("ok", v)}
            options={[
              { value: ALL, label: "Todos" },
              { value: "true", label: "Correctas (ok)" },
              { value: "false", label: "Fallidas" },
            ]}
          />
        </Field>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium hover:underline"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Ordenar por ${String(header.column.columnDef.header)}`}
                        >
                          <table.FlexRender header={header} />
                          <span aria-hidden>{sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : ""}</span>
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  Sin filas para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="tabular-nums">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {table.getFilteredRowModel().rows.length} de {data.length} mediciones · Página {pageCount === 0 ? 0 : pageIndex + 1} de{" "}
          {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
