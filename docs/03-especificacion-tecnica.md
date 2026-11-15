# 03 · Especificación técnica

## Stack

| Pieza | Uso |
|-------|-----|
| **Next.js** (última versión estable, App Router, `src/`) | UI y Route Handler que mide las latencias |
| **TypeScript** (strict) | Todo el código |
| **Tailwind CSS** | Estilos |
| **shadcn/ui** | Componentes de UI y gráficos (`chart`, basado en Recharts) |
| **Zod** (v4) | Validación de la configuración, el body de la API y el CSV importado |
| **TanStack Query** | Mutación que ejecuta el experimento por lotes con progreso y cancelación |
| **TanStack Form** | Formulario de configuración (validación con los esquemas Zod vía Standard Schema) |
| **TanStack Table** | Tabla de mediciones con orden, filtro y paginación |
| **jstat** | Cuantiles z, t, χ² y F |
| **Vitest** | Pruebas de `lib/stats` |

> Para los formularios no usar el componente `Form` de shadcn (está atado a react‑hook‑form). Usar las primitivas `Input`, `Select`, `Label` y `Field` con TanStack Form.

## Arquitectura

```
Navegador (React)                                 Servidor Next.js (Node)
┌──────────────────────────┐   POST /api/measure  ┌──────────────────────────┐
│ ExperimentForm (TS Form) │ ───── lote ────────▶ │ route.ts                 │
│ useRunExperiment (TQ)    │ ◀──── Measurement[] ─│  valida con Zod          │
│ ExperimentContext + LS   │                      │  fetch + performance.now │
│ lib/stats (funciones     │                      └────────────┬─────────────┘
│ puras) → resultados / IC │                                   │ GET
└──────────────────────────┘                          API A / API B (públicas)
```

- **La medición se hace en el servidor (Route Handler)**. Así se evita CORS y las mediciones son homogéneas.
- **El análisis se hace en el cliente**: `lib/stats` son funciones puras que se recalculan con `useMemo` al cambiar el nivel de confianza.
- **Para la sustentación se ejecuta en local** (`npm run dev` o `npm run build && npm start`). En Vercel la medición saldría desde el datacenter de Vercel, no desde el equipo y la red de los integrantes.

## Estructura de carpetas

```
src/
  app/
    layout.tsx                 # Providers (QueryClient, ExperimentProvider), navbar
    page.tsx                   # Inicio: caso problema y pasos de uso
    experimento/page.tsx       # Configurar y ejecutar (piloto y principal)
    datos/page.tsx             # Tabla, exportar e importar CSV/JSON
    resultados/page.tsx        # Descriptivos, gráficos, IC y comparación A vs. B
    muestreo/page.tsx          # Unidad I (TLC) y Unidad II (tamaño de muestra)
    api/measure/route.ts       # Mide un lote de peticiones
  components/
    ui/                        # shadcn
    experiment/ExperimentForm.tsx, RunProgress.tsx, PresetPicker.tsx
    data/MeasurementsTable.tsx, CsvImportExport.tsx
    results/DescriptiveTable.tsx, Histogram.tsx, CiCard.tsx, CiForestChart.tsx,
            ComparisonPanel.tsx, Recommendation.tsx, ConfidenceSelector.tsx
    sampling/CltSimulator.tsx, SampleSizeCalculator.tsx
  context/ExperimentContext.tsx
  hooks/useRunExperiment.ts, useResults.ts
  lib/
    schemas.ts                 # Esquemas Zod y tipos inferidos
    presets.ts                 # APIs predefinidas
    measure.server.ts          # measureOnce / measureBatch (solo servidor)
    csv.ts                     # Serializar y parsear CSV
    storage.ts                 # localStorage con try/catch
    stats/descriptive.ts, distributions.ts, intervals.ts,
          sampleSize.ts, sampling.ts, interpret.ts, index.ts
  types/jstat.d.ts             # Solo si jstat no trae tipos
tests/stats/*.test.ts
public/data/respaldo.csv       # Dataset de respaldo listo, recolectado con la app (14-nov-2026)
```

## Modelo de datos (`lib/schemas.ts`)

```ts
import { z } from 'zod';

export const targetSchema = z.object({
  id: z.enum(['A', 'B']),
  name: z.string().min(1).max(40),
  url: z.url({ protocol: /^https?$/ }),
});

export const experimentConfigSchema = z.object({
  phase: z.enum(['piloto', 'principal']),
  targets: z.tuple([targetSchema, targetSchema]),
  samplesPerTarget: z.number().int().min(10).max(1000),   // piloto: 30 por defecto; principal: 100
  warmup: z.number().int().min(0).max(10).default(3),
  delayMs: z.number().int().min(0).max(2000).default(100),
  timeoutMs: z.number().int().min(500).max(15000).default(5000),
  slaMs: z.number().int().min(10).max(10000).default(300),
  order: z.enum(['intercalado', 'aleatorio']).default('intercalado'),
  network: z.string().max(60).optional(),                 // ej. "WiFi de casa" (solo en la configuración, no en el CSV)
});

export const measurementSchema = z.object({
  id: z.string(),
  runId: z.string(),
  phase: z.enum(['piloto', 'principal']),
  target: z.enum(['A', 'B']),
  seq: z.number().int(),          // orden global dentro del run
  startedAt: z.iso.datetime(),
  latencyMs: z.number().nonnegative().nullable(),
  status: z.number().int().nullable(),
  ok: z.boolean(),                // true solo si status 2xx y sin error
  bytes: z.number().int().nullable(),
  error: z.enum(['timeout', 'network', 'http']).nullable(),
  warmup: z.boolean(),
});

export const measureRequestSchema = z.object({
  runId: z.string(),
  phase: z.enum(['piloto', 'principal']),
  targets: z.tuple([targetSchema, targetSchema]),
  countPerTarget: z.number().int().min(1).max(20),   // tamaño del lote
  seqOffset: z.number().int().min(0),
  warmupRemaining: z.number().int().min(0).max(10),  // cuántas de este lote se marcan warmup por API
  delayMs: z.number().int().min(0).max(2000),
  timeoutMs: z.number().int().min(500).max(15000),
  order: z.enum(['intercalado', 'aleatorio']),
});
```

## Contrato `POST /api/measure`

- `export const runtime = 'nodejs'` y `export const dynamic = 'force-dynamic'`.
- **Body:** `measureRequestSchema`. Si no es válido → `400` con `z.flattenError(error)`.
- **Respuesta 200:** `{ measurements: Measurement[] }`.
- **Orden:** `intercalado` = A, B, A, B…; `aleatorio` = barajar (Fisher‑Yates) la lista de peticiones del lote.
- Pausa de `delayMs` entre peticiones consecutivas. Las peticiones son **secuenciales**, nunca en paralelo, porque la concurrencia distorsiona las latencias.
- **Seguridad:** aceptar solo `http`/`https`. Si `process.env.ALLOW_PRIVATE_URLS !== 'true'`, rechazar hosts `localhost`, `127.*`, `10.*`, `192.168.*`, `172.16–31.*` y `169.254.*`.

Medición de una petición (`measure.server.ts`):

```ts
export async function measureOnce(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'cache-control': 'no-cache', 'user-agent': 'LatenciaLab/1.0 (proyecto academico)' },
    });
    const body = await res.arrayBuffer();              // incluir la descarga completa
    const latencyMs = performance.now() - start;
    return { latencyMs, status: res.status, ok: res.ok, bytes: body.byteLength,
             error: res.ok ? null : ('http' as const) };
  } catch {
    return { latencyMs: null, status: null, ok: false, bytes: null,
             error: controller.signal.aborted ? ('timeout' as const) : ('network' as const) };
  } finally {
    clearTimeout(timer);
  }
}
```

## Ejecución por lotes (`hooks/useRunExperiment.ts`)

- `useMutation` de TanStack Query cuyo `mutationFn` recorre lotes: `totalPorAPI = warmup + samplesPerTarget`, en lotes de 2 por API (`BATCH_SIZE`; el contrato admite hasta 20, ver decisión 27). El cliente espera `delayMs` entre lotes. Ejecutar una fase reemplaza sus mediciones previas (decisión 28).
- Tras cada lote se agregan las mediciones al contexto y se actualiza el progreso (`medidas / total`) en `RunProgress` (componente `Progress` de shadcn).
- Botón **Cancelar** con `AbortController` en el cliente. Las mediciones ya recibidas se conservan.
- Al terminar, `toast` (sonner) con un resumen: n válidos y fallos por API.

## Estado y persistencia

- `ExperimentContext` guarda `config`, `measurements[]`, `status` (`idle | running | done | cancelled | error`) y `confidence`.
- Se persiste en `localStorage` con la clave `latencialab:v1`, envolviendo lectura y escritura en `try/catch`. Botón **"Borrar datos"**.
- `useResults(phase)` filtra las mediciones (piloto o principal) y devuelve todos los cálculos de `lib/stats`, memoizados.

## Páginas

**`/` Inicio**: caso problema, pregunta, los 4 pasos (Piloto → Tamaño de muestra → Experimento → Resultados) y la tabla de temas por unidad.

**`/experimento`**
- `ExperimentForm` (TanStack Form + `experimentConfigSchema`): selector de fase, `PresetPicker` para A y B (preset o URL personalizada), n, warmup, pausa, timeout, SLA, orden y red.
- Botón **"Verificar APIs"**: hace 1 petición a cada API y muestra estado y latencia.
- Botón **Ejecutar** con progreso en vivo, y una tabla con las últimas 10 mediciones.

**`/datos`**
- `MeasurementsTable` (TanStack Table): columnas `seq, phase, target, latencyMs, status, ok, bytes, error, warmup, startedAt`; orden por columna, filtro por API, fase y estado; paginación de 25 filas.
- Exportar CSV y JSON. Importar CSV validado con `measurementSchema`, mostrando las filas inválidas.
- Botón **"Cargar dataset de respaldo"** (`/data/respaldo.csv`), por si falla internet en la sustentación.

**`/resultados`** (fase principal por defecto, con selector de fase)
- `ConfidenceSelector` (90 / 95 / 99%) que recalcula todo.
- Por API: `DescriptiveTable`, `Histogram` con una línea vertical en el SLA, y `CiCard` para la media (t y z), la desviación (con varianza), la proporción que incumple el SLA y la tasa de fallos. Cada tarjeta incluye fórmula, sustitución numérica, resultado, interpretación y advertencias.
- `CiForestChart`: medias de A y B con barras de error del IC (Recharts `ErrorBar`).
- `ComparisonPanel`: IC de la razón de varianzas → elección Welch/agrupado → IC de la diferencia de medias, e IC de la diferencia de proporciones del SLA, sobre una recta numérica con el 0 (o el 1) marcado.
- `Recommendation`: conclusión final según `interpret.ts`.

**`/muestreo`**
- `SampleSizeCalculator`: para media y para proporción, precargado con `s` y `p̂` del piloto. Muestra fórmula y sustitución. Botón **"Usar este n"** que lleva a `/experimento` con el valor precargado.
- `CltSimulator`: slider `m`, selector de API y variable (media o proporción), histogramas y curva normal (ver la especificación estadística).

## Formato CSV

Encabezado exacto, coma como separador, punto decimal y vacío para `null`:

```
id,runId,phase,target,seq,startedAt,latencyMs,status,ok,bytes,error,warmup
```

## UI y calidad

- Interfaz en español. Diseño limpio con modo claro/oscuro (variables de shadcn). Colores consistentes: API A = `chart-1` y API B = `chart-2` en toda la app.
- Mostrar siempre la fórmula junto a cada resultado, porque el profesor evalúa los conceptos.
- `npm run lint`, `npm run typecheck` (`tsc --noEmit`) y `npm test` deben pasar.
