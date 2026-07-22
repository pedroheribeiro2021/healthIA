"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BodyFatPoint = { startTime: string; bodyFatPercentage: number };

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

function dayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}

// Server Component (a página /corpo) já separa os eventos brutos por
// `detail.origin` — este componente só desenha as duas séries lado a lado,
// nenhum cálculo de indicador acontece aqui.
export function WatchVsScaleChart({
  watch,
  clinical,
}: {
  watch: BodyFatPoint[];
  clinical: BodyFatPoint[];
}) {
  if (watch.length === 0 && clinical.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Ainda sem medição de percentual de gordura (relógio ou bioimpedância).
      </p>
    );
  }

  const byDay = new Map<
    string,
    { key: string; date: string; watch?: number; clinical?: number }
  >();
  for (const point of watch) {
    const key = dayKey(point.startTime);
    byDay.set(key, {
      ...byDay.get(key),
      key,
      date: dateFormatter.format(new Date(point.startTime)),
      watch: point.bodyFatPercentage,
    });
  }
  for (const point of clinical) {
    const key = dayKey(point.startTime);
    byDay.set(key, {
      ...byDay.get(key),
      key,
      date: dateFormatter.format(new Date(point.startTime)),
      clinical: point.bodyFatPercentage,
    });
  }
  const data = Array.from(byDay.values()).sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <XAxis dataKey="date" fontSize={12} tickMargin={8} />
          <YAxis domain={["dataMin - 2", "dataMax + 2"]} fontSize={12} width={30} />
          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, ""]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="watch"
            name="Relógio"
            stroke="#a3a3a3"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="clinical"
            name="Bioimpedância clínica"
            stroke="#171717"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
