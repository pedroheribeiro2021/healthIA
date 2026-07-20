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

export type WeightPoint = {
  startTime: string;
  value: number;
};

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

export function WeightChart({ events }: { events: WeightPoint[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Nenhum peso registrado ainda.
      </p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
  );
  const data = sorted.map((point) => ({
    date: dateFormatter.format(new Date(point.startTime)),
    fullDate: dateTimeFormatter.format(new Date(point.startTime)),
    kg: point.value,
  }));
  const latest = sorted[sorted.length - 1];

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
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="date" fontSize={12} tickMargin={8} />
            <YAxis
              domain={["dataMin - 1", "dataMax + 1"]}
              fontSize={12}
              width={40}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)} kg`, "Peso"]}
              labelFormatter={(_label, payload) => payload[0]?.payload.fullDate}
            />
            <Line
              type="monotone"
              dataKey="kg"
              stroke="#171717"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
