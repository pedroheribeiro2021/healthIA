import { permanentRedirect } from "next/navigation";

// Rota movida para /evolucao/relatorios (Fase 7 Etapa 2). Preserva
// ?type=weekly|monthly de link salvo. Redirect permanente.
export default async function RelatoriosRedirect({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  permanentRedirect(type ? `/evolucao/relatorios?type=${type}` : "/evolucao/relatorios");
}
