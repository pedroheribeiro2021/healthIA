const API_BASE = '/api/v1'

export type HealthEvent = {
  id: number
  event_type: string
  start_time: string
  end_time: string | null
  value: number | null
  unit: string | null
  detail: Record<string, unknown> | null
  source: string
}

type ManualEventResponse = {
  raw_record_id: number
  duplicate: boolean
  event: HealthEvent | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`Requisição falhou (${response.status}): ${path}`)
  }
  return response.json() as Promise<T>
}

export function createManualWeight(
  valueKg: number,
  occurredAt: Date,
): Promise<ManualEventResponse> {
  return request<ManualEventResponse>('/events/manual', {
    method: 'POST',
    body: JSON.stringify({
      record_type: 'weight',
      value_kg: valueKg,
      occurred_at: occurredAt.toISOString(),
    }),
  })
}

export function listEvents(eventType: string): Promise<HealthEvent[]> {
  return request<HealthEvent[]>(`/events?event_type=${encodeURIComponent(eventType)}`)
}
