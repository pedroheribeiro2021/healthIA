"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm font-medium";

// Lançamento manual de bioimpedância clínica (docs/ROADMAP.md Fase 5) —
// sem pipeline de import automatizado, é o Pedro digitando o laudo depois
// da medição na clínica.
export function BodyCompositionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  const [kg, setKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [leanMassKg, setLeanMassKg] = useState("");
  const [waterPct, setWaterPct] = useState("");
  const [bmrKcal, setBmrKcal] = useState("");

  function resetFields() {
    setKg("");
    setBodyFatPct("");
    setLeanMassKg("");
    setWaterPct("");
    setBmrKcal("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const body = {
      occurredAt: new Date().toISOString(),
      kg: Number(kg),
      ...(bodyFatPct ? { bodyFatPct: Number(bodyFatPct) } : {}),
      ...(leanMassKg ? { leanMassKg: Number(leanMassKg) } : {}),
      ...(waterPct ? { waterPct: Number(waterPct) } : {}),
      ...(bmrKcal ? { bmrKcal: Number(bmrKcal) } : {}),
    };

    try {
      const response = await fetch("/api/v1/imports/bioimpedance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        Bioimpedância clínica
      </p>

      <div className="space-y-1">
        <label htmlFor="kg" className={labelClass}>
          Peso (kg)
        </label>
        <input
          id="kg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="400"
          required
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="bodyFatPct" className={labelClass}>
            Gordura (%)
          </label>
          <input
            id="bodyFatPct"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            value={bodyFatPct}
            onChange={(e) => setBodyFatPct(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="leanMassKg" className={labelClass}>
            Massa magra (kg)
          </label>
          <input
            id="leanMassKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="400"
            value={leanMassKg}
            onChange={(e) => setLeanMassKg(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="waterPct" className={labelClass}>
            Água (%)
          </label>
          <input
            id="waterPct"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            value={waterPct}
            onChange={(e) => setWaterPct(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bmrKcal" className={labelClass}>
            TMB (kcal)
          </label>
          <input
            id="bmrKcal"
            type="number"
            inputMode="numeric"
            min="0"
            max="10000"
            value={bmrKcal}
            onChange={(e) => setBmrKcal(e.target.value)}
            className={inputClass}
          />
        </div>
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
