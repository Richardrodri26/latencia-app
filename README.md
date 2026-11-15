# LatenciaLab

**Intervalos de confianza y prueba de hipótesis para el tiempo de respuesta de APIs web**

Proyecto de aplicación · Estadística Inferencial · Ingeniería de Sistemas
Sustentación: **jueves 19 de noviembre de 2026**

## Qué es

LatenciaLab es una aplicación web que **mide en vivo** el tiempo de respuesta de dos APIs públicas y usa **estadística inferencial** para decidir cuál conviene a una startup que exige respuestas de menos de 300 ms.

La app cubre el ciclo completo de un estudio:

1. Prueba piloto
2. Cálculo del tamaño de muestra
3. Experimento principal
4. Intervalos de confianza
5. Prueba de hipótesis para la diferencia de medias
6. Recomendación

Para el detalle del caso, ver [docs/01-planteamiento.md](docs/01-planteamiento.md).

## Temas de la materia que cubre

| Unidad | Tema | Dónde está en la app |
|--------|------|----------------------|
| I · Distribuciones muestrales | Distribución de la media y de la proporción, TLC | `/muestreo` → Simulador TLC |
| II · Estimación y muestreo | Estimadores puntuales, error estándar, tamaño de muestra, diseño de muestreo | `/muestreo` → Calculadora; `/experimento` (piloto, intercalado, calentamiento) |
| III · Intervalos de confianza | IC de la media (Z con σ conocida; Z con s si n ≥ 30; t si n < 30) en 4 pasos, IC de la proporción en 6 pasos, IC de la diferencia de medias (Z o t con Sp) y de la diferencia de proporciones | `/resultados` |
| IV · Pruebas de hipótesis | Prueba de hipótesis para la diferencia de medias (4 pasos, Z.A./R.C., P.C.I./P.C.S., p-valor) | `/resultados` → Prueba de hipótesis ([docs/06](docs/06-pruebas-de-hipotesis.md)) |

Solo se usan los procedimientos vistos en clase («no añadir más de lo que nos han dado»). Los intervalos que no se vieron en clase ya se retiraron (lista en [docs/02](docs/02-especificacion-estadistica.md), «Eliminado por no verse en clase»; plan en [docs/07](docs/07-alineacion-con-la-clase.md)).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zod · TanStack Query · TanStack Form · TanStack Table · jstat · Vitest

## Estado del proyecto

Implementados los hitos 0 a 14. Los hitos 0–7 construyeron la app (estadística pura, medición en el servidor en `/api/measure`, experimento con progreso y cancelación, datos con CSV/JSON, resultados, muestreo y pulido). Los hitos 8–11 la alinearon con los procedimientos de clase ([docs/07](docs/07-alineacion-con-la-clase.md)): se quitaron los intervalos de varianza, desviación, razón de varianzas, Welch y la advertencia de asimetría; el IC de la media es uno solo (Z con s si n ≥ 30, t si n < 30; Z con σ si fuera conocida) y se muestra con los pasos de clase (4 para la media, 6 para la proporción, con «no aplica» si no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5); la diferencia de medias usa Z (n_A, n_B ≥ 30) o t con Sp (muestras pequeñas); y la recomendación sigue la regla media → SLA → sin evidencia. Los hitos 12–14 agregaron la **prueba de hipótesis para la diferencia de medias** (Unidad IV, [docs/06](docs/06-pruebas-de-hipotesis.md)) en `/resultados`: H₀ y H₁ (<, >, ≠), α de 1, 5 o 10 %, δ₀ editable, variante Z o t con Sp, puntos críticos P.C.I./P.C.S., zona de aceptación / región crítica con su curva, p-valor y conclusión con «se acepta H₀» / «se rechaza H₀», en los 4 pasos de clase. La lógica está en `src/lib/stats/hypothesis.ts` (con `zCdf`, `tCdf`) y los textos en `src/lib/hypothesisText.ts`. `lint`, `typecheck`, `test` (200 pruebas, incluidas las de los ejemplos del cuaderno, el dataset de respaldo, los textos de los pasos, la prueba de hipótesis y el render de `/resultados`) y `build` pasan. Las decisiones sobre puntos ambiguos están en [docs/decisiones.md](docs/decisiones.md).

**Pendiente:** la verificación visual en navegador de `/`, `/resultados` (incluida la curva de la prueba de hipótesis) y `/muestreo` (consola sin errores): los criterios de la UI se comprobaron con pruebas de render en el servidor y con `npm run build`, no en un navegador. La presentación ya se rehízo con los procedimientos de clase.

Las latencias se miden desde el equipo y la red de los integrantes, donde se ejecuta la aplicación. `public/data/respaldo.csv` es el dataset de respaldo listo: se recolectó con la propia app el 14 de noviembre de 2026 (piloto de 30 y principal de 100 peticiones por API, más 3 de calentamiento por API y fase). El CSV no guarda la red usada (el campo "Red usada" del formulario es opcional y no forma parte del formato CSV). Ver [decisión 29](docs/decisiones.md).

**Limitaciones:** los resultados dependen de la red, la ubicación y la hora de la medición; no se generalizan a otros usuarios (ver "Supuestos y limitaciones" en [docs/01-planteamiento.md](docs/01-planteamiento.md)).

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:3000
```

Scripts:

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción y ejecución |
| `npm run lint` | ESLint (`eslint .`, Next 16 ya no trae `next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (`tests/`, incluye `.test.tsx`) |

Variables de entorno (`.env.local`, opcional):

```
ALLOW_PRIVATE_URLS=false   # true solo para medir un backend propio en localhost
```

## Uso (flujo de la sustentación)

1. **Experimento → Piloto:** 30 peticiones por API.
2. **Muestreo:** calcular el *n* para el margen de error deseado y pulsar "Usar este n".
3. **Experimento → Principal:** ejecutar con ese *n*.
4. **Resultados:** revisar los IC con el nivel de confianza elegido, la prueba de hipótesis de la diferencia de medias (elegir H₁, α y δ₀) y la recomendación final.
5. **Muestreo → Simulador TLC:** explicar la distribución muestral.

> Ejecutar **en local** para que las latencias se midan desde el equipo y la red de los integrantes (en un servidor remoto se medirían desde ese servidor). Si falla internet: **Datos → Cargar dataset de respaldo**.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/01-planteamiento.md](docs/01-planteamiento.md) | Caso problema, objetivos, variables, muestreo y guion de la presentación |
| [docs/02-especificacion-estadistica.md](docs/02-especificacion-estadistica.md) | Procedimientos de clase (IC), notación, interpretaciones y valores de prueba (ejemplos del cuaderno y respaldo) |
| [docs/03-especificacion-tecnica.md](docs/03-especificacion-tecnica.md) | Arquitectura, esquemas, contrato de la API, páginas y componentes |
| [docs/04-plan-de-implementacion.md](docs/04-plan-de-implementacion.md) | Hitos, criterios de aceptación y calendario |
| [docs/05-brief-diapositivas.md](docs/05-brief-diapositivas.md) | Brief de la presentación (ya rehecha con los procedimientos de clase) y cifras del respaldo |
| [docs/06-pruebas-de-hipotesis.md](docs/06-pruebas-de-hipotesis.md) | Prueba de hipótesis para la diferencia de medias (Unidad IV): procedimiento, funciones, UI y valores de prueba |
| [docs/07-alineacion-con-la-clase.md](docs/07-alineacion-con-la-clase.md) | Plan de cambios del código para quedar alineado con la clase (va antes de docs/06) |
| [docs/decisiones.md](docs/decisiones.md) | Decisiones sobre puntos ambiguos |

## Integrantes

- Richard Rodríguez
- Jesus Angulo
- Jesus Palacios
