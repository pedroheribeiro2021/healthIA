import Link from "next/link";

const SECTIONS = [
  { href: "/sono", label: "Sono", hint: "Duração e comparativo semanal" },
  { href: "/exercicios", label: "Exercícios", hint: "Carga de treino e ACWR" },
  { href: "/corpo", label: "Corpo", hint: "Peso, gordura corporal e bioimpedância" },
  { href: "/exames", label: "Exames", hint: "Histórico de marcadores laboratoriais" },
  { href: "/nutricao", label: "Nutrição", hint: "Receitas, macros e lista de compras" },
] as const;

export default function MaisPage() {
  return (
    <main className="flex flex-1 flex-col bg-neutral-50 pb-20 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Mais
        </h1>
      </header>
      <ul className="flex flex-col gap-3 px-6 py-8">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {section.label}
              </span>
              <span className="mt-0.5 text-xs text-neutral-400">
                {section.hint}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
