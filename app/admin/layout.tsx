import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Camada que VALE (seção 5.4, ponto 2): o proxy só checou "existe cookie"
// (lib/session.ts#getSessionUser revalida contra o banco e o PAPEL). Um
// CLIENT com cookie válido que tente abrir /admin cai no redirect abaixo —
// nunca vê o layout nem qualquer dado.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  // Logado, mas papel errado: manda para a própria área dele (UX melhor
  // que devolver erro) em vez de deixar `requireStaff()` da página lançar
  // uma exceção não tratada.
  if (user.role !== "STAFF") redirect("/portal");
  return <>{children}</>;
}
