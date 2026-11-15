"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // false en el servidor y en la hidratación; true ya montado (sin warnings de hidratación).
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = resolvedTheme === "dark";
  const next = dark ? "claro" : "oscuro";
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={mounted ? `Cambiar a modo ${next}` : "Cambiar tema"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {mounted ? `Modo ${next}` : "Tema"}
    </Button>
  );
}
