import { permanentRedirect } from "next/navigation";

// Rota movida para /evolucao/sono (Fase 7 Etapa 2). Redirect permanente
// para não quebrar link salvo nem o PWA instalado.
export default function SonoRedirect() {
  permanentRedirect("/evolucao/sono");
}
