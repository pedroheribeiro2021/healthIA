"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoje" },
  { href: "/sono", label: "Sono" },
  { href: "/exercicios", label: "Exercícios" },
  { href: "/corpo", label: "Corpo" },
  { href: "/exames", label: "Exames" },
  { href: "/nutricao", label: "Nutrição" },
  { href: "/insights", label: "Insights" },
  { href: "/registro", label: "Registro" },
] as const;

// Rolagem horizontal em vez de colunas de largura igual: com 7 abas, dividir
// igualmente o espaço faria rótulos como "Exercícios"/"Insights" quebrar
// linha num celular comum — cada aba mantém uma largura legível e as que
// não cabem ficam a um swipe de distância.
export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <ul className="mx-auto flex max-w-md gap-1 overflow-x-auto px-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="shrink-0">
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
