"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MarkerPoint = {
  startTime: string;
  value: number;
  min: number | null;
  max: number | null;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

// Server Component (a página /exames) já agrupa os eventos brutos por
// marker e ordena por data — este componente só apresenta a evolução, sem
// calcular nada (a regra lab_out_of_range já roda no Insight Engine).
export function MarkerCard({
  marker,
  points,
}: {
  marker: string;
  points: MarkerPoint[];
}) {
  const latest = points[points.length - 1];
  const outOfRange =
    (latest.min !== null && latest.value < latest.min) ||
    (latest.max !== null && latest.value > latest.max);

  const data = points.map((p) => ({
    date: dateFormatter.format(new Date(p.startTime)),
    value: p.value,
  }));

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {marker.replaceAll("_", " ")}
        </p>
        {outOfRange && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            fora da faixa
          </span>
        )}
      </div>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {latest.value}
        {(latest.min !== null || latest.max !== null) && (
          <span className="ml-2 text-xs font-normal text-neutral-400">
            ref. {latest.min ?? "-∞"}–{latest.max ?? "∞"}
          </span>
        )}
      </p>
      {points.length > 1 && (
        <div className="mt-2 h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-neutral-200 dark:stroke-neutral-800"
              />
              <XAxis dataKey="date" fontSize={10} tickMargin={4} />
              <YAxis domain={["dataMin", "dataMax"]} fontSize={10} width={28} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#171717"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
