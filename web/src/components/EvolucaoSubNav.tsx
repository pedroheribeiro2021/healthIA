"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/evolucao/corpo", label: "Corpo" },
  { href: "/evolucao/sono", label: "Sono" },
  { href: "/evolucao/exercicios", label: "Exercícios" },
  { href: "/evolucao/relatorios", label: "Relatórios" },
] as const;

export function EvolucaoSubNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full max-w-md overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
      <ul className="flex gap-1 px-6">
        {SECTIONS.map((section) => {
          const active = pathname.startsWith(section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                    : "border-transparent text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
