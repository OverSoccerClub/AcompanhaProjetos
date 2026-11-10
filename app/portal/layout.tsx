import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Só CLIENT entra aqui — `app/portal/page.tsx` chama `requireClient()`, que
// LANÇA para qualquer outro papel; filtrar aqui evita um STAFF cair numa
// exceção não tratada (500) em vez de um redirect limpo para a própria
// área dele. (Se um dia o staff precisar "ver como o cliente vê" para
// suporte, isso é uma decisão de produto nova — não implementada aqui.)
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  if (user.role !== "CLIENT") redirect("/admin");
  return <>{children}</>;
}
