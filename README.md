# LatenciaLab

**Intervalos de confianza para el tiempo de respuesta de APIs web**

Proyecto de aplicación · Estadística Inferencial · Ingeniería de Sistemas
Sustentación: **jueves 19 de noviembre de 2026**

## Qué es

LatenciaLab es una aplicación web que **mide en vivo** el tiempo de respuesta de dos APIs públicas y usa **estadística inferencial** para decidir cuál conviene a una startup que exige respuestas de menos de 300 ms.

La app cubre el ciclo completo de un estudio:

1. Prueba piloto
2. Cálculo del tamaño de muestra
3. Experimento principal
4. Intervalos de confianza
5. Recomendación

Para el detalle del caso, ver [docs/01-planteamiento.md](docs/01-planteamiento.md).

## Temas de la materia que cubre

| Unidad | Tema | Dónde está en la app |
|--------|------|----------------------|
| I · Distribuciones muestrales | Distribución de la media y de la proporción, TLC | `/muestreo` → Simulador TLC |
| II · Estimación y muestreo | Estimadores puntuales, error estándar, tamaño de muestra, diseño de muestreo | `/muestreo` → Calculadora; `/experimento` (piloto, intercalado, calentamiento) |
| III · Intervalos de confianza | IC de la media (t y z), varianza y desviación (χ²), proporción, razón de varianzas (F), diferencia de medias (Welch y agrupado), diferencia de proporciones | `/resultados` |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zod · TanStack Query · TanStack Form · TanStack Table · jstat · Vitest

## Estado del proyecto

Implementados los hitos 0 a 7 de [docs/04-plan-de-implementacion.md](docs/04-plan-de-implementacion.md): estadística pura con pruebas (valores de la especificación), medición en el servidor (`/api/measure`), experimento con progreso y cancelación (ejecutar una fase reemplaza sus mediciones previas, con confirmación; cancelar conserva lo medido), datos (tabla, CSV/JSON), resultados (IC con fórmula, sustitución e interpretación), muestreo (tamaño de muestra y simulador TLC) y pulido (modo oscuro, estados vacíos). `lint`, `typecheck`, `test` (65 pruebas, incluidas las de resultados, reemplazo de mediciones por fase, plantillas de interpretación y `/api/measure`) y `build` pasan. Las decisiones sobre puntos ambiguos están en [docs/decisiones.md](docs/decisiones.md).

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
| `npm test` | Vitest (`tests/`) |

Variables de entorno (`.env.local`, opcional):

```
ALLOW_PRIVATE_URLS=false   # true solo para medir un backend propio en localhost
```

## Uso (flujo de la sustentación)

1. **Experimento → Piloto:** 30 peticiones por API.
2. **Muestreo:** calcular el *n* para el margen de error deseado y pulsar "Usar este n".
3. **Experimento → Principal:** ejecutar con ese *n*.
4. **Resultados:** revisar los IC con el nivel de confianza elegido y la recomendación final.
5. **Muestreo → Simulador TLC:** explicar la distribución muestral.

> Ejecutar **en local** para que las latencias se midan desde el equipo y la red de los integrantes (en un servidor remoto se medirían desde ese servidor). Si falla internet: **Datos → Cargar dataset de respaldo**.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/01-planteamiento.md](docs/01-planteamiento.md) | Caso problema, objetivos, variables, muestreo y guion de la presentación |
| [docs/02-especificacion-estadistica.md](docs/02-especificacion-estadistica.md) | Fórmulas, condiciones, interpretaciones y valores de prueba |
| [docs/03-especificacion-tecnica.md](docs/03-especificacion-tecnica.md) | Arquitectura, esquemas, contrato de la API, páginas y componentes |
| [docs/04-plan-de-implementacion.md](docs/04-plan-de-implementacion.md) | Hitos, criterios de aceptación y calendario |

## Integrantes

- Richard Rodríguez
- Jesus Angulo
- Jesus Palacios
