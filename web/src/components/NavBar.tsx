"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "hoje" | "plano" | "evolucao" | "insights" | "mais";

const TABS = [
  { href: "/", label: "Hoje", icon: "hoje" },
  { href: "/plano", label: "Plano", icon: "plano" },
  { href: "/evolucao", label: "Evolução", icon: "evolucao" },
  { href: "/insights", label: "Insights", icon: "insights" },
  { href: "/mais", label: "Mais", icon: "mais" },
] as const;

// Grupos de rotas que não têm aba própria — navegação por rotina (Fase 7
// Etapa 2), não por fonte de dado. Cada grupo mantém a aba pai destacada
// em suas sub-rotas, evitando que a barra precise de mais de 5 slots.
const SUB_ROUTES: Record<string, string[]> = {
  "/evolucao": ["/evolucao", "/corpo", "/sono", "/exercicios", "/relatorios"],
  "/mais": ["/mais", "/nutricao", "/exames", "/chat", "/registro"],
};

function isTabActive(tab: (typeof TABS)[number], pathname: string): boolean {
  const group = SUB_ROUTES[tab.href];
  if (group) return group.some((route) => pathname.startsWith(route));
  return pathname === tab.href;
}

function NavIcon({ name }: { name: IconName }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true,
  };
  switch (name) {
    case "hoje":
      return (
        <svg {...props}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "plano":
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case "evolucao":
      return (
        <svg {...props}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );
    case "insights":
      return (
        <svg {...props}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0012 2z" />
        </svg>
      );
    case "mais":
      return (
        <svg {...props}>
          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <ul className="mx-auto flex max-w-md px-2">
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-medium ${
                  active
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                <NavIcon name={tab.icon} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
