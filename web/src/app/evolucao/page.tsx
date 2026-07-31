import { redirect } from "next/navigation";

// /evolucao é um hub sem conteúdo próprio — a sub-nav (EvolucaoSubNav, no
// layout) já mostra as 4 seções; a landing pousa na primeira.
export default function EvolucaoPage() {
  redirect("/evolucao/corpo");
}
