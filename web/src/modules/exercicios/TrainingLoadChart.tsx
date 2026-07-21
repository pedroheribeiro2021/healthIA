"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeries } from "@/domain/analytics";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

export function TrainingLoadChart({
  loadSeries,
  acwrSeries,
}: {
  loadSeries: TimeSeries;
  acwrSeries: TimeSeries;
}) {
  const hasData =
    loadSeries.some((p) => p.value !== null && p.value > 0) ||
    acwrSeries.some((p) => p.value !== null);
  if (!hasData) {
    return (
      <p className="text-sm text-neutral-400">
        Ainda sem histórico de treinos suficiente.
      </p>
    );
  }

  const acwrByDay = new Map(acwrSeries.map((p) => [p.day, p.value]));
  const data = loadSeries.map((p) => ({
    date: dateFormatter.format(new Date(`${p.day}T12:00:00-03:00`)),
    load: p.value,
    acwr: acwrByDay.get(p.day) ?? null,
  }));

  return (
    <div className="h-48 w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-800"
          />
          <XAxis dataKey="date" fontSize={12} tickMargin={8} />
          <YAxis yAxisId="load" fontSize={12} width={30} />
          <YAxis
            yAxisId="acwr"
            orientation="right"
            domain={[0, 2]}
            fontSize={12}
            width={30}
          />
          <Tooltip />
          <Bar yAxisId="load" dataKey="load" fill="#a3a3a3" radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="acwr"
            type="monotone"
            dataKey="acwr"
            stroke="#171717"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
