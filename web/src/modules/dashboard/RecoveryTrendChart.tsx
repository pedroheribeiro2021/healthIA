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
import type { TimeSeries } from "@/domain/analytics";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

export function RecoveryTrendChart({ series }: { series: TimeSeries }) {
  const hasData = series.some((point) => point.value !== null);
  if (!hasData) {
    return (
      <p className="text-sm text-neutral-400">
        Ainda sem histórico de recovery score.
      </p>
    );
  }

  const data = series.map((point) => ({
    date: dateFormatter.format(new Date(`${point.day}T12:00:00-03:00`)),
    score: point.value,
  }));

  return (
    <div className="h-40 w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-800"
          />
          {/* Hex literal, não currentColor+dark: — o Recharts renderiza os
              ticks numa camada separada que não herda className. #737373
              (neutral-500) tem contraste suficiente nos dois temas. */}
          <XAxis dataKey="date" fontSize={12} tickMargin={8} tick={{ fill: "#737373" }} />
          <YAxis domain={[0, 100]} fontSize={12} width={30} tick={{ fill: "#737373" }} />
          <Tooltip formatter={(value) => [`${value}`, "Recovery"]} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="currentColor"
            className="text-neutral-900 dark:text-neutral-100"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
