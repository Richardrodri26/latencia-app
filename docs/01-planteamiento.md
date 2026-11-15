# 01 · Planteamiento del caso

## Contexto

Una startup colombiana está construyendo una aplicación móvil que consume datos de un proveedor externo vía API REST. Hay **dos proveedores candidatos (API A y API B)** que ofrecen recursos equivalentes. El equipo definió un requisito no funcional (SLA interno):

> **Cada petición debe responder en menos de 300 ms.**

Elegir el proveedor solo por lo que dice su página comercial es riesgoso: el tiempo de respuesta real depende de la red, la distancia al servidor y la carga. El equipo decide **medir** y usar **estadística inferencial** para decidir con evidencia.

## Pregunta de investigación

Desde nuestra red, ¿cuál es el **tiempo medio de respuesta** real de cada API, qué **proporción de peticiones incumple el SLA** y existe una **diferencia real** entre A y B?

## Objetivos

**General:** estimar mediante intervalos de confianza, y contrastar con una prueba de hipótesis, el desempeño (tiempo de respuesta) de dos APIs públicas para apoyar la elección de proveedor, usando una aplicación web propia que recolecta y analiza los datos.

**Específicos:**

| # | Objetivo | Unidad |
|---|----------|--------|
| 1 | Mostrar la distribución muestral de la media y la proporción (TLC) a partir de los datos medidos | I |
| 2 | Estimar puntualmente la media, la varianza muestral (s² = SS/(n − 1)) y las proporciones; calcular el error estándar | II |
| 3 | Determinar el tamaño de muestra necesario a partir de una prueba piloto | II |
| 4 | Construir IC para la media (Z con s si n ≥ 30; t si n < 30) y para la proporción de cada API | III |
| 5 | Construir IC para la diferencia de medias y la diferencia de proporciones entre A y B («si el IC contiene al cero, no hay diferencias») | III |
| 6 | Contrastar con una prueba de hipótesis la diferencia de medias μ_A − μ_B (procedimiento de clase en 4 pasos, Z.A./R.C., p-valor) | IV |
| 7 | Interpretar los resultados y recomendar un proveedor | III–IV |

> **Alcance: solo procedimientos vistos en clase** («no añadir más de lo que nos han dado»). Lo retirado por no verse en clase está en la sección «Eliminado por no verse en clase» de [02](02-especificacion-estadistica.md). La única prueba de hipótesis es la de diferencia de medias. Detalle en [02](02-especificacion-estadistica.md), [06](06-pruebas-de-hipotesis.md) y [07](07-alineacion-con-la-clase.md).

## Población, muestra y variables

- **Población:** todas las peticiones GET posibles a cada API desde la red del equipo durante el periodo de estudio (conceptualmente infinita).
- **Unidad de muestreo:** una petición HTTP GET.
- **Muestra:** las *n* peticiones medidas por la app para cada API.

| Variable | Tipo | Definición |
|----------|------|------------|
| `X` tiempo de respuesta | Cuantitativa continua (ms) | Tiempo desde que se envía la petición hasta recibir el cuerpo completo |
| `S` incumple SLA | Bernoulli (0/1) | 1 si `X > umbral` (por defecto 300 ms) |
| `F` petición fallida | Bernoulli (0/1) | 1 si hay error de red, timeout o estado HTTP ≠ 2xx |
| `G` proveedor | Cualitativa (A/B) | API a la que se hizo la petición |

## Diseño del muestreo

1. **Prueba piloto:** 30 peticiones por API → se estima la desviación estándar `s`.
2. **Tamaño de muestra:** con `s` del piloto, un margen de error deseado `E` (ej. 10 ms) y una confianza dada se calcula `n` (Unidad II).
3. **Experimento principal** con ese `n`:
   - **Intercalado A/B/A/B…** para que ambas APIs se midan bajo las mismas condiciones de red.
   - **Calentamiento:** se descartan las primeras 3 peticiones de cada API (DNS/TLS en frío).
   - **Pausa entre peticiones** (100 ms por defecto) para aproximar independencia y no saturar las APIs.
   - Se registra fecha/hora de cada medición (`startedAt`). La red usada se puede anotar en el formulario (campo opcional, ej. "WiFi de casa"); no forma parte del CSV. Las mediciones se hacen desde el equipo y la red de los integrantes, donde se ejecuta la aplicación (ver decisión 29 en `docs/decisiones.md`).

## Supuestos y limitaciones (para mencionar en la sustentación)

- Las latencias suelen tener **sesgo a la derecha**. El IC de la media sigue siendo válido con *n* grande por el **TLC**.
- Regla del cuaderno para la media: σ desconocida y n < 30 → t de Student; por extensión, con n ≥ 30 (piloto de 30 y principal de 100) se usa **Z con s en lugar de σ**.
- Si alguna muestra fuera pequeña (n < 30), la diferencia de medias usaría t con varianza agrupada Sp, que **supone σ_A = σ_B** (como en los apuntes).
- El IC de una proporción solo aplica si n·p̂ ≥ 5 y n·q̂ ≥ 5; con pocas peticiones sobre el SLA (p. ej. 2 de 100) la app indica que no aplica.
- Los resultados dependen de la red, la hora y la ubicación. No se generalizan a otros usuarios.
- La independencia entre peticiones es aproximada.

## APIs propuestas (públicas, gratuitas y sin API key)

Comparación por defecto (recursos equivalentes y payload similar):

- **API A:** JSONPlaceholder – `https://jsonplaceholder.typicode.com/posts/1`
- **API B:** DummyJSON – `https://dummyjson.com/posts/1`

Alternativas disponibles como presets: PokeAPI (`https://pokeapi.co/api/v2/pokemon/ditto`), REST Countries (`https://restcountries.com/v3.1/name/colombia`) y Open‑Meteo para Bogotá (`https://api.open-meteo.com/v1/forecast?latitude=4.71&longitude=-74.07&current=temperature_2m`).

## Estructura sugerida de la presentación (12 diapositivas)

1. Título, integrantes y materia
2. Caso problema: la startup y el SLA de 300 ms
3. Pregunta de investigación y objetivos
4. Población, muestra, variables y diseño del muestreo
5. Herramienta digital: demo de LatenciaLab (arquitectura en una imagen)
6. Unidad I: distribución muestral de la media (histograma de los datos vs. histograma de las medias)
7. Unidad II: estimación puntual, error estándar y tamaño de muestra desde el piloto
8. Unidad III: IC por API (media en 4 pasos, proporción que incumple el SLA en 6 pasos)
9. Unidad III: comparación A vs. B (diferencia de medias y diferencia de proporciones; regla del cero)
10. Unidad IV: prueba de hipótesis para la diferencia de medias (4 pasos, Z.A./R.C., P.C.I./P.C.S., p-valor)
11. Interpretación y recomendación de proveedor
12. Limitaciones, conclusiones y preguntas
