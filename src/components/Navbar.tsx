"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/experimento", label: "Experimento" },
  { href: "/datos", label: "Datos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/muestreo", label: "Muestreo" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Latencia<span className="text-primary/60">Lab</span>
        </Link>
        <nav
          aria-label="Principal"
          className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:p-0"
        >
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto md:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
