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
import type { TimeSeries, TrendResult } from "@/domain/analytics";
import {
  CHART_TICK_STYLE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from "@/modules/charts/chartTheme";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

const TREND_LABEL: Record<TrendResult["direction"], string> = {
  up: "subindo",
  down: "caindo",
  flat: "estável",
};

export function SleepDurationChart({
  series,
  trend,
}: {
  series: TimeSeries;
  trend: TrendResult;
}) {
  const hasData = series.some((point) => point.value !== null);
  if (!hasData) {
    return <p className="text-sm text-neutral-400">Ainda sem histórico de sono.</p>;
  }

  const data = series.map((point) => ({
    date: dateFormatter.format(new Date(`${point.day}T12:00:00-03:00`)),
    hours: point.value !== null ? point.value / 3600 : null,
  }));

  return (
    <div className="w-full max-w-md space-y-2">
      {!trend.insufficientData && (
        <p className="text-sm text-neutral-500">
          Tendência:{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {TREND_LABEL[trend.direction]}
          </span>
        </p>
      )}
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-neutral-200 dark:stroke-neutral-800"
            />
            <XAxis dataKey="date" fontSize={12} tickMargin={8} tick={CHART_TICK_STYLE} />
            <YAxis domain={[0, 10]} fontSize={12} width={30} tick={CHART_TICK_STYLE} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}h`, "Sono"]}
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="currentColor"
              className="text-neutral-900 dark:text-neutral-100"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
