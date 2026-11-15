# 05 · Brief para crear las diapositivas de la sustentación

Documento autocontenido para un agente (o persona) que **no conoce el proyecto** y debe producir las diapositivas de la sustentación de **LatenciaLab**. Todo lo que está aquí se verificó contra el repositorio; lo que no se pudo verificar está marcado con `[COMPLETAR ...]`.

## 0. Prompt listo para pegar

```text
Vas a crear las diapositivas de la sustentación del proyecto universitario LatenciaLab
(Estadística Inferencial, jueves 19 de noviembre de 2026).

1. Lee primero docs/05-brief-diapositivas.md del repositorio: es tu brief completo.
2. Para cualquier hecho, fórmula o decisión, consulta las fuentes de verdad de la sección 5
   (docs/02-especificacion-estadistica.md, docs/01-planteamiento.md, docs/decisiones.md, README.md).
3. NO inventes números, resultados, nombres ni requisitos. Usa solo los números de la sección 4.6
   del brief (cada uno trae su método de cálculo) o deja el marcador [COMPLETAR ...].
4. NO modifiques el código de la aplicación. Solo crea los archivos de la presentación.
5. Todo el texto de las diapositivas va en español.
6. Antes de empezar, haz al usuario las preguntas abiertas de la sección 7.3 y ESPERA sus respuestas.
7. Entrega: el formato que confirme el usuario (sugerido: .pptx) más las notas del orador por diapositiva.
```

## 1. Contexto

- **Proyecto:** LatenciaLab, app web que **mide en vivo** el tiempo de respuesta de dos APIs públicas y usa **intervalos de confianza** para decidir cuál conviene a una startup con un requisito de **menos de 300 ms por petición** (SLA).
- **Materia:** Estadística Inferencial · Ingeniería de Sistemas. Cubre Unidad I (distribuciones muestrales, TLC), Unidad II (estimación puntual, error estándar, tamaño de muestra, diseño de muestreo) y Unidad III (intervalos de confianza). Las pruebas de hipótesis (Unidad IV) están **fuera de alcance**.
- **Equipo:** Richard Rodríguez, Jesus Angulo, Jesus Palacios.
- **Fecha de la sustentación:** jueves 19 de noviembre de 2026.
- **Stack (una línea para la diapositiva de herramienta):** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Zod · TanStack Query/Form/Table · jstat · Vitest. 65 pruebas automáticas; `lint`, `typecheck`, `test` y `build` pasan (según README).
- **Dónde vive la app:** carpeta raíz del repo (`proyecto/`). Se ejecuta **en local** para que las latencias se midan desde el equipo y la red de los integrantes.

| Comando | Qué hace |
|---------|----------|
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor de desarrollo en **http://localhost:3000** |
| `npm run build` y `npm start` | Producción local (alternativa estable para la demo) |
| `npm run lint` / `npm run typecheck` / `npm test` | Calidad (pruebas en `tests/`) |

| Ruta | Contenido |
|------|-----------|
| `/` | Caso problema, 4 pasos, tabla de temas por unidad |
| `/experimento` | Formulario, «Verificar APIs», ejecutar piloto o principal, progreso, «Borrar datos» |
| `/datos` | Tabla (ordenar, filtrar, paginar), exportar/importar CSV y JSON, «Cargar dataset de respaldo» |
| `/resultados` | Selector 90/95/99 %, descriptivos, histogramas con línea del SLA, tarjetas de IC, comparación A vs. B, recomendación |
| `/muestreo` | Calculadora de tamaño de muestra y simulador del TLC |
| `POST /api/measure` | Route Handler que mide en el servidor (no se muestra al público, solo en la diapositiva de arquitectura) |

## 2. Mensaje central y audiencia

**Tesis (usar casi literal):** *«Elegir un proveedor de API por su página comercial es riesgoso; medimos, y con intervalos de confianza obtuvimos evidencia estadística de cuál responde más rápido desde nuestra red, con qué incertidumbre y bajo qué supuestos.»*

- **Audiencia:** jurado universitario (profesor de Estadística Inferencial). El profesor evalúa **conceptos**, por eso cada resultado se muestra con **fórmula, sustitución numérica, resultado e interpretación**.
- **Tono:** formal-académico pero claro; en español. Priorizar el razonamiento estadístico (por qué esa fórmula, qué supuestos, qué significa el intervalo) sobre la tecnología. Una idea por diapositiva, poco texto, fórmulas legibles, gráficos de la propia app.
- **Honestidad:** presentar las limitaciones sin esconderlas; es un punto a favor ante un jurado.

## 3. Datos del estudio (hechos verificados)

- **Pregunta de investigación:** desde nuestra red, ¿cuál es el tiempo medio real de cada API, qué tan estable es, qué proporción incumple el SLA y existe una diferencia real entre A y B?
- **Población:** todas las peticiones GET posibles a cada API desde la red del equipo durante el periodo de estudio (conceptualmente infinita). **Unidad de muestreo:** una petición HTTP GET. **Muestra:** las *n* peticiones medidas por API.
- **Variables:** `X` tiempo de respuesta (cuantitativa continua, ms; desde enviar la petición hasta recibir el cuerpo completo) · `S` incumple SLA (Bernoulli, `X > 300 ms`) · `F` petición fallida (Bernoulli; error de red, timeout o estado ≠ 2xx) · `G` proveedor (A/B).
- **APIs por defecto (presets):** API A = JSONPlaceholder `https://jsonplaceholder.typicode.com/posts/1`; API B = DummyJSON `https://dummyjson.com/posts/1`. Otros presets disponibles: PokeAPI, REST Countries, Open-Meteo (Bogotá). Fuente: `src/lib/presets.ts`.
  - Aviso: el CSV de respaldo **no guarda los nombres de las APIs**. Que A y B sean estas dos es una suposición razonable (valores por defecto; los bytes de respuesta 292 y 453 son constantes por API) pero `[COMPLETAR: confirmar con el equipo que el dataset se midió con JSONPlaceholder (A) y DummyJSON (B)]`.
- **Diseño:** piloto de 30 por API → tamaño de muestra → principal. Intercalado A/B/A/B…, 3 peticiones de calentamiento descartadas por API y fase, pausa de 100 ms entre peticiones, timeout 5000 ms, SLA 300 ms (valores por defecto en `src/lib/presets.ts`). Peticiones **secuenciales** y **hechas en el servidor** (`/api/measure`) para evitar CORS y que la concurrencia distorsione las latencias.
- **Datos que entran a cada cálculo:** latencia y proporción SLA usan solo `ok = true` y `warmup = false`; la tasa de fallos usa todas las mediciones con `warmup = false`.
- **Supuestos y limitaciones (docs/01, mencionarlos en la sustentación):**
  1. Las latencias tienen **sesgo a la derecha**; el IC de la media sigue siendo válido con *n* grande por el **TLC**.
  2. El IC de la **varianza/desviación (χ²)** y el de la **razón de varianzas (F)** **suponen normalidad**, por lo que son sensibles al sesgo (la app advierte si |g₁| > 1).
  3. Los resultados **dependen de la red, la hora y la ubicación**; **no se generalizan a otros usuarios**. La medición proviene del **equipo y la red propios** del equipo.
  4. La independencia entre peticiones es **aproximada** (de ahí la pausa y el intercalado).
  5. Datos del respaldo: recolectados el 14 de noviembre de 2026 con la propia app; el CSV no registra la red ni la ciudad (decisión 29).

## 4. Estructura propuesta (12 diapositivas + anexo)

`docs/01` sugiere 10–12 diapositivas. Ajustar a la duración real `[COMPLETAR: duración]`. Cada diapositiva: título, objetivo, viñetas clave, visual sugerido.

### 4.1 Diapositiva 1 · Portada
- **Objetivo:** identificar el trabajo.
- **Viñetas:** «LatenciaLab: intervalos de confianza para el tiempo de respuesta de APIs web» · Estadística Inferencial · integrantes · jueves 19 de noviembre de 2026.
- **Visual:** logotipo/título sobrio; captura de la portada `/` como fondo discreto.

### 4.2 Diapositiva 2 · Caso problema
- **Objetivo:** motivar la necesidad de medir.
- **Viñetas:** startup colombiana con app móvil que consume una API REST · dos proveedores candidatos (A y B) con recursos equivalentes · SLA: cada petición < 300 ms · la página comercial no refleja la red real.
- **Visual:** diagrama simple app móvil → API A / API B con «< 300 ms?».

### 4.3 Diapositiva 3 · Pregunta y objetivos
- **Objetivo:** fijar qué se estima.
- **Viñetas:** la pregunta de investigación (sección 3) · objetivo general (estimar con IC el desempeño de dos APIs para elegir proveedor) · 6 objetivos específicos agrupados por Unidad I, II y III (tabla de docs/01) · fuera de alcance: pruebas de hipótesis.
- **Visual:** tabla de objetivos con la unidad de cada uno.

### 4.4 Diapositiva 4 · Población, muestra y variables
- **Objetivo:** definir el marco estadístico.
- **Viñetas:** población, unidad de muestreo y muestra (sección 3) · variables X, S, F, G con su tipo · parámetros a estimar: μ, σ², σ, p (SLA) y las diferencias/razón entre A y B.
- **Visual:** tabla de variables (tipo, definición).

### 4.5 Diapositiva 5 · Diseño del experimento
- **Objetivo:** justificar que las mediciones son comparables y casi independientes.
- **Viñetas:** flujo **Piloto (30 por API) → Tamaño de muestra → Experimento principal** · calentamiento: se descartan 3 peticiones por API (DNS/TLS en frío) · intercalado A/B/A/B para igualar condiciones de red · pausa de 100 ms · peticiones **secuenciales** y **desde el servidor** · solo `ok = true` y `warmup = false` entran a la estadística.
- **Visual:** diagrama de arquitectura de `docs/03` (Navegador ↔ `POST /api/measure` ↔ API A/B) y línea de tiempo A,B,A,B con las primeras 3 en gris (calentamiento).
- **Dato real útil (del CSV):** la primera petición de calentamiento a B tardó 892.07 ms frente a ≈ 220–235 ms de las siguientes; ilustra por qué se descarta el calentamiento.

### 4.6 Diapositiva 6 · Resultados descriptivos y TLC (Unidad I)
- **Objetivo:** mostrar que los datos son sesgados y por qué la media igual se puede inferir.
- **Viñetas:** histogramas de latencia con línea del SLA (300 ms) · asimetría alta (g₁ de A = 6.86 y de B = 4.31 en el principal) · simulador del TLC: con *m* grande la distribución de la media se aproxima a la normal `N(x̄, s/√m)`.
- **Visual:** captura de `/muestreo` → Simulador TLC (histograma original vs. histograma de medias con curva normal) y de los histogramas de `/resultados`.

### 4.7 Diapositiva 7 · Tamaño de muestra (Unidad II)
- **Objetivo:** mostrar cómo el piloto determina *n*.
- **Fórmulas (docs/02):** media `n = (z(1−α/2)·σ/E)²`, usando `s` del piloto; proporción `n = z(1−α/2)²·p(1−p)/E²`; siempre se redondea hacia arriba. Error estándar de la media `s/√n`.
- **Sustitución verificada (valores de prueba de la especificación):** σ = 50, E = 10, 95 % → n = 96.04 → **97**; p = 0.5, E = 0.05 → 384.15 → **385**.
- **Con el piloto real** (método en 4.14): con E = 10 ms y 95 %, API B (s = 79.35) da n = (1.96 · 79.35 / 10)² = 241.85 → **242**; API A (s = 6.47) da 1.61 → 2 (la app impone mínimo 10, decisión 11). Con E = 5 ms: A → 7, B → 968.
- **Nota para el orador:** el principal se ejecutó con n = 100 por API (valor por defecto). Con n = 100 el margen de error real del IC 95 % de la media fue 8.73 ms (A) y 14.53 ms (B). `[COMPLETAR: confirmar qué E y qué n justificaron los 100 en el ensayo del equipo]`.
- **Visual:** captura de `/muestreo` → Calculadora con fórmula y sustitución.

### 4.8 Diapositiva 8 · Fórmulas de los intervalos (Unidad III)
- **Objetivo:** mostrar el método con su sustitución.
- **Viñetas (todas de docs/02, α = 1 − confianza; se usan cuantiles):**
  - Media (σ desconocida): `x̄ ± t(1−α/2, n−1)·s/√n`; comparación con la aproximación z.
  - Varianza: `[(n−1)s²/χ²(1−α/2, n−1) ; (n−1)s²/χ²(α/2, n−1)]`; desviación: raíz de los extremos.
  - Proporción (SLA, fallos): `p̂ ± z(1−α/2)·√(p̂(1−p̂)/n)`, condición `n·p̂ ≥ 5` y `n(1−p̂) ≥ 5`, extremos recortados a [0, 1].
  - Razón de varianzas: `[(s₁²/s₂²)/F(1−α/2, n₁−1, n₂−1) ; (s₁²/s₂²)·F(1−α/2, n₂−1, n₁−1)]`. Si contiene 1 → IC agrupado; si no → Welch.
  - Diferencia de medias, Welch: `(x̄₁−x̄₂) ± t(1−α/2, ν)·√(s₁²/n₁ + s₂²/n₂)`, con ν no entero y sin redondear.
  - Diferencia de medias, agrupado: `sₚ² = [(n₁−1)s₁²+(n₂−1)s₂²]/(n₁+n₂−2)`; `(x̄₁−x̄₂) ± t(1−α/2, n₁+n₂−2)·sₚ·√(1/n₁+1/n₂)`.
  - Diferencia de proporciones: `(p̂₁−p̂₂) ± z(1−α/2)·√(p̂₁(1−p̂₁)/n₁ + p̂₂(1−p̂₂)/n₂)`.
- **Dividir en 2 diapositivas** si queda denso: (a) un solo grupo (media, varianza/desviación, proporción); (b) comparación A vs. B (razón F, Welch/agrupado, diferencia de proporciones).
- **Verificación de la implementación (puede ir como nota):** las pruebas usan valores de SciPy, p. ej. A = [10,12,14,16,18] → IC media t [10.073514, 17.926486]; caso Welch X, Y → ν = 10.680473, IC [−77.063297, −34.603370].
- **Visual:** una caja por fórmula; captura de una `CiCard` de `/resultados` (fórmula + sustitución + interpretación + advertencias).

### 4.9 Diapositiva 9 · Resultados por API (IC al 95 %, fase principal, n = 100 por API)
- **Objetivo:** mostrar cada IC con su sustitución e interpretación.
- **Viñetas (valores de la sección 4.14):**
  - API A: x̄ = 90.51 ms; IC t 95 % [81.79 ; 99.24] ms (`90.51 ± 1.9842 · 43.98/√100`). Desviación [38.61 ; 51.09] ms. Incumple SLA: 2/100, IC [0 ; 0.0474].
  - API B: x̄ = 234.21 ms; IC t 95 % [219.68 ; 248.74] ms. Desviación [64.28 ; 85.05] ms. Incumple SLA: 5/100, IC [0.0073 ; 0.0927].
  - Fallos: 0 en ambas.
  - Advertencias que la app muestra y hay que decir: IC χ² supone normalidad (datos asimétricos); en A, n·p̂ = 2 < 5 (IC de proporción poco fiable).
- **Visual:** `CiForestChart` (medias con barras de error) y histogramas con la línea del SLA. `[COMPLETAR con la app: ruta /resultados, gráfico «CiForestChart», confianza 95 %]` para capturar la imagen.

### 4.10 Diapositiva 10 · Comparación A vs. B
- **Objetivo:** responder si hay diferencia real.
- **Viñetas (sección 4.14, 95 %):**
  - Razón de varianzas A/B = 0.3609, IC [0.2428 ; 0.5363]: **no contiene 1** → A es más estable (menor varianza) → se usa **Welch**.
  - Diferencia de medias A − B (Welch): −143.70 ms, ν = 162.2168, t = 1.9747, IC [−160.56 ; −126.83] ms: **no contiene 0** → A responde en promedio entre 126.83 y 160.56 ms antes.
  - Diferencia de proporciones SLA (A − B): −0.03, IC [−0.0808 ; 0.0208]: **contiene 0** → no hay evidencia de diferencia en el incumplimiento del SLA.
  - Robustez: con 90 % el IC Welch es [−157.83 ; −129.57] y con 99 % [−165.96 ; −121.44]; la conclusión no cambia.
- **Visual:** `ComparisonPanel` (recta numérica con el 0 y el 1 marcados) y selector 90/95/99 %.

### 4.11 Diapositiva 11 · Interpretación y recomendación
- **Objetivo:** traducir la estadística en una decisión.
- **Viñetas:** regla de decisión de la app (gana la API con mejor media si el IC de la diferencia no contiene 0; si no, desempata por SLA y luego por varianza; si nada decide: «No hay evidencia suficiente…») · aplicada a los datos de respaldo, el criterio decisivo es la **media** y la recomendación es la **API A** (JSONPlaceholder si se confirma el preset) · ambas cumplen el SLA en promedio (IC de las medias muy por debajo de 300 ms), pero B tiene entre 0.73 % y 9.27 % de peticiones sobre 300 ms · A es más rápida y más estable en este estudio.
- **Frase para el orador:** «Con 95 % de confianza, A responde en promedio entre 126.83 y 160.56 ms antes que B desde nuestra red.»
- **Visual:** captura del componente `Recommendation` en `/resultados`.

### 4.12 Diapositiva 12 · Supuestos, limitaciones y conclusiones
- **Objetivo:** cerrar con rigor.
- **Viñetas:** limitaciones 1–5 de la sección 3 (red propia, dependencia de hora/ubicación, sin generalización, normalidad para χ² y F, independencia aproximada) · conclusiones: (i) la media se infiere con t gracias al TLC; (ii) hay diferencia real en el tiempo medio y A es más estable; (iii) la diferencia en incumplimiento del SLA no es concluyente; (iv) trabajo futuro: más redes/horarios, pruebas de hipótesis (Unidad IV).
- **Visual:** dos columnas «Qué podemos afirmar» / «Qué no podemos afirmar».

### 4.13 Diapositiva 13 (opcional) · Demo en vivo y Preguntas
- **Demo en vivo:** ver sección 6 (insertar una diapositiva puente «Demo» antes de la 9 si la demo va en medio, o hacerla al final; confirmar con el equipo).
- **Preguntas:** ver sección 8. Cerrar con diapositiva «Preguntas» y los nombres de los integrantes.

### 4.14 Método de las cifras citadas (cómo se calcularon)

Se calcularon con un script de Node de solo lectura sobre `public/data/respaldo.csv` (sin tocar el código de la app), con `jstat` para los cuantiles y **exactamente las fórmulas de docs/02** (filtro `ok = true` y `warmup = false`, SLA = 300 ms, que es el valor por defecto; el CSV no guarda el SLA). Regla de elección Welch/agrupado según la razón de varianzas, como en `docs/02`.

- Archivo: 272 filas; 2 ejecuciones (`runId`); fase piloto: 30 válidas + 3 de calentamiento por API; fase principal: 100 válidas + 3 de calentamiento por API; 0 errores; todos con estado 200; bytes constantes (A 292, B 453). Fechas `startedAt` del 2026-11-15T03:34:46Z al 03:35:59Z (UTC); el README indica que se recolectó el 14 de noviembre de 2026.

| Estadístico (95 %) | API A | API B |
|--------------------|-------|-------|
| Piloto: n, x̄, s, g₁ | 30, 78.40, 6.47, 0.47 | 30, 243.58, 79.35, 3.59 |
| Piloto: IC media t | [75.98 ; 80.81] | [213.95 ; 273.21] |
| Piloto: incumple SLA | 0/30 | 2/30, IC [0 ; 0.1559] |
| Principal: n | 100 | 100 |
| Principal: x̄, mediana, P95 | 90.51, 83.74, 92.01 | 234.21, 216.76, 248.47 |
| Principal: s², s | 1934.19, 43.98 | 5360.09, 73.21 |
| Principal: mínimo, máximo | 78.01, 396.07 | 211.85, 636.09 |
| Principal: g₁, coef. de variación | 6.86, 0.4859 | 4.31, 0.3126 |
| Principal: IC media (t, gl = 99, t = 1.9842) | [81.79 ; 99.24], margen 8.73 | [219.68 ; 248.74], margen 14.53 |
| Principal: IC varianza | [1491.06 ; 2610.18] | [4132.07 ; 7233.39] |
| Principal: IC desviación | [38.61 ; 51.09] | [64.28 ; 85.05] |
| Principal: incumple SLA (p̂, IC) | 2/100 = 0.02, [0 ; 0.0474] | 5/100 = 0.05, [0.0073 ; 0.0927] |

Comparación principal, 95 %: razón A/B 0.3609 [0.2428 ; 0.5363]; Welch −143.70 [−160.56 ; −126.83], ν = 162.2168; agrupado (dato secundario) sₚ² = 3647.14, [−160.54 ; −126.86]; diferencia de proporciones −0.03 [−0.0808 ; 0.0208].
Comparación del piloto, 95 %: Welch −165.19 [−194.89 ; −135.48], ν = 29.386; razón de varianzas [0.0032 ; 0.0140] (no contiene 1).

> **Antes de publicar cualquier número, contrastarlo en la app** (cargar el respaldo y abrir `/resultados`): si la app muestra algo distinto, **la app manda** y hay que avisar al usuario. La diferencia posible sería de redondeo.

## 5. Fuentes de verdad (qué leer y qué manda)

| Archivo | Para qué | Autoridad |
|---------|----------|-----------|
| `docs/02-especificacion-estadistica.md` | Fórmulas, condiciones, plantillas de interpretación y **valores de prueba** (SciPy) | **Máxima** en estadística |
| `docs/01-planteamiento.md` | Caso, pregunta, objetivos, variables, diseño, limitaciones, guion sugerido | **Máxima** en contexto y alcance |
| `docs/decisiones.md` | Cómo se resolvieron puntos ambiguos (29 decisiones), p. ej. n=ceil, reglas de recomendación (9), lotes de 2 (27), reemplazo por fase (28), origen de las mediciones y respaldo (29) | Máxima en comportamiento real de la app; prevalece sobre docs/02-03 si hay diferencia |
| `README.md` | Estado, scripts, flujo de la sustentación, integrantes | Alta |
| `docs/03-especificacion-tecnica.md` | Arquitectura (diagrama), rutas, CSV, páginas | Alta para la diapositiva de herramienta |
| `docs/04-plan-de-implementacion.md` | Hitos y calendario (no usar en la presentación salvo si piden proceso) | Media |
| `src/lib/stats/interpret.ts`, `src/lib/ciText.ts` | Redacción exacta de interpretaciones, regla de recomendación, fórmulas y sustituciones que muestra la app | Alta (citar textual) |
| `src/lib/presets.ts` | APIs y parámetros por defecto | Alta |
| `public/data/respaldo.csv` | Dataset real de respaldo (272 filas) | Fuente de los números de 4.14 |

Plantillas de redacción de la app (para citar igual que la pantalla): «Con 95% de confianza, el tiempo medio de respuesta de {api} está entre {lower} ms y {upper} ms.» · «Se recomienda {api}: el IC de la diferencia de medias no contiene 0 y {api} responde más rápido.»

## 6. Guía de demo en vivo (paso a paso)

**Preparación (antes de entrar al salón):**
1. `npm install` (una vez) y `npm run dev` (o `npm run build && npm start`); abrir `http://localhost:3000`. Ejecutar **en local**, no en un servidor remoto (mediría desde ese servidor).
2. **Advertencia: pulsar «Borrar datos» antes de empezar** (en `/experimento` o `/datos`) si hay datos de prueba en el navegador. Los datos se guardan en `localStorage` (clave `latencialab:v1`) y se mezclarían con la demo.
3. Verificar internet y el modo oscuro/claro que se vea mejor en el proyector.

**Flujo (en este orden):**
1. **`/` Inicio:** leer el caso y el SLA de 300 ms; señalar los 4 pasos y la tabla de unidades.
2. **`/experimento` · «Verificar APIs»:** hace 1 petición a cada API y muestra estado y latencia (comprueba que hay internet).
3. **Piloto:** fase «piloto», 30 por API → «Ejecutar piloto». Mostrar la barra de progreso y las últimas mediciones (A, B, A, B…; las 3 primeras son calentamiento). Duración aprox.: unos 70 s para piloto + principal según los timestamps del respaldo; el piloto solo es más corto. `[COMPLETAR: cronometrar el piloto en el ensayo]`.
4. **`/muestreo` · Calculadora:** muestra `s` del piloto; elegir E y confianza; leer fórmula y sustitución; pulsar **«Usar este n»** (limita a 10–1000, decisión 11) → vuelve a `/experimento` con n precargado.
5. **Experimento principal:** «Ejecutar experimento principal» (en el ensayo se usó n = 100; ver nota en 4.7). Si ya hay datos de esa fase, la app pide confirmación y reemplaza solo esa fase.
6. **`/resultados`:** fase principal. Mostrar descriptivos e histogramas con la línea del SLA; una `CiCard` (fórmula → sustitución → resultado → interpretación → advertencias); cambiar 95 % → 90 % → 99 % y ver que recalcula al instante; `CiForestChart`; `ComparisonPanel` (razón F → Welch o agrupado → diferencia de medias → diferencia de proporciones); `Recommendation`.
7. **`/muestreo` · Simulador TLC:** variar el tamaño *m* con el slider (2–100); 1000 réplicas, semilla 12345 (reproducible); comparar histograma original (sesgado) con el de las medias.
8. **`/datos`:** tabla (orden, filtro por API/fase/estado), exportar CSV; mencionar que importar el mismo CSV devuelve los mismos datos.

**Plan B (falla internet o la API tarda):**
- Ir a **`/datos` → «Cargar dataset de respaldo»** (carga `public/data/respaldo.csv` desde la propia app, sin internet; si ya hay mediciones pide confirmación y las reemplaza). Luego seguir en `/resultados` y `/muestreo`. Los números serán los de la sección 4.14.
- Decirlo con naturalidad: «Estos datos los medimos con esta misma aplicación el 14 de noviembre de 2026.»
- Para el piloto en vivo sin internet, se puede mostrar solo el resultado: el respaldo incluye piloto y principal.
- Si el servidor local no arranca: tener capturas de cada ruta como respaldo final `[COMPLETAR: tomar capturas en el ensayo]`.

## 7. Restricciones para el agente de diapositivas

### 7.1 Reglas
- **No inventar números, nombres, resultados ni requisitos.** Usar solo la sección 4.14 y los valores de prueba de docs/02; si falta un dato, usar el marcador `[COMPLETAR con la app: ruta /resultados, campo X]`.
- **Todo en español.** Terminología de la materia (intervalo de confianza, error estándar, nivel de confianza, grados de libertad).
- **No cambiar el código de la app** ni los datos del repositorio. Los archivos de la presentación van en una carpeta nueva (p. ej. `presentacion/`) fuera de `src/`.
- No afirmar causalidad ni generalizar: los resultados son de la red del equipo en ese momento.
- No usar pruebas de hipótesis (Unidad IV); las comparaciones se expresan con intervalos (el IC de la diferencia contiene o no el 0).
- Fórmulas escritas exactamente como en docs/02 (cuantiles z, t, χ², F; Welch con ν no entero).
- Mostrar capturas reales de la app en vez de mockups cuando sea posible.

### 7.2 Formato, duración y rúbrica
- **Formato sugerido:** `.pptx` (compatible con cualquier computador de aula), con notas del orador; alternativa: deck HTML o PDF. **`[COMPLETAR: confirmar con el usuario el formato de entrega]`.**
- **Duración y rúbrica de la sustentación:** no aparecen en la documentación del repositorio. **`[COMPLETAR: duración, rúbrica]`**. La referencia disponible es «10–12 diapositivas» en docs/01.
- **Reparto de oradores:** `[COMPLETAR: quién presenta qué entre Richard Rodríguez, Jesus Angulo y Jesus Palacios]`.

### 7.3 Preguntas abiertas para el usuario (hacerlas antes de empezar y esperar la respuesta)
1. ¿Qué formato de entrega quiere (.pptx, PDF, HTML)? ¿Hay plantilla o identidad visual de la universidad?
2. ¿Cuánto dura la sustentación y cuánto es para preguntas? ¿Hay rúbrica o criterios del profesor?
3. ¿Quién presenta cada parte?
4. ¿Las APIs del respaldo fueron JSONPlaceholder (A) y DummyJSON (B)? ¿Desde qué ciudad/red se midió?
5. ¿Con qué margen de error E se justificó n = 100 para el experimento principal?
6. ¿La demo en vivo va en medio de la presentación o al final?
7. ¿Se medirá de nuevo en vivo (los números cambiarán) o se mostrará el respaldo? ¿Se deben actualizar las cifras de la sección 4.14 con una nueva medición?
8. ¿Quiere que el agente genere las capturas (necesita la app corriendo) o las aportará el usuario?
9. ¿Idioma de las notas del orador y nivel de detalle matemático esperado por el profesor?

## 8. Preguntas esperadas del jurado y respuestas sugeridas

1. **¿Por qué usar t y no z para la media?** Porque σ es desconocida y se estima con *s*; la t incorpora esa incertidumbre. Con n grande (gl = 99: t = 1.9842 vs. z = 1.96) casi coinciden; la app muestra ambos.
2. **Las latencias no son normales, ¿es válido el IC de la media?** Sí, por el TLC con *n* grande (100 por API). Lo mostramos con el simulador: la distribución de la media se aproxima a la normal aunque los datos sean sesgados.
3. **¿Por qué desconfiar del IC de la desviación y de la razón de varianzas?** Porque χ² y F suponen normalidad y son sensibles al sesgo. Los datos tienen g₁ = 6.86 (A) y 4.31 (B), y la app lo advierte. La conclusión principal (diferencia de medias) no depende de ese supuesto.
4. **¿Por qué Welch y no el agrupado?** La razón de varianzas A/B tiene IC [0.2428 ; 0.5363], que no contiene 1: las varianzas son distintas. Welch no asume varianzas iguales y usa ν = 162.2168 sin redondear. Aun así, el agrupado da casi lo mismo ([−160.54 ; −126.86]).
5. **¿Cómo interpreta un IC al 95 %?** El método captura el parámetro en el 95 % de las muestras repetidas; no es «hay 95 % de probabilidad de que μ esté aquí». Para el IC de la diferencia: no contiene 0, así que hay evidencia de diferencia.
6. **¿Por qué calentamiento y por qué intercalado?** Las primeras peticiones incluyen DNS/TLS en frío (la primera a B tardó 892.07 ms) y el intercalado hace que A y B vean las mismas condiciones de red.
7. **¿Por qué las peticiones son secuenciales y desde el servidor?** La concurrencia distorsiona las latencias; el servidor evita CORS y homogeneiza la medición. La pausa de 100 ms busca aproximar independencia.
8. **¿Cómo se calculó n y por qué 100?** `n = (z·s/E)²` con *s* del piloto, redondeando hacia arriba. Con E = 10 ms y el piloto, B requeriría 242 y A bastaría con el mínimo; se usó 100 `[COMPLETAR: justificación del equipo]`. El margen real obtenido fue 8.73 ms (A) y 14.53 ms (B).
9. **¿Los resultados valen para cualquier usuario?** No. Dependen de la red, la hora y la ubicación del equipo; para generalizar habría que medir desde varias redes y horarios.
10. **¿Por qué no hay prueba de hipótesis?** Está fuera del alcance (Unidad IV); la comparación se hace con intervalos: si el IC de la diferencia no contiene 0, hay diferencia.
11. **La proporción de A incumple el SLA solo 2/100; ¿es confiable su IC?** Con n·p̂ = 2 < 5 no se cumple la condición; la app lo advierte. Además, el IC de la diferencia de proporciones contiene 0, así que no afirmamos diferencia en el SLA.
12. **¿Cómo sabe que el código calcula bien?** Pruebas con valores de SciPy (tolerancia 1e-3), 65 pruebas, funciones puras en `src/lib/stats`; p. ej. IC de la media de [10,12,14,16,18] = [10.073514 ; 17.926486].
13. **¿Qué pasaría con otro nivel de confianza?** El intervalo se ensancha con más confianza; con 90 % y 99 % la conclusión de la diferencia no cambia (sección 4.10).
14. **¿Por qué una API es más rápida?** `[COMPLETAR: no se midió la causa; no especular (podrían influir ubicación del servidor, CDN, tamaño de respuesta: 292 vs. 453 bytes)]`. Responder que el estudio estima diferencias, no explica causas.
