import Link from "next/link";

export function RegistroFab() {
  return (
    <Link
      href="/registro"
      aria-label="Registrar peso, hidratação, refeição ou nota"
      className="fixed bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
