"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Recommendation } from "@/domain/recommendations";

export function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDone() {
    setPending(true);
    await fetch(`/api/v1/recommendations/${recommendation.id}/done`, {
      method: "POST",
    });
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            Recomendação
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {recommendation.title}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{recommendation.body}</p>
        </div>
        <button
          type="button"
          onClick={handleDone}
          disabled={pending}
          className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {pending ? "..." : "Concluído"}
        </button>
      </div>
    </div>
  );
}
