# 04 · Plan de implementación

Implementar **en orden**. No pasar al siguiente hito sin cumplir los criterios de aceptación del actual.

## Calendario (sustentación: jueves 19 de noviembre de 2026)

| Día | Trabajo |
|-----|---------|
| Sáb 7 – Dom 8 | Hitos 0–3: base del proyecto, estadística con pruebas y medición funcionando |
| Lun 9 | Hitos 4–5: datos y resultados |
| Mar 10 | Hito 6 (muestreo) y **recolección real**: piloto y experimento principal desde el equipo y la red de los integrantes. Guardar `respaldo.csv` (hecho el 14-nov; ver decisión 29) |
| Mié 11 – Vie 13 | Hito 7: pulido. Presentación con las capturas y números reales. Ensayo |
| Jue 19 | Sustentación (llevar el CSV de respaldo) |

## Hito 0 · Base del proyecto
- `create-next-app` con TS, Tailwind, ESLint, App Router, `src/` y alias `@/*`. Inicializar shadcn y agregar los componentes listados en el README.
- Instalar dependencias (ver README). Configurar Vitest y el script `typecheck`.
- Layout con navbar (Inicio, Experimento, Datos, Resultados, Muestreo) y providers.

**Aceptación:** `npm run dev` muestra la navbar; `npm run lint`, `npm run typecheck` y `npm test` pasan.

## Hito 1 · Estadística pura (`src/lib/stats`)
- `distributions.ts`, `descriptive.ts`, `intervals.ts`, `sampleSize.ts`, `sampling.ts` e `interpret.ts`, según [02-especificacion-estadistica.md](02-especificacion-estadistica.md).
- Pruebas en `tests/stats/` con **todos** los valores de prueba de ese documento.

**Aceptación:** todas las pruebas pasan con tolerancia `1e-3`. Ninguna función importa React ni Next.

## Hito 2 · Esquemas y medición en el servidor
- `schemas.ts`, `presets.ts`, `measure.server.ts` y `app/api/measure/route.ts`.

**Aceptación:** un `curl -X POST localhost:3000/api/measure` con un lote de 3 por API devuelve 6 mediciones intercaladas con `latencyMs > 0`. Un body inválido devuelve 400. `http://localhost` es rechazado cuando `ALLOW_PRIVATE_URLS` no está activo.

## Hito 3 · Experimento
- `ExperimentContext` con persistencia, `useRunExperiment` y la página `/experimento` (formulario, verificar APIs, progreso y cancelación).

**Aceptación:** un piloto de 30 por API termina con barra de progreso. Al recargar la página, los datos siguen ahí. Cancelar conserva lo medido. Las mediciones de calentamiento quedan marcadas con `warmup = true`.

## Hito 4 · Datos
- Página `/datos` con `MeasurementsTable`, exportar e importar CSV/JSON y el botón de respaldo.

**Aceptación:** exportar y luego importar el mismo CSV da exactamente los mismos datos. Un CSV con una fila corrupta muestra el error de esa fila sin perder las demás.

## Hito 5 · Resultados
- Página `/resultados` completa: descriptivos, histogramas, tarjetas de IC con fórmula, sustitución e interpretación, gráfico de IC, panel de comparación y recomendación.

**Aceptación:** al cargar un CSV construido con los datos de prueba A y B, los números coinciden con la especificación. Cambiar la confianza a 90% o 99% recalcula al instante. Se muestran las advertencias de normalidad y de `n·p̂ < 5` cuando aplican.

## Hito 6 · Muestreo
- Página `/muestreo` con `SampleSizeCalculator` (precargado desde el piloto, con el botón "Usar este n") y `CltSimulator`.

**Aceptación:** con σ = 50 y E = 10 al 95% se obtiene n = 97. El histograma de las medias se ve más simétrico a medida que crece `m`. Con la misma semilla, la simulación da el mismo resultado.

## Hito 7 · Pulido
- Página de inicio con el caso problema. Estados vacíos ("Aún no hay datos: ve a Experimento"), modo oscuro, diseño responsive y accesibilidad básica (labels y contraste).
- `public/data/respaldo.csv` con datos **reales** recolectados con la app desde el equipo y la red de los integrantes (dataset de respaldo listo).
- Revisar que el README esté al día.

**Aceptación:** flujo completo Piloto → Tamaño de muestra → Experimento → Resultados sin errores en consola; `npm run build` exitoso.

## Definición de terminado (todo el proyecto)
- Lint, typecheck, pruebas y build sin errores.
- Ningún `any` sin justificar.
- Todos los textos de la interfaz en español.
- Cada intervalo muestra su fórmula, su sustitución numérica y su interpretación.
