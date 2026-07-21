import Link from "next/link";

// "Alertas no dashboard" (docs/ROADMAP.md Fase 4) — resumo de 1 linha na
// home, sem duplicar o conteúdo da tela /insights.
export function AlertBanner({ openCount }: { openCount: number }) {
  if (openCount === 0) return null;

  return (
    <Link
      href="/insights"
      className="flex w-full max-w-md items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
    >
      <span>
        {openCount} {openCount === 1 ? "recomendação aberta" : "recomendações abertas"}
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
