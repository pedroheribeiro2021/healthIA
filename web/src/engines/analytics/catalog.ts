import type { EventType } from "@/domain/healthEvent";

export type MetricCatalogEntry = {
  id: string;
  description: string;
  // Tipos de health_events que o calculator lê diretamente. Métricas
  // compostas (que consomem outros metric_snapshots, não eventos brutos)
  // ficam com [].
  requiredEventTypes: readonly EventType[];
};

// Catálogo de metric_id (docs/ENGINES.md) — formato `dominio.metrica.janela`.
// Única fonte de nomes válidos; goals e dashboard devem referenciar por id
// daqui, nunca com string solta.
export const METRIC_CATALOG: readonly MetricCatalogEntry[] = [
  {
    id: "sleep.duration.daily",
    description: "Duração da sessão de sono do dia (s)",
    requiredEventTypes: ["sleep_session"],
  },
  {
    id: "sleep.duration.avg7d",
    description: "Duração média de sono, últimos 7 dias",
    requiredEventTypes: ["sleep_session"],
  },
  {
    id: "sleep.duration.avg30d",
    description: "Duração média de sono, últimos 30 dias",
    requiredEventTypes: ["sleep_session"],
  },
  {
    id: "sleep.efficiency.daily",
    description: "Eficiência do sono do dia (tempo dormindo ÷ tempo na cama)",
    requiredEventTypes: ["sleep_session"],
  },
  {
    id: "sleep.bedtime.avg7d",
    description: "Horário médio de dormir, últimos 7 dias",
    requiredEventTypes: ["sleep_session"],
  },
  {
    id: "hr.resting.daily",
    description:
      "FC de repouso do dia (mínimo de FC contínua na janela do sono, v1)",
    requiredEventTypes: ["heart_rate", "sleep_session"],
  },
  {
    id: "hr.resting.avg7d",
    description: "FC de repouso média, últimos 7 dias",
    requiredEventTypes: ["heart_rate", "sleep_session"],
  },
  {
    id: "hr.resting.baseline60d",
    description:
      "FC de repouso baseline, últimos 60 dias (usada pelo Recovery Score)",
    requiredEventTypes: ["heart_rate", "sleep_session"],
  },
  {
    id: "hrv.rmssd.daily",
    description: "HRV (RMSSD) do dia",
    requiredEventTypes: ["hrv"],
  },
  {
    id: "hrv.rmssd.avg7d",
    description: "HRV (RMSSD) média, últimos 7 dias",
    requiredEventTypes: ["hrv"],
  },
  {
    id: "hrv.rmssd.baseline60d",
    description: "HRV (RMSSD) baseline, últimos 60 dias",
    requiredEventTypes: ["hrv"],
  },
  {
    id: "training.load.daily",
    description: "Carga de treino do dia (TRIMP simplificado, v1)",
    requiredEventTypes: ["workout", "heart_rate"],
  },
  {
    id: "training.load.acwr",
    description: "ACWR — carga aguda (7d) ÷ carga crônica (28d ÷ 4)",
    requiredEventTypes: [],
  },
  {
    id: "body.weight.daily",
    description: "Peso do dia (kg)",
    requiredEventTypes: ["weight"],
  },
  {
    id: "body.weight.avg7d",
    description: "Peso médio, últimos 7 dias",
    requiredEventTypes: ["weight"],
  },
  {
    id: "body.fatpct.daily",
    description:
      "Percentual de gordura do dia (média entre relógio e bioimpedância clínica, quando houver mais de um registro)",
    requiredEventTypes: ["body_composition"],
  },
  {
    id: "body.leanmass.daily",
    description: "Massa magra do dia, kg (só bioimpedância clínica reporta)",
    requiredEventTypes: ["body_composition"],
  },
  {
    id: "recovery.score.daily",
    description: "Score composto de recuperação (0-100, v1)",
    requiredEventTypes: [],
  },
] as const;

export type MetricId = (typeof METRIC_CATALOG)[number]["id"];

const METRIC_IDS = new Set<string>(METRIC_CATALOG.map((entry) => entry.id));

export function isValidMetricId(id: string): id is MetricId {
  return METRIC_IDS.has(id);
}

export function getMetricCatalogEntry(
  id: string,
): MetricCatalogEntry | undefined {
  return METRIC_CATALOG.find((entry) => entry.id === id);
}
