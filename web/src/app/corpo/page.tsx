import { permanentRedirect } from "next/navigation";

// Rota movida para /evolucao/corpo (Fase 7 Etapa 2). Redirect permanente
// para não quebrar link salvo nem o PWA instalado.
export default function CorpoRedirect() {
  permanentRedirect("/evolucao/corpo");
}
