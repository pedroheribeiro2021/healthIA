import { useState, type FormEvent } from 'react'
import { createManualWeight } from '../../api/client'

function nowForInput(): string {
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

type Props = {
  onSaved: () => void
}

export function WeightForm({ onSaved }: Props) {
  const [valueKg, setValueKg] = useState('')
  const [occurredAt, setOccurredAt] = useState(nowForInput)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedValue = Number(valueKg)
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setStatus('error')
      setErrorMessage('Informe um peso válido em kg.')
      return
    }

    setStatus('saving')
    try {
      await createManualWeight(parsedValue, new Date(occurredAt))
      setValueKg('')
      setOccurredAt(nowForInput())
      setStatus('idle')
      onSaved()
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao registrar peso.')
    }
  }

  return (
    <form className="weight-form" onSubmit={handleSubmit}>
      <label>
        Peso (kg)
        <input
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          value={valueKg}
          onChange={(e) => setValueKg(e.target.value)}
          required
        />
      </label>
      <label>
        Data/hora
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Salvando…' : 'Registrar'}
      </button>
      {status === 'error' && <p className="weight-form-error">{errorMessage}</p>}
    </form>
  )
}
