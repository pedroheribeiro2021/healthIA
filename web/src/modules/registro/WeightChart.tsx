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
import {
  CHART_TICK_STYLE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from "@/modules/charts/chartTheme";

export type WeightPoint = {
  startTime: string;
  value: number;
};

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

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function dayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}

export function WeightChart({
  events,
  bioimpedanceEvents = [],
}: {
  events: WeightPoint[];
  bioimpedanceEvents?: WeightPoint[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Nenhum peso registrado ainda.
      </p>
    );
  }

  const byDay = new Map<
    string,
    { key: string; date: string; fullDate: string; kg?: number; bioimpedanceKg?: number }
  >();
  for (const point of events) {
    const key = dayKey(point.startTime);
    byDay.set(key, {
      ...byDay.get(key),
      key,
      date: dateFormatter.format(new Date(point.startTime)),
      fullDate: dateTimeFormatter.format(new Date(point.startTime)),
      kg: point.value,
    });
  }
  for (const point of bioimpedanceEvents) {
    const key = dayKey(point.startTime);
    byDay.set(key, {
      ...byDay.get(key),
      key,
      date: dateFormatter.format(new Date(point.startTime)),
      fullDate: dateTimeFormatter.format(new Date(point.startTime)),
      bioimpedanceKg: point.value,
    });
  }
  const data = Array.from(byDay.values()).sort((a, b) => a.key.localeCompare(b.key));
  const latest = [...events].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
  )[events.length - 1];

  return (
    <div className="w-full max-w-sm space-y-2">
      <p className="text-sm text-neutral-500">
        Peso atual:{" "}
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {latest.value.toFixed(1)} kg
        </span>
      </p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="date" fontSize={12} tickMargin={8} tick={CHART_TICK_STYLE} />
            <YAxis
              domain={["dataMin - 1", "dataMax + 1"]}
              fontSize={12}
              width={40}
              tick={CHART_TICK_STYLE}
            />
            <Tooltip
              formatter={(value, name) => [`${Number(value).toFixed(1)} kg`, name]}
              labelFormatter={(_label, payload) => payload[0]?.payload.fullDate}
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            {bioimpedanceEvents.length > 0 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Line
              type="monotone"
              dataKey="kg"
              name="Peso"
              stroke="currentColor"
              className="text-neutral-900 dark:text-neutral-100"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            {bioimpedanceEvents.length > 0 && (
              <Line
                type="monotone"
                dataKey="bioimpedanceKg"
                name="Bioimpedância"
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
