import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const steps = [
  { n: 1, title: "Piloto", text: "30 peticiones por API para estimar la desviación estándar s.", href: "/experimento", cta: "Ir a Experimento" },
  { n: 2, title: "Tamaño de muestra", text: "Calcula n para el margen de error deseado y pulsa «Usar este n».", href: "/muestreo", cta: "Ir a Muestreo" },
  { n: 3, title: "Experimento", text: "Ejecuta la fase principal con ese n, intercalando A y B.", href: "/experimento", cta: "Ir a Experimento" },
  { n: 4, title: "Resultados", text: "Intervalos de confianza, prueba de hipótesis, comparación A vs. B y recomendación.", href: "/resultados", cta: "Ver resultados" },
];

const units = [
  ["I · Distribuciones muestrales", "Distribución de la media y de la proporción, TLC", "Muestreo → Simulador TLC"],
  ["II · Estimación y muestreo", "Estimadores puntuales, error estándar, tamaño de muestra, diseño de muestreo", "Muestreo → Calculadora; Experimento"],
  [
    "III · Intervalos de confianza",
    "IC para la media (Z con σ conocida; Z con s si n ≥ 30; t si n < 30), para la proporción, para la diferencia de medias (Z o t con Sp) y para la diferencia de proporciones",
    "Resultados",
  ],
  [
    "IV · Pruebas de hipótesis",
    "Prueba de hipótesis para la diferencia de medias (H₀, H₁, α, Z.A./R.C., P.C.I./P.C.S., p-valor)",
    "Resultados → Prueba de hipótesis",
  ],
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">LatenciaLab</h1>
        <p className="text-lg text-muted-foreground">Intervalos de confianza para el tiempo de respuesta de APIs web.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>El caso</CardTitle>
          <CardDescription>Estadística Inferencial · Ingeniería de Sistemas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Una startup colombiana construye una aplicación móvil que consume datos de un proveedor externo vía API REST. Hay dos
            candidatos (API A y API B) con recursos equivalentes y un requisito: <strong>cada petición debe responder en menos de 300 ms</strong>.
          </p>
          <p>
            <strong>Pregunta de investigación:</strong> desde nuestra red, ¿cuál es el tiempo medio de respuesta real de cada API, qué
            proporción de peticiones incumple el SLA y existe una diferencia real entre A y B?
          </p>
          <p className="text-sm text-muted-foreground">
            Las mediciones se hacen desde el servidor, de forma secuencial e intercalada (A, B, A, B...), descartando las primeras
            peticiones de calentamiento. Los resultados dependen de la red, la hora y la ubicación.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="pasos">
        <h2 id="pasos" className="text-xl font-semibold">
          Cómo usar la app
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.n} size="sm">
              <CardHeader>
                <CardTitle>
                  {s.n}. {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{s.text}</p>
                <Link href={s.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {s.cta}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Si falla internet, en Datos puedes cargar el dataset de respaldo.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="temas">
        <h2 id="temas" className="text-xl font-semibold">
          Temas de la materia
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidad</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Dónde está en la app</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map(([u, t, w]) => (
                <TableRow key={u}>
                  <TableCell className="font-medium whitespace-normal">{u}</TableCell>
                  <TableCell className="whitespace-normal">{t}</TableCell>
                  <TableCell className="whitespace-normal">{w}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
