"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoje" },
  { href: "/insights", label: "Insights" },
  { href: "/registro", label: "Registro" },
  { href: "/mais", label: "Mais" },
] as const;

// Seções secundárias (Sono, Exercícios, Corpo, Exames, Nutrição) moraram
// nesta barra até virarem 8 abas com rolagem horizontal — ficavam fora da
// tela sem nenhuma pista de que havia mais abas pra rolar. Agora só as 4
// mais usadas ficam fixas; o resto mora em /mais (MAIS_TAB_ROUTES abaixo
// mantém "Mais" destacado ao navegar por elas).
const MAIS_TAB_ROUTES = ["/sono", "/exercicios", "/corpo", "/exames", "/nutricao"];

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <ul className="mx-auto flex max-w-md px-2">
        {TABS.map((tab) => {
          const active =
            tab.href === "/mais"
              ? pathname === "/mais" ||
                MAIS_TAB_ROUTES.some((route) => pathname.startsWith(route))
              : pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-xs font-medium ${
                  active
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
