import type { MarkerPoint } from "@/modules/exames/MarkerCard";
import { LabResultForm } from "@/modules/exames/LabResultForm";
import { MarkerCard } from "@/modules/exames/MarkerCard";
import { createSupabaseEventRepository } from "@/repositories/eventRepository";

type LabResultDetail = {
  marker?: unknown;
  referenceRange?: { min?: unknown; max?: unknown };
};

export default async function ExamesPage() {
  const eventRepo = await createSupabaseEventRepository();
  const labEvents = await eventRepo.listHealthEvents({ eventType: "lab_result" });

  const byMarker = new Map<string, MarkerPoint[]>();
  for (const event of labEvents) {
    const detail = event.detail as LabResultDetail | null;
    const marker = typeof detail?.marker === "string" ? detail.marker : null;
    if (marker === null || event.value === null) continue;

    const min = typeof detail?.referenceRange?.min === "number" ? detail.referenceRange.min : null;
    const max = typeof detail?.referenceRange?.max === "number" ? detail.referenceRange.max : null;
    const points = byMarker.get(marker) ?? [];
    points.push({ startTime: event.startTime, value: event.value, min, max });
    byMarker.set(marker, points);
  }

  const markers = Array.from(byMarker.entries())
    .map(([marker, points]) => [
      marker,
      [...points].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    ] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Exames
      </h1>

      {markers.length === 0 ? (
        <p className="w-full max-w-md text-sm text-neutral-400">
          Nenhum exame registrado ainda.
        </p>
      ) : (
        <div className="flex w-full max-w-md flex-col gap-3">
          {markers.map(([marker, points]) => (
            <MarkerCard key={marker} marker={marker} points={points} />
          ))}
        </div>
      )}

      <LabResultForm />
    </main>
  );
}
