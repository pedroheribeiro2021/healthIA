# Pendências — HealthIA

## Agora (Fase 1 — Ingestão manual + fonte da verdade)
- [ ] `POST /api/v1/events/manual` (peso, hidratação, refeição simples, nota)
- [ ] Pipeline completa: raw_records → Normalization Engine → health_events (dedup e reprocesso)
- [ ] Dashboard mínimo: formulário de registro manual + lista/gráfico de peso

## Depois
- [ ] Fase 2 — sync automático via Health Connect (ver docs/ROADMAP.md)

## Decisões pendentes
- [ ] Modelo do Ollama a usar por padrão (llama3.1 8B é a hipótese; validar na Fase 6)
- [ ] Exportação da lista de compras para Google Keep: texto copiável na Fase 5; API fica pro backlog
