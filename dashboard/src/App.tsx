import { useState } from 'react'
import { WeightForm } from './modules/weight/WeightForm'
import { WeightChart } from './modules/weight/WeightChart'

function App() {
  const [refreshToken, setRefreshToken] = useState(0)

  return (
    <main>
      <h1>HealthAI</h1>
      <section className="module">
        <h2>Peso</h2>
        <WeightForm onSaved={() => setRefreshToken((t) => t + 1)} />
        <WeightChart refreshToken={refreshToken} />
      </section>
    </main>
  )
}

export default App
