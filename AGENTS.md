# Instrucciones para el agente

Vas a implementar **LatenciaLab**, una app Next.js para un proyecto universitario de Estadística Inferencial. El objetivo es construir la app completa y funcional siguiendo la documentación.

## Antes de escribir código

Leer en este orden:

1. `README.md`
2. `docs/01-planteamiento.md` (el porqué)
3. `docs/02-especificacion-estadistica.md` (fórmulas exactas y valores de prueba)
4. `docs/03-especificacion-tecnica.md` (el cómo)
5. `docs/04-plan-de-implementacion.md` (el orden de trabajo y criterios de aceptación)

## Reglas

- Seguir los hitos **en orden**. Al terminar cada uno, verificar sus criterios de aceptación y ejecutar `npm run lint && npm run typecheck && npm test`.
- **La exactitud estadística es lo prioritario.** Implementar `src/lib/stats` como funciones puras con pruebas, usando los valores de prueba de la especificación. No inventar fórmulas ni cambiar las de la especificación.
- Usar **cuantiles** (`zQ`, `tQ`, `chiQ`, `fQ`) tal como están definidos. Welch usa gl no entero, sin redondear.
- Latencias para estadística: solo `ok = true` y `warmup = false`.
- Las peticiones de medición son **secuenciales** y se hacen **en el servidor** (`/api/measure`). Nunca medir en paralelo.
- Validar toda entrada externa con **Zod**: body de la API, formulario y CSV importado.
- Formularios con **TanStack Form**, tablas con **TanStack Table**, ejecución del experimento con **TanStack Query** (`useMutation`). UI con **shadcn/ui** y gráficos con `chart` de shadcn (Recharts).
- Todos los textos de la interfaz en **español**.
- Cada IC en la UI muestra: fórmula, sustitución numérica, resultado, interpretación y advertencias.
- No agregar backend, base de datos ni autenticación: la persistencia es `localStorage` más la exportación e importación CSV.
- TypeScript estricto, sin `any` injustificados. Mantener los componentes pequeños.
- Si algo de la especificación es ambiguo, elegir la opción más simple, documentarla en `docs/decisiones.md` y continuar.

## Definición de terminado

`npm run lint`, `npm run typecheck`, `npm test` y `npm run build` pasan. El flujo Piloto → Tamaño de muestra → Experimento → Resultados funciona sin errores en consola, y el README refleja el estado real del proyecto.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
