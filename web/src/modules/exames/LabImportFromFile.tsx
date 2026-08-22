"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExtractedLabMarker } from "@/domain/labResult";
import { createSupabaseBrowserClient } from "@/repositories/supabase/browserClient";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";

type MarkerRow = ExtractedLabMarker & { include: boolean };

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Reduz a foto/scan antes de mandar pra IA (payload menor, chamada mais
// rápida) — o arquivo original, sem redimensionar, é o que sobe pro
// Storage como anexo do exame.
async function resizeToJpegBase64(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1] ?? "";
}

// Import assistido por IA (ADR-006): a IA só lê o que já está impresso no
// laudo, nunca calcula nada — o Pedro confere/edita cada linha antes de
// qualquer marcador virar um lab_result de verdade. Continua existindo o
// formulário manual (LabResultForm) como caminho principal pra PDF ou
// quando a extração falhar/não estiver configurada.
export function LabImportFromFile() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<MarkerRow[] | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  function reset() {
    setFile(null);
    setRows(null);
    setError(null);
    setSuccessCount(null);
  }

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setError(null);
    setSuccessCount(null);
    try {
      const base64 = await resizeToJpegBase64(file);
      const response = await fetch("/api/v1/ai/extract-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "falha ao ler o laudo");
      }
      const markers = data.markers as ExtractedLabMarker[];
      if (markers.length === 0) {
        setError("Não consegui achar nenhum marcador legível nessa imagem. Tente uma foto mais nítida ou registre na mão abaixo.");
        return;
      }
      setRows(markers.map((m) => ({ ...m, include: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao ler o laudo");
    } finally {
      setExtracting(false);
    }
  }

  function updateRow(index: number, patch: Partial<MarkerRow>) {
    setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, ...patch } : r)) ?? null);
  }

  async function handleImport() {
    if (!rows || !file) return;
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) return;

    setImporting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const path = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("exams").upload(path, file);
      if (uploadError) throw uploadError;

      let ok = 0;
      for (const row of selected) {
        if (!row.unit) continue;
        const response = await fetch("/api/v1/imports/lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurredAt: `${occurredAt}T12:00:00-03:00`,
            marker: row.marker.trim().toLowerCase().replace(/\s+/g, "_"),
            value: row.value,
            unit: row.unit,
            ...(row.referenceMin !== null ? { referenceMin: row.referenceMin } : {}),
            ...(row.referenceMax !== null ? { referenceMax: row.referenceMax } : {}),
            examFilePath: path,
          }),
        });
        if (response.ok) ok += 1;
      }
      setSuccessCount(ok);
      setRows(null);
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao importar");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Importar laudo com foto (IA lê os valores)
      </p>

      {!rows && (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setSuccessCount(null);
            }}
            className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs dark:file:bg-neutral-700`}
          />
          <button
            type="button"
            disabled={!file || extracting}
            onClick={handleExtract}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {extracting ? "Lendo laudo..." : "Ler laudo com IA"}
          </button>
          <p className="text-xs text-neutral-400">
            Foto ou print do laudo (não PDF). Você confere e edita cada valor antes de salvar — nada é
            gravado automaticamente.
          </p>
        </>
      )}

      {rows && (
        <>
          <div className="space-y-1">
            <label htmlFor="import-occurredAt" className="text-sm font-medium">
              Data do exame
            </label>
            <input
              id="import-occurredAt"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className={inputClass}
            />
          </div>

          <ul className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <li key={i} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(i, { include: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <input
                    type="text"
                    value={row.marker}
                    onChange={(e) => updateRow(i, { marker: e.target.value })}
                    className={`${inputClass} flex-1`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: Number(e.target.value) })}
                    placeholder="Valor"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={row.unit ?? ""}
                    onChange={(e) => updateRow(i, { unit: e.target.value || null })}
                    placeholder="Unidade (ex.: ng/mL)"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={row.referenceMin ?? ""}
                    onChange={(e) =>
                      updateRow(i, { referenceMin: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    placeholder="Ref. mín."
                    className={inputClass}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={row.referenceMax ?? ""}
                    onChange={(e) =>
                      updateRow(i, { referenceMax: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    placeholder="Ref. máx."
                    className={inputClass}
                  />
                </div>
                {row.include && !row.unit && (
                  <p className="mt-1 text-xs text-red-600">Falta a unidade — preencha pra importar.</p>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={importing || !rows.some((r) => r.include && r.unit)}
              onClick={handleImport}
              className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {importing
                ? "Importando..."
                : `Importar ${rows.filter((r) => r.include).length} marcador${rows.filter((r) => r.include).length === 1 ? "" : "es"}`}
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={reset}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successCount !== null && (
        <p className="text-sm text-emerald-600">{successCount} marcador(es) importado(s).</p>
      )}
    </div>
  );
}
