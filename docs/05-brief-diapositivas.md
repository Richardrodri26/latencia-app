# 05 · Brief para crear las diapositivas de la sustentación

Documento autocontenido para un agente (o persona) que **no conoce el proyecto** y debe producir o revisar las diapositivas de la sustentación de **LatenciaLab**. Lo que está aquí se verificó contra el repositorio, las pruebas automáticas y los apuntes de clase; lo que no se pudo verificar está marcado con `[COMPLETAR ...]`.

> **Actualización (15-nov-2026, hitos 8–14).** Este brief se reescribió: la app ya **no** tiene Welch, razón de varianzas (F) ni IC de varianza/desviación (χ²) (decisión 31 de docs/decisiones.md). Todas las cifras de abajo son las de la app actual con el dataset de respaldo y cada grupo cita el archivo que las fija. **Si las diapositivas existentes mencionan Welch, F, χ², «más estable» o t con gl = 99 para la media, están desactualizadas.**

## 0. Prompt listo para pegar

```text
Vas a crear (o revisar) las diapositivas de la sustentación del proyecto universitario LatenciaLab
(Estadística Inferencial, jueves 19 de noviembre de 2026).

1. Lee primero docs/05-brief-diapositivas.md del repositorio: es tu brief completo.
2. Para cualquier hecho, fórmula o decisión, consulta las fuentes de verdad de la sección 5.
   docs/02-especificacion-estadistica.md y docs/06-pruebas-de-hipotesis.md mandan en los procedimientos
   de clase; docs/07-alineacion-con-la-clase.md explica qué se quitó; docs/decisiones.md (30-55) manda
   en el comportamiento de la app.
3. Usa SOLO los métodos vistos en clase: IC de la media (Z con σ, Z con s si n >= 30, t si n < 30),
   IC de proporción en 6 pasos, IC de diferencia de medias y de proporciones, y la PRUEBA DE HIPÓTESIS
   para la diferencia de medias (H0, H1, α, Z.A./R.C., P.C.I./P.C.S., p-valor). La clase dice
   «se acepta H0» / «se rechaza H0». NO incluyas Welch, razón de varianzas (F), IC de varianza o
   desviación (chi-cuadrado), errores tipo I/II ni potencia.
4. NO inventes números, resultados, nombres ni requisitos. Usa solo las cifras de la sección 4.15
   (cada una trae su fuente) o deja el marcador [COMPLETAR ...].
5. NO modifiques el código de la aplicación. Solo crea o edita los archivos de la presentación.
6. Todo el texto de las diapositivas va en español.
7. Antes de empezar, haz al usuario las preguntas abiertas de la sección 7.3 que sigan sin respuesta y ESPERA.
8. Entrega: el formato que confirme el usuario (sugerido: .pptx) más las notas del orador por diapositiva.
```

## 1. Contexto

- **Proyecto:** LatenciaLab, app web que **mide en vivo** el tiempo de respuesta de dos APIs públicas y usa **intervalos de confianza** y una **prueba de hipótesis** para decidir cuál conviene a una startup con un requisito de **menos de 300 ms por petición** (SLA).
- **Materia:** Estadística Inferencial · Ingeniería de Sistemas. Unidad I (distribuciones muestrales, TLC), II (estimación puntual, error estándar, tamaño de muestra, diseño de muestreo), III (intervalos de confianza) y IV (solo la prueba de hipótesis para la **diferencia de medias**).
- **Regla del proyecto:** «No añadir más de lo que nos han dado»: solo procedimientos, notación y redacción de los apuntes de clase.
- **Equipo:** Richard Rodríguez, Jesus Angulo, Jesus Palacios.
- **Fecha de la sustentación:** jueves 19 de noviembre de 2026.
- **Stack (una línea para la diapositiva de herramienta):** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Zod · TanStack Query/Form/Table · jstat · Vitest. README: `lint`, `typecheck`, `test` (200 pruebas, con los ejemplos del cuaderno, el respaldo y la prueba de hipótesis) y `build` pasan.
- **Dónde corre:** **en local** (las latencias se miden desde el equipo y la red de los integrantes).

| Comando | Qué hace |
|---------|----------|
| `pnpm install` | Instala dependencias |
| `pnpm dev` | Servidor de desarrollo en **http://localhost:3000** |
| `pnpm build` y `pnpm start` | Producción local (alternativa estable para la demo) |

| Ruta | Contenido |
|------|-----------|
| `/` | Caso, 4 pasos («Cómo usar la app») y tabla de temas por unidad (I a IV) |
| `/experimento` | Formulario, «Verificar APIs», ejecutar piloto o principal, progreso, «Borrar datos» |
| `/datos` | Tabla (ordenar, filtrar, paginar), exportar/importar CSV y JSON, «Cargar dataset de respaldo» |
| `/resultados` | Selector 90/95/99 %, descriptivos, histogramas con línea del SLA, IC en pasos, comparación A vs. B, **prueba de hipótesis**, recomendación |
| `/muestreo` | Calculadora de tamaño de muestra y simulador del TLC |
| `POST /api/measure` | Route Handler que mide en el servidor (solo en la diapositiva de arquitectura) |

> Estado de la verificación (README): la UI se comprobó con pruebas de render y `build`; la revisión visual en navegador de `/resultados` (incluida la curva de la prueba) es un pendiente del proyecto. **Antes de publicar capturas o cifras, contrastarlas en la app** (sección 6, plan B).

## 2. Mensaje central y audiencia

**Tesis (casi literal):** *«Elegir un proveedor de API por su página comercial es riesgoso; medimos, y con intervalos de confianza y una prueba de hipótesis obtuvimos evidencia estadística de cuál responde más rápido desde nuestra red, con qué incertidumbre y bajo qué supuestos.»*

- **Audiencia:** jurado universitario (profesor de Estadística Inferencial). Evalúa **conceptos**: cada resultado va con los **pasos de clase** (fórmula, sustitución numérica, resultado, interpretación) y la notación del cuaderno.
- **Tono:** formal-académico pero claro. Una idea por diapositiva, poco texto, fórmulas legibles, gráficos de la propia app. Presentar las limitaciones sin esconderlas.

## 3. Datos del estudio (hechos verificados)

- **Pregunta de investigación** (texto de `/`): desde nuestra red, ¿cuál es el tiempo medio de respuesta real de cada API, qué proporción de peticiones incumple el SLA y existe una diferencia real entre A y B?
- **Población:** todas las peticiones GET posibles a cada API desde la red del equipo durante el periodo de estudio (conceptualmente infinita). **Unidad:** una petición HTTP GET. **Muestra:** las *n* peticiones medidas por API.
- **Variables:** `X` tiempo de respuesta (continua, ms) · `S` incumple SLA (Bernoulli, `X > 300 ms`) · `F` petición fallida (Bernoulli) · `G` proveedor (A/B).
- **APIs por defecto** (`src/lib/presets.ts`): A = JSONPlaceholder (`https://jsonplaceholder.typicode.com/posts/1`), B = DummyJSON (`https://dummyjson.com/posts/1`). Otros presets: PokeAPI, REST Countries, Open-Meteo (Bogotá).
  - El CSV de respaldo **no guarda los nombres de las APIs** (decisión 29). `[COMPLETAR: confirmar con el equipo que el dataset se midió con JSONPlaceholder (A) y DummyJSON (B)]`. Mientras tanto, en las capturas del respaldo la app mostrará los nombres que tenga en la configuración.
- **Diseño** (`presets.ts`, decisiones 27–28): piloto de 30 por API → tamaño de muestra → principal. Intercalado A/B/A/B…, **3 peticiones de calentamiento** descartadas por API y fase, pausa de 100 ms, timeout 5000 ms, SLA 300 ms. Peticiones **secuenciales** y **hechas en el servidor** (`/api/measure`), en **lotes** de 2 por API (el progreso avanza cada 4 peticiones; al cancelar se pierde como máximo el lote en vuelo). **Ejecutar una fase reemplaza solo los datos de esa fase** (pide confirmación); importar CSV/JSON reemplaza todo; «Borrar datos» limpia todo.
- **Datos que entran a cada cálculo:** latencia y proporción SLA usan solo `ok = true` y `warmup = false`; la tasa de fallos usa todas las mediciones con `warmup = false`.
- **Supuestos y limitaciones (docs/01):**
  1. Las latencias tienen **sesgo a la derecha**; con *n* grande el IC de la media sigue siendo válido por el **TLC** (la app ya no emite advertencias de asimetría: decisión 39).
  2. **Regla de la distribución** (decisión 32): σ conocida → Z; σ desconocida y n < 30 → t (gl = n − 1); σ desconocida y n ≥ 30 → **Z usando s en lugar de σ** (extensión derivada de la regla del cuaderno). En la app σ nunca se conoce.
  3. El IC de una proporción solo aplica si n·p̂ ≥ 5 y n·q̂ ≥ 5; si no, la app dice **«no aplica»** (decisión 34).
  4. Con muestras pequeñas la diferencia de medias usa t con Sp **suponiendo σ₁ = σ₂** (como en los apuntes, sin verificarlo; decisión 33).
  5. Los resultados **dependen de la red, la hora y la ubicación**; no se generalizan a otros usuarios. La independencia entre peticiones es **aproximada** (de ahí la pausa y el intercalado).
  6. Datos del respaldo: recolectados el 14 de noviembre de 2026 con la propia app; el CSV no registra red ni ciudad.

## 4. Estructura propuesta (15 diapositivas + anexo)

Cada diapositiva: título, objetivo, viñetas, visual. Ajustar a `[COMPLETAR: duración]`. Si el tiempo es corto, fusionar 5 con 6 y 10 con 11.

### 4.1 Portada
- «LatenciaLab: intervalos de confianza y prueba de hipótesis para el tiempo de respuesta de APIs web» · Estadística Inferencial · integrantes · jueves 19 de noviembre de 2026. Visual: captura de `/` discreta.

### 4.2 Caso de estudio
- Startup colombiana con app móvil que consume una API REST · dos proveedores (A y B) · SLA: cada petición < 300 ms · la página comercial no refleja la red real. Visual: app móvil → API A / API B con «< 300 ms?».

### 4.3 Pregunta y objetivos
- Pregunta de investigación (sección 3) y objetivos por unidad (tabla de docs/01). Visual: tabla de `/` «Temas de la materia» (unidades I a IV).

### 4.4 Población, muestra y variables
- Población, unidad de muestreo y muestra · variables X, S, F, G · parámetros: μ, p (SLA), μ_A − μ_B, p_A − p_B. Visual: tabla de variables.

### 4.5 Diseño del experimento
- **Piloto (30 por API) → Tamaño de muestra → Experimento principal**: el piloto da `s` para calcular *n*. · 3 peticiones de calentamiento (DNS/TLS en frío) descartadas · intercalado A/B · pausa de 100 ms · **secuencial y en el servidor** (`/api/measure`, sin medir en paralelo ni desde el navegador) · lotes de 2 por API · solo `ok = true` y `warmup = false` entran a la estadística · cada fase reemplaza sus datos.
- Visual: diagrama de arquitectura (docs/03) y línea A, B, A, B con las 3 primeras en gris. Dato opcional de calentamiento: `[COMPLETAR con la app: ruta /datos, filas con warmup = true, columna latencia de la primera petición a B]`.

### 4.6 Tamaño de muestra y TLC (Unidades I y II)
- Fórmulas (docs/02): media `n = (Z_{α/2}·σ/E)²` con `s` del piloto; proporción `n = Z_{α/2}²·p(1−p)/E²`; siempre hacia arriba. Error estándar de la media `s/√n`.
- Ejemplos del cuaderno (tests/stats/stats.test.ts): σ = 50, E = 10, 95 % → 96.04 → **97**; p = 0.5, E = 0.05 → 384.15 → **385**.
- Con el piloto del respaldo (docs/02, «Tamaño de muestra con el piloto»): E = 10 ms, 95 %: B (s = 79.3460) → 241.8504 → **242**; A (s = 6.4733) → 1.6097 → 2 (la app impone mínimo 10, decisión 11). E = 5 ms: A 7, B 968.
- **Simulador del TLC** (`/muestreo`): 1000 réplicas, semilla 12345; con *m* grande la media se aproxima a una normal aunque los datos sean sesgados (g₁ de A en el principal = 6.86).
- `[COMPLETAR: qué E y qué n justificaron los 100 del principal]`. Hecho verificado: con n = 100 el margen de error real del IC 95 % fue **8.62 ms (A)** y **14.35 ms (B)** (tests/respaldo.test.ts).

### 4.7 Regla de distribución (cómo se elige Z o t)
- Notación de clase: (θ̂ᵢ ≤ θ ≤ θ̂ₛ) = (1 − α)·100 %; N.C. por defecto 95 %; α/2 → valor de tabla (90 %: 1.645; 95 %: 1.96; 98 %: 2.326; 99 %: 2.576; tests/ciText.test.ts) · error de estimación / margen E.
- **Árbol de decisión (una diapositiva visual):** ¿σ conocida? → **Z**. ¿σ desconocida y n < 30? → **t de Student** (gl = n − 1). ¿σ desconocida y n ≥ 30? → **Z con s en lugar de σ**.
- Dos medias: σ conocidas → Z; σ desconocidas con n₁, n₂ ≥ 30 → Z con s₁², s₂²; si alguna muestra es pequeña → t con Sp² = [(n₁−1)s₁² + (n₂−1)s₂²]/(n₁+n₂−2) y gl = n₁ + n₂ − 2 (σ₁ = σ₂ supuesto).
- Nuestro caso: piloto n = 30 y principal n = 100 → **Z con s**. La t solo aparecería con menos de 30 datos válidos por API.

### 4.8 IC de la media (pasos de clase con sustitución)
- **4 pasos:** (1) x̄ = Σx/n; (2) SS = Σx² − (Σx)²/n, s² = SS/(n − 1), s; (3) «Como σ es desconocida y n ≥ 30, se usa la distribución normal Z con s en lugar de σ», Z_{α/2}, error estándar s/√n, E = Z_{α/2}·s/√n, IC = x̄ ± E; (4) interpretación: «Con 95% de confianza, el promedio real del tiempo de respuesta de {API} está entre {inf} ms y {sup} ms.», más la lectura contra el SLA (límite superior < 300 → cumple en promedio).
- **Ejemplo (API A, principal, 95 %)**, textos fijados en tests/ciText.test.ts: x̄ = Σx/n = 9051.20/100 = 90.51; Z_{α/2} = 1.9600 (tabla: 1.96); error estándar = 43.98/√100 = 4.3979; E = 1.9600 × 4.3979 = 8.62; **(81.89 ≤ μ ≤ 99.13) = 95 %**.
- Visual: tarjeta «IC para la media μ» de `/resultados` y el `CiForestChart` (barras de error con la línea roja del SLA).

### 4.9 IC de la proporción que incumple el SLA
- **6 pasos:** (1) p̂ = x/n y q̂ = 1 − p̂; (2) **condición de aplicabilidad** n·p̂ ≥ 5 y n·q̂ ≥ 5; (3) valor crítico; (4) SE = √(p̂q̂/n); (5) E e IC; (6) interpretación.
- **API B** (5/100): p̂ = 0.0500, sí se cumple, SE = 0.0218 (0.02179), E = 0.04272, **IC 95 % [0.0073 ; 0.0927]**: entre 0.73 % y 9.27 % de las peticiones superan 300 ms.
- **API A** (2/100): n·p̂ = 2 < 5 → **«no aplica»**: la app muestra el aviso y deja el cálculo solo como «Cálculo de referencia (no aplica)» (referencia [0 ; 0.0474]); **no se inventa un método alternativo** (no Wilson, no corrección). Fallos: 0/100 en ambas → tampoco aplica.
- Fuente: tests/respaldo.test.ts y tests/ciText.test.ts. Visual: tarjeta de proporción de B con los 6 pasos y la de A con «no aplica».

### 4.10 IC de la diferencia de medias y de proporciones (Unidad III)
- **Diferencia de medias A − B** (n_A, n_B ≥ 30 → Z con s²): x̄_A − x̄_B = −143.70; EE = √(1934.19/100 + 5360.09/100) = 8.5407; E = 1.9600 × 8.5407 = 16.74; **(−160.44 ≤ μ_A − μ_B ≤ −126.96) = 95 %**. Regla de clase: **«si el intervalo contiene al cero, no hay diferencias»**; este no lo contiene → hay diferencia: A responde en promedio entre 126.96 y 160.44 ms antes que B.
- **Robustez:** 90 % (−157.75 ; −129.65); 99 % (−165.70 ; −121.70). La conclusión no cambia.
- **Diferencia de proporciones SLA A − B:** −0.03, SE = 0.0259, **IC 95 % (−0.0808 ; 0.0208)** → contiene al cero → no hay diferencia. **Nota obligatoria:** en A no se cumple n·p̂ ≥ 5 («En API A no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5»), así que esta comparación es solo orientativa.
- Fuente: tests/respaldo.test.ts y tests/ciText.test.ts. Visual: `ComparisonPanel` (recta numérica con el 0) y el selector 90/95/99 %.

### 4.11 Prueba de hipótesis para la diferencia de medias (Unidad IV)
- **Procedimiento de clase en 4 pasos:** (1) H₀: μ_A − μ_B = δ₀ y H₁ (<, >, ≠); (2) α (en la app 1, 5 o 10 %; por defecto **5 %**); (3) variante: Z = [(x̄_A − x̄_B) − δ₀]/√(s_A²/n_A + s_B²/n_B) con n ≥ 30 (t con Sp si hay muestras pequeñas); (4) decisión: variante en la **Z.A.** → se acepta H₀; en la **R.C.** → se rechaza H₀; **p-valor ≤ α** → se rechaza H₀. Puntos críticos **P.C.I.** y **P.C.S.**; el borde pertenece a la R.C.
- **Caso por defecto de la app** (bilateral, α = 5 %, δ₀ = 0; docs/06 §5.5 R2, tests/respaldo.test.ts): Z = −16.8252; P.C.I./P.C.S. = ±1.9600 (tabla ±1.96); p-valor «< 0.0001»; Z cae en la R.C. → **se rechaza H₀**.
- **Variante unilateral** (H₁: μ_A − μ_B < 0, α = 5 %; R1): P.C.I. = −1.6449 (tabla: −1.645); misma Z; se rechaza H₀. Conclusión de la app (tests/hypothesisText.test.ts): «Se rechaza H₀. Con α = 5%, hay evidencia de que el tiempo medio de respuesta de API A es menor que el de API B.»
- **Contraejemplo para la demo** (δ₀ = −150, bilateral; R3): Z = 0.7379; p-valor = 0.4606 > 0.05; Z cae en la Z.A. → **se acepta H₀** («…se acepta que μ_A − μ_B = −150 ms»). Coherente con el IC 95 %: −150 está dentro de (−160.44 ; −126.96).
- **Coherencia IC–prueba:** en la rama Z, la prueba bilateral con α = 1 − N.C. acepta H₀ ⇔ δ₀ está dentro del IC (propiedad probada en tests/respaldo.test.ts).
- **Tabla Z de clase** (docs/06): N.S. 1 % → 2.326 unilateral / 2.575 bilateral; 5 % → 1.645 / 1.96; 10 % → 1.282 / 1.645.
- **Redacción:** solo «se acepta H₀» / «se rechaza H₀». No hablar de errores tipo I/II, potencia ni «no se rechaza».
- Visual: curva de `HypothesisCurve` (Z.A., R.C., puntos críticos, variante; con Z = −16.83 la línea sale del eje y se rotula «fuera del gráfico ←»).

### 4.12 Recomendación
- **Regla de la app** (decisión 35): (1) si el IC de la diferencia de medias no contiene al cero, gana la API más rápida; (2) si lo contiene, decide el IC de la diferencia de proporciones del SLA; (3) si ambos contienen al cero: «No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.» (Ya no hay desempate por varianza.)
- **Con el respaldo** (tests/respaldo.test.ts: ganador A, criterio «media»): la app muestra *«Se recomienda JSONPlaceholder: el IC de la diferencia de medias no contiene al cero y JSONPlaceholder responde más rápido.»* (si A = JSONPlaceholder; si la configuración usa otro nombre, la app mostrará «API A» u otro). La prueba de hipótesis llega a lo mismo.
- Ambas cumplen el SLA en promedio (límite superior del IC de A: 99.13 ms; el de B: 248.56 ms); B tiene entre 0.73 % y 9.27 % de peticiones sobre 300 ms (IC de B, tarjeta de proporción).
- Visual: captura de `Recommendation`.

### 4.13 Supuestos y limitaciones
- Los 6 puntos de la sección 3, en dos columnas «Qué podemos afirmar» / «Qué no podemos afirmar». Énfasis: no hay causalidad (no se midió por qué una API es más rápida), los resultados no se generalizan a otras redes u horarios, la t con Sp supone σ₁ = σ₂, y la proporción de A no se puede estimar con la normal.

### 4.14 Demo en vivo
- Ver sección 6. Incluye `/resultados` → **Prueba de hipótesis** (elegir H₁, α y δ₀). Dónde va en el orden de la presentación: `[COMPLETAR: en medio o al final]`.

### 4.15 Conclusiones y preguntas
- (i) La media se infiere con Z con s (n ≥ 30) y el TLC lo respalda; (ii) hay diferencia real en el tiempo medio y A es más rápida (IC y prueba coinciden); (iii) la diferencia en el incumplimiento del SLA no es concluyente (el IC contiene al cero y en A no aplica la normal); (iv) trabajo futuro: más redes y horarios.
- **Frase para el orador:** «Con 95 % de confianza, A responde en promedio entre 126.96 y 160.44 ms antes que B desde nuestra red.» Cerrar con «Preguntas» y los nombres.

### 4.16 Cifras citadas y su fuente

Todas con el **dataset de respaldo** (`public/data/respaldo.csv`, 272 filas; fase principal, n = 100 por API, SLA 300 ms, filtro `ok` y no calentamiento). Fuente de las cifras: `tests/respaldo.test.ts` (tolerancia 1e-3) salvo donde se indica; verificadas además en el navegador por el equipo. En las diapositivas se usan los valores de tabla (1.645, 1.96, 2.576); la app usa el cuantil exacto y coincide con 2 decimales.

| Estadístico | API A | API B | Fuente |
|-------------|-------|-------|--------|
| Σx ; Σx² ; SS | 9051.20 ; 1010727.22 ; 191485.26 | (no fijado) | respaldo.test.ts |
| x̄ ; s ; s² | 90.51 ; 43.98 ; 1934.19 | 234.21 ; 73.21 ; 5360.09 | respaldo.test.ts |
| Mediana (A) ; P95 (B) ; CV (B) | 83.74 | P95 248.47 ; CV 0.3126 | respaldo.test.ts |
| g₁ (A) | 6.86 | (no fijado) | respaldo.test.ts |
| Error estándar s/√n | 4.3979 | 7.3213 | respaldo.test.ts |
| IC 90 % de la media | (83.28 ; 97.75), E = 7.23 | (222.17 ; 246.25), E = 12.04 | respaldo.test.ts |
| IC 95 % de la media | (81.89 ; 99.13), E = 8.62 | (219.86 ; 248.56), E = 14.35 | respaldo.test.ts |
| IC 99 % de la media | (79.18 ; 101.84), E = 11.33 | (215.35 ; 253.07), E = 18.86 | respaldo.test.ts |
| Incumple SLA (x/n) | 2/100, **no aplica** (ref. [0 ; 0.0474]) | 5/100, IC 95 % [0.0073 ; 0.0927], SE 0.02179, E 0.04272 | respaldo.test.ts |
| Fallos | 0/100, no aplica | 0/100, no aplica | respaldo.test.ts |

Comparación (principal): diferencia de medias −143.70 (EE 8.5407); IC 90 % (−157.75 ; −129.65), 95 % (−160.44 ; −126.96), 99 % (−165.70 ; −121.70) · diferencia de proporciones −0.03 (SE 0.0259): 90 % (−0.0726 ; 0.0126), 95 % (−0.0808 ; 0.0208), 99 % (−0.0967 ; 0.0367), condición no cumplida en A · recomendación: A por «media». *(tests/respaldo.test.ts)*

Prueba de hipótesis (α = 5 %): R1 (<, δ₀ = 0) Z = −16.8252, P.C.I. = −1.6449, p < 0.0001, se rechaza; R2 (≠, δ₀ = 0) ±1.9600, p < 0.0001, se rechaza; R3 (≠, δ₀ = −150) Z = 0.7379, p = 0.4606, se acepta; R4 (<, δ₀ = −100) Z = −5.1165, p < 0.0001, se rechaza. *(tests/respaldo.test.ts y docs/06 §5.5; textos en tests/hypothesisText.test.ts)*

Piloto (30 por API, Z con s, 95 %): x̄_A = 78.40, s_A = 6.47, IC (76.08 ; 80.71); x̄_B = 243.58, s_B = 79.35, IC (215.19 ; 271.97); SLA: A 0/30 y B 2/30, ambos «no aplica»; diferencia de medias −165.19, EE 14.5347, IC (−193.67 ; −136.70). *(tests/respaldo.test.ts)*

Ejemplos del cuaderno recalculados con SciPy (docs/02 y tests): días sin accidentes (n = 20, Σx = 873, Σx² = 39217) → IC 95 % [40.07 ; 47.23]; API de clase (n = 15) → IC 99 % [202.74 ; 226.33]; proporción 123/150 → [0.7585 ; 0.8815]. *(docs/02 y tests/stats/stats.test.ts)*

## 5. Fuentes de verdad (qué leer y qué manda)

| Archivo | Para qué | Autoridad |
|---------|----------|-----------|
| `docs/02-especificacion-estadistica.md` | Procedimientos de clase de los IC, notación, plantillas de interpretación y **valores de prueba**; lista «Eliminado por no verse en clase» | **Máxima** en estadística |
| `docs/06-pruebas-de-hipotesis.md` | Prueba de hipótesis para la diferencia de medias (4 pasos, Z.A./R.C., p-valor, tabla Z, casos R1–R4) | **Máxima** en la Unidad IV |
| `docs/07-alineacion-con-la-clase.md` | Qué se quitó (χ², F, Welch…) y qué cambió; regla de recomendación | **Máxima** para saber qué procedimientos NO usar |
| `docs/01-planteamiento.md` | Caso, pregunta, objetivos, variables, diseño, limitaciones | **Máxima** en contexto y alcance |
| `docs/decisiones.md` (30–55) | Cómo se resolvieron puntos ambiguos | Máxima en comportamiento de la app; prevalece sobre docs/02–03 |
| `README.md` | Estado, scripts, flujo de la sustentación, integrantes | Alta |
| `docs/03-especificacion-tecnica.md` | Arquitectura (diagrama), rutas, CSV | Alta para la diapositiva de herramienta |
| `src/lib/stats/interpret.ts`, `src/lib/ciText.ts`, `src/lib/hypothesisText.ts` | Redacción exacta de la app (citar textual) | Alta |
| `src/lib/presets.ts` | APIs y parámetros por defecto | Alta |
| `tests/respaldo.test.ts`, `tests/ciText.test.ts`, `tests/hypothesisText.test.ts` | Cifras y textos fijados | Fuente de la sección 4.16 |

## 6. Guía de demo en vivo (paso a paso)

**Preparación (antes de entrar al salón):**
1. `pnpm install` (una vez) y `pnpm dev` (o `pnpm build && ppnpm start`); abrir `http://localhost:3000`. Ejecutar **en local**.
2. **Pulsar «Borrar datos» antes de empezar** (en `/experimento` o `/datos`) si hay datos de prueba en el navegador (`localStorage`, clave `latencialab:v1`). **Advertencia:** «Borrar datos» limpia **todas** las fases; no lo uses en medio de la demo o perderás piloto y principal.
3. Verificar internet y el tema claro/oscuro que se vea mejor en el proyector.

**Flujo (en este orden):**
1. **`/` Inicio:** caso, SLA de 300 ms, los 4 pasos y la tabla de unidades (I a IV).
2. **`/experimento` · «Verificar APIs»:** 1 petición a cada API.
3. **Piloto:** fase «piloto», 30 por API → «Ejecutar piloto»; mostrar el progreso (las 3 primeras son calentamiento). `[COMPLETAR: cronometrar el piloto en el ensayo]`.
4. **`/muestreo` · Calculadora:** `s` del piloto, E y confianza; fórmula y sustitución; **«Usar este n»** (limita a 10–1000).
5. **Experimento principal:** «Ejecutar experimento principal». Si esa fase ya tiene datos, pide confirmación y reemplaza solo esa fase.
6. **`/resultados`:** descriptivos e histogramas; tarjeta de la media (4 pasos, «Z con s porque n ≥ 30»); tarjeta de proporción SLA (A «no aplica», B 6 pasos); cambiar 95 % → 90 % → 99 %; `CiForestChart`; `ComparisonPanel` (regla del cero); **Prueba de hipótesis**: por defecto bilateral/α = 5 %/δ₀ = 0 → se rechaza H₀; cambiar H₁ a «<» (P.C.I. = −1.6449); luego δ₀ = −150 bilateral → se acepta H₀; `Recommendation`.
7. **`/muestreo` · Simulador TLC:** variar *m* (2–100); comparar el histograma original (sesgado) con el de las medias.
8. **`/datos`:** tabla, exportar CSV; importar el mismo CSV devuelve los mismos datos.

**Plan B (falla internet o la API tarda):**
- **`/datos` → «Cargar dataset de respaldo»** (carga `public/data/respaldo.csv` sin internet; si ya hay mediciones pide confirmación y reemplaza todo). Seguir en `/resultados` y `/muestreo`; los números son los de 4.16.
- Decirlo con naturalidad: «Estos datos los medimos con esta misma aplicación el 14 de noviembre de 2026.»
- Si el servidor local no arranca: capturas de cada ruta `[COMPLETAR: tomar capturas en el ensayo]`.
- Si se mide de nuevo en vivo, las cifras cambiarán: usar la app como fuente y no leer las de 4.16.

## 7. Restricciones para el agente de diapositivas

### 7.1 Reglas
- **Solo procedimientos, notación y redacción de los apuntes de clase.** Nada de lo listado en «Eliminado por no verse en clase» de docs/02.
- **No inventar números, nombres, resultados ni requisitos.** Usar solo la sección 4.16 y los valores de prueba de docs/02 y docs/06; si falta, `[COMPLETAR con la app: ruta /resultados, campo X]`.
- **Todo en español**, con la terminología de la materia (intervalo de confianza, error estándar, nivel de confianza, grados de libertad, zona de aceptación, región crítica).
- **No cambiar el código de la app** ni los datos del repositorio; los archivos de la presentación van fuera de `src/`.
- No afirmar causalidad ni generalizar. Mostrar capturas reales de la app cuando sea posible.

### 7.2 Formato, duración y rúbrica
- **Formato sugerido:** `.pptx` con notas del orador. `[COMPLETAR: confirmar el formato de entrega y si hay plantilla de la universidad]`.
- `[COMPLETAR: duración y rúbrica]`. Referencia: docs/01 sugiere 12 diapositivas; la estructura de arriba tiene 15 con fusiones posibles.
- `[COMPLETAR: reparto de oradores entre Richard Rodríguez, Jesus Angulo y Jesus Palacios]`.

### 7.3 Preguntas abiertas para el usuario
Siguen vigentes:
1. ¿Formato de entrega (.pptx, PDF, HTML) y plantilla?
2. ¿Duración total, tiempo para preguntas y rúbrica?
3. ¿Quién presenta cada parte?
4. ¿Las APIs del respaldo fueron JSONPlaceholder (A) y DummyJSON (B)? ¿Desde qué red se midió?
5. ¿Con qué margen de error E se justificó n = 100?
6. ¿La demo va en medio o al final?
7. ¿Se medirá de nuevo en vivo o se mostrará el respaldo?
8. ¿El agente genera las capturas (necesita la app corriendo) o las aporta el usuario?

**Ya no aplican:** «¿la app está alineada con docs/07 y docs/06?» (los hitos 8–14 están implementados) y las notas de «antes de publicar, contrastar con la app una vez implementados los hitos 8–14» (ahora solo queda contrastar visualmente en el navegador).

## 8. Preguntas esperadas del jurado y respuestas sugeridas

1. **¿Por qué Z y no t para la media, si σ es desconocida?** Por la regla del cuaderno: σ desconocida y n < 30 → t; con n ≥ 30 se usa Z con s en lugar de σ (extensión derivada de la regla). Con n = 100 (y 30 en el piloto) la t y la Z prácticamente coinciden; con menos de 30 datos válidos la app usa t con gl = n − 1.
2. **Las latencias no son normales, ¿es válido el IC de la media?** Sí, por el TLC con *n* grande. El simulador lo muestra: la distribución de la media se aproxima a la normal aunque los datos sean sesgados (g₁ de A = 6.86).
3. **¿Por qué la proporción de A dice «no aplica»?** n·p̂ = 100 × 0.02 = 2 < 5: no se cumple la condición para usar la normal (Paso 2). No usamos otro método porque no está en los apuntes. En B, n·p̂ = 5 y n·q̂ = 95: sí aplica.
4. **¿No comparan varianzas ni usan Welch?** No: solo lo visto en clase. Comparamos medias con la diferencia de medias (Z con s² porque n_A, n_B ≥ 30) y proporciones con la diferencia de proporciones; no hay razón de varianzas, IC de varianza/desviación ni Welch. Con muestras pequeñas usaríamos t con Sp suponiendo σ₁ = σ₂, como en los apuntes.
5. **¿Cómo comparan las dos APIs?** IC de la diferencia de medias: (−160.44 ≤ μ_A − μ_B ≤ −126.96) = 95 %; no contiene al cero → hay diferencia. La diferencia de proporciones del SLA sí contiene al cero (y en A no se cumple la condición).
6. **¿Qué dice la prueba de hipótesis?** H₀: μ_A − μ_B = 0 contra H₁: ≠, α = 5 %: Z = −16.8252 cae en la R.C. (±1.9600), p < 0.0001 → se rechaza H₀. Con H₁: < el P.C.I. es −1.6449 y también se rechaza. Con δ₀ = −150, Z = 0.7379 cae en la Z.A. (p = 0.4606) → se acepta H₀, coherente con el IC.
7. **¿Por qué «se acepta H₀» y no «no se rechaza»?** Así lo dicen los apuntes de la clase; usamos esa redacción.
8. **¿Cómo interpreta un IC al 95 %?** Con 95 % de confianza el parámetro está entre los límites: el método captura el parámetro en el 95 % de las muestras repetidas.
9. **¿Por qué calentamiento e intercalado?** Las primeras peticiones incluyen DNS/TLS en frío; el intercalado hace que A y B vean las mismas condiciones de red.
10. **¿Por qué secuenciales y desde el servidor?** La concurrencia distorsiona las latencias; el servidor evita CORS. La pausa de 100 ms busca aproximar independencia.
11. **¿Cómo se calculó n y por qué 100?** `n = (Z_{α/2}·s/E)²` con *s* del piloto, hacia arriba (B con E = 10 ms: 242). `[COMPLETAR: justificación del equipo para n = 100]`; el margen real fue 8.62 ms (A) y 14.35 ms (B).
12. **¿Los resultados valen para cualquier usuario?** No: dependen de la red, la hora y la ubicación del equipo.
13. **¿Cómo sabe que el código calcula bien?** Pruebas automáticas con los ejemplos del cuaderno recalculados con SciPy (tolerancia 1e-3), el dataset de respaldo y los textos de los pasos.
14. **¿Qué pasaría con otro nivel de confianza?** El intervalo se ensancha con más confianza; al 90 % y al 99 % la conclusión de la diferencia de medias no cambia. En la prueba, α es independiente del N.C. del selector.
15. **¿Por qué una API es más rápida?** `[COMPLETAR: no se midió la causa; no especular]`. El estudio estima diferencias, no explica causas.
