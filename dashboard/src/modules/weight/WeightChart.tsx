import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { listEvents, type HealthEvent } from '../../api/client'

type Point = { date: string; value: number }

function toPoints(events: HealthEvent[]): Point[] {
  return events
    .filter((event) => event.value !== null)
    .map((event) => ({
      date: event.start_time,
      value: event.value as number,
    }))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]
  const value = point.value as number
  const date = (point.payload as Point).date
  return (
    <div className="weight-chart-tooltip">
      <strong>{value} kg</strong>
      <span>{formatDate(date)}</span>
    </div>
  )
}

export type WeightChartHandle = { refresh: () => void }

type Props = {
  refreshToken: number
}

export function WeightChart({ refreshToken }: Props) {
  const [points, setPoints] = useState<Point[] | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    listEvents('weight')
      .then((events) => {
        if (!cancelled) setPoints(toPoints(events))
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar peso.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  return (
    <div className="weight-chart">
      <style>{`
        .weight-chart {
          --surface-1: #fcfcfb;
          --text-secondary: #52514e;
          --muted: #898781;
          --grid: #e1e0d9;
          --series-1: #2a78d6;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .weight-chart {
            --surface-1: #1a1a19;
            --text-secondary: #c3c2b7;
            --muted: #898781;
            --grid: #2c2c2a;
            --series-1: #3987e5;
          }
        }
        :root[data-theme="dark"] .weight-chart {
          --surface-1: #1a1a19;
          --text-secondary: #c3c2b7;
          --muted: #898781;
          --grid: #2c2c2a;
          --series-1: #3987e5;
        }
        .weight-chart-tooltip {
          background: var(--surface-1);
          border: 1px solid var(--grid);
          border-radius: 6px;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 13px;
        }
        .weight-chart-tooltip strong {
          color: var(--text-secondary);
        }
        .weight-chart-tooltip span {
          color: var(--muted);
        }
      `}</style>
      {errorMessage && <p className="weight-form-error">{errorMessage}</p>}
      {points !== null && points.length === 0 && !errorMessage && (
        <p className="weight-chart-empty">Nenhum registro de peso ainda.</p>
      )}
      {points !== null && points.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--grid)' }}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ stroke: 'var(--grid)', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--series-1)', stroke: 'var(--surface-1)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: 'var(--series-1)', stroke: 'var(--surface-1)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
