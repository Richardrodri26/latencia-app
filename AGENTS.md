# Instrucciones para el agente

Vas a implementar **LatenciaLab**, una app Next.js para un proyecto universitario de Estadística Inferencial. Los hitos 0–14 ya están hechos: la app, la alineación con lo visto en clase (`docs/07`, hitos 8–11) y la prueba de hipótesis para la diferencia de medias (`docs/06`, hitos 12–14). Cualquier cambio nuevo debe respetar las reglas de abajo.

## Antes de escribir código

Leer en este orden:

1. `README.md`
2. `docs/01-planteamiento.md` (el porqué)
3. `docs/02-especificacion-estadistica.md` (fórmulas exactas y valores de prueba)
4. `docs/03-especificacion-tecnica.md` (el cómo)
5. `docs/04-plan-de-implementacion.md` (el orden de trabajo y criterios de aceptación)
6. `docs/07-alineacion-con-la-clase.md` (qué quitar y qué cambiar; hitos 8–11)
7. `docs/06-pruebas-de-hipotesis.md` (prueba de hipótesis para la diferencia de medias; hitos 12–14)
8. `docs/decisiones.md` (puntos ambiguos ya resueltos, hasta la 73; las 30–48 son las de la alineación con la clase, las 49–55 las de la prueba de hipótesis y el resto ajustes de interfaz y salvaguardas)

## Reglas

- Seguir los hitos **en orden**. Al terminar cada uno, verificar sus criterios de aceptación y ejecutar `pnpm lint && pnpm typecheck && pnpm test`.
- **Solo procedimientos de clase.** «No añadir más de lo que nos han dado»: usar únicamente los procedimientos, la notación y la redacción de los apuntes (docs/02 y docs/06). No agregar nada de la lista «Eliminado por no verse en clase» de docs/02, ni otras pruebas de hipótesis, ni métodos alternativos para proporciones (la clase dice «se acepta H₀»). Si algo no está en los apuntes, no va.
- **La exactitud estadística es lo prioritario.** Implementar `src/lib/stats` como funciones puras con pruebas, usando los valores de prueba de la especificación (ejemplos del cuaderno calculados con SciPy). No inventar fórmulas ni cambiar las de la especificación.
- Usar **cuantiles** `zQ`, `tQ` para los valores críticos y `zCdf`, `tCdf` para el p-valor, tal como están definidos. Regla de distribución: σ conocida → Z; σ desconocida y n < 30 → t; σ desconocida y n ≥ 30 → Z con s.
- Latencias para estadística: solo `ok = true` y `warmup = false`.
- Las peticiones de medición son **secuenciales** y se hacen **en el servidor** (`/api/measure`). Nunca medir en paralelo.
- Validar toda entrada externa con **Zod**: body de la API, formulario y CSV importado.
- Formularios con **TanStack Form**, tablas con **TanStack Table**, ejecución del experimento con **TanStack Query** (`useMutation`). UI con **shadcn/ui** y gráficos con `chart` de shadcn (Recharts).
- Todos los textos de la interfaz en **español**.
- Cada IC en la UI muestra: fórmula, pasos de clase con sustitución numérica (4 para la media, 6 para la proporción), resultado en la forma (θ̂ᵢ ≤ θ ≤ θ̂ₛ) = (1 − α)100 %, interpretación y avisos.
- No agregar backend, base de datos ni autenticación: la persistencia es `localStorage` más la exportación e importación CSV.
- TypeScript estricto, sin `any` injustificados. Mantener los componentes pequeños.
- Si algo de la especificación es ambiguo, elegir la opción más simple, documentarla en `docs/decisiones.md` y continuar.

## Definición de terminado

`pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan. El flujo Piloto → Tamaño de muestra → Experimento → Resultados funciona sin errores en consola, y el README refleja el estado real del proyecto.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
