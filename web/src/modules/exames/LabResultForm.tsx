"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/repositories/supabase/browserClient";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm font-medium";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Lançamento manual de resultado de exame (docs/ROADMAP.md Fase 5) — o
// arquivo original (se houver) sobe direto pro Storage a partir do browser
// (mesma sessão do usuário, RLS do bucket `exams` cuida da autorização);
// só o caminho resultante é enviado pra API.
export function LabResultForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  const [marker, setMarker] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceMin, setReferenceMin] = useState("");
  const [referenceMax, setReferenceMax] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [file, setFile] = useState<File | null>(null);

  function resetFields() {
    setMarker("");
    setValue("");
    setUnit("");
    setReferenceMin("");
    setReferenceMax("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      let examFilePath: string | undefined;
      if (file) {
        const supabase = createSupabaseBrowserClient();
        const path = `${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("exams")
          .upload(path, file);
        if (uploadError) throw uploadError;
        examFilePath = path;
      }

      const response = await fetch("/api/v1/imports/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredAt: `${occurredAt}T12:00:00-03:00`,
          marker: marker.trim().toLowerCase().replace(/\s+/g, "_"),
          value: Number(value),
          unit,
          ...(referenceMin ? { referenceMin: Number(referenceMin) } : {}),
          ...(referenceMax ? { referenceMax: Number(referenceMax) } : {}),
          ...(examFilePath ? { examFilePath } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao registrar");
      }

      resetFields();
      setFeedback({ kind: "success", message: "Registrado." });
      router.refresh();
    } catch {
      setFeedback({
        kind: "error",
        message: "Não foi possível registrar. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Novo resultado de exame
      </p>

      <div className="space-y-1">
        <label htmlFor="marker" className={labelClass}>
          Marcador
        </label>
        <input
          id="marker"
          type="text"
          placeholder="ex.: vitamin_d, glucose, ferritin"
          required
          maxLength={100}
          value={marker}
          onChange={(e) => setMarker(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="value" className={labelClass}>
            Valor
          </label>
          <input
            id="value"
            type="number"
            inputMode="decimal"
            step="any"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="unit" className={labelClass}>
            Unidade
          </label>
          <input
            id="unit"
            type="text"
            placeholder="ex.: ng/mL"
            required
            maxLength={30}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="referenceMin" className={labelClass}>
            Referência mín. (opcional)
          </label>
          <input
            id="referenceMin"
            type="number"
            inputMode="decimal"
            step="any"
            value={referenceMin}
            onChange={(e) => setReferenceMin(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="referenceMax" className={labelClass}>
            Referência máx. (opcional)
          </label>
          <input
            id="referenceMax"
            type="number"
            inputMode="decimal"
            step="any"
            value={referenceMax}
            onChange={(e) => setReferenceMax(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="occurredAt" className={labelClass}>
          Data do exame
        </label>
        <input
          id="occurredAt"
          type="date"
          required
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="file" className={labelClass}>
          Laudo (PDF/imagem, opcional)
        </label>
        <input
          id="file"
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs dark:file:bg-neutral-700`}
        />
      </div>

      {feedback && (
        <p
          className={`text-sm ${
            feedback.kind === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {submitting ? "Registrando..." : "Registrar"}
      </button>
    </form>
  );
}
