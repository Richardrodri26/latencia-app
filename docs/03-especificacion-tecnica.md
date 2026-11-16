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
| **jstat** | Cuantiles z y t (valores críticos); CDF de z y t (p-valor) y densidad t (curva de la prueba, docs/06) |
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
- **Para la sustentación se ejecuta en local** (`pnpm dev` o `pnpm build && pnpm start`). En Vercel la medición saldría desde el datacenter de Vercel, no desde el equipo y la red de los integrantes.

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
            ComparisonPanel.tsx, Recommendation.tsx, ConfidenceSelector.tsx,
            NumberLine.tsx, ApiSection.tsx,
            MathText.tsx (nuevo, docs/07),
            HypothesisForm.tsx, HypothesisCurve.tsx, HypothesisPanel.tsx (nuevos, docs/06)
    sampling/CltSimulator.tsx, SampleSizeCalculator.tsx
  context/ExperimentContext.tsx
  hooks/useRunExperiment.ts, useResults.ts
  lib/
    schemas.ts                 # Esquemas Zod y tipos inferidos
    presets.ts                 # APIs predefinidas
    measure.server.ts          # measureOnce / measureBatch (solo servidor)
    csv.ts                     # Serializar y parsear CSV
    storage.ts                 # localStorage con try/catch
    results.ts                 # computeResults (cálculo puro que memoiza useResults)
    ciText.ts                  # Fórmula y pasos con sustitución de cada IC (docs/02, docs/07)
    hypothesisText.ts          # Pasos y conclusión de la prueba de hipótesis (nuevo, docs/06)
    stats/descriptive.ts, distributions.ts, intervals.ts,
          sampleSize.ts, sampling.ts, interpret.ts,
          hypothesis.ts (nuevo, docs/06), index.ts
  types/jstat.d.ts             # Solo si jstat no trae tipos
tests/*.test.ts, tests/stats/*.test.ts
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

El esquema del formulario de la prueba de hipótesis (`hypothesisFormSchema`, `ALPHA_LEVELS`, `DEFAULT_HYPOTHESIS`) se agrega en el hito 13; está especificado en [06-pruebas-de-hipotesis.md](06-pruebas-de-hipotesis.md), §4.1.

## Contrato `POST /api/measure`

- `export const runtime = 'nodejs'` y `export const dynamic = 'force-dynamic'`.
- **Body:** `measureRequestSchema`. Si no es válido → `400` con `z.flattenError(error)`.
- **Respuesta 200:** `{ measurements: Measurement[] }`.
- **Orden:** `intercalado` = A, B, A, B…; `aleatorio` = barajar (Fisher‑Yates) la lista de peticiones del lote.
- Pausa de `delayMs` entre peticiones consecutivas. Las peticiones son **secuenciales**, nunca en paralelo, porque la concurrencia distorsiona las latencias.
- **Seguridad (endurecida, decisiones 66–70 de `decisiones.md`):** solo `GET`, `http`/`https`, sin credenciales en la URL, puertos 80/443/8080/8443 (o el por defecto), longitud ≤ 2048. Si `ALLOW_PRIVATE_URLS !== 'true'` se rechazan hosts locales/privados (literales y nombres internos) y también los nombres que **resuelven por DNS** a cualquier IP privada, loopback, link-local (incl. 169.254.169.254), CGNAT, multicast, sin especificar o sus equivalentes IPv6 (incl. IPv4-mapped). Las redirecciones se siguen a mano (máx. 3) validando cada destino; el cuerpo se lee con tope de 5 MiB; timeout por petición con `AbortSignal.timeout`.
- **Límites:** cuerpo ≤ 16 KiB (413), `Content-Type: application/json` (415), `countPerTarget` ≤ 10, peor caso `2·n·timeout + (2·n−1)·pausa` ≤ 55 s, `export const maxDuration = 60`. POST de otro origen → 403. Por IP: 120 peticiones/min y 1 en curso (429 con `Retry-After`).

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
- Por API: `DescriptiveTable`, `Histogram` con una línea vertical en el SLA, y `CiCard` para la media (un solo IC: Z con s si n ≥ 30, t si n < 30; 4 pasos de clase), la proporción que incumple el SLA y la tasa de fallos (6 pasos; «no aplica» si no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5). Cada tarjeta incluye fórmula, pasos con sustitución numérica, resultado en la forma (θ̂ᵢ ≤ θ ≤ θ̂ₛ) = (1 − α)100 %, interpretación y avisos. Las expresiones con subíndice (`Z_{α/2}`, `t_{α/2}`) se muestran con `MathText`.
- `CiForestChart`: medias de A y B con barras de error del IC de la media (Recharts `ErrorBar`).
- `ComparisonPanel`: IC de la diferencia de medias (Z si n_A, n_B ≥ 30; t con Sp si hay muestras pequeñas) e IC de la diferencia de proporciones del SLA, cada uno sobre una recta numérica con el 0 marcado («si el IC contiene al cero, no hay diferencias»).
- Prueba de hipótesis para la diferencia de medias (docs/06): `HypothesisPanel` con `HypothesisForm` (TanStack Form + `hypothesisFormSchema`: δ₀, tipo de H₁, α ∈ {1 %, 5 %, 10 %}), `HypothesisCurve` (Z.A., R.C., P.C.I./P.C.S. y la variante) y los 4 pasos de clase.
- `Recommendation`: conclusión final según `recommend` de `interpret.ts` (diferencia de medias → diferencia de proporciones del SLA → sin evidencia).

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
- Mostrar siempre la fórmula y los pasos de clase junto a cada resultado, porque el profesor evalúa los conceptos.
- Solo procedimientos, notación y redacción de los apuntes de clase (ver docs/02 y docs/07).
- `pnpm lint`, `pnpm typecheck` (`tsc --noEmit`) y `pnpm test` deben pasar.
