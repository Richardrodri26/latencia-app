/** Cambia el guion ASCII de los negativos por el signo menos «−» (U+2212). Solo para mostrar texto, nunca para convertir a número. */
export const minus = (s: string) => s.replace(/-/g, "−");
