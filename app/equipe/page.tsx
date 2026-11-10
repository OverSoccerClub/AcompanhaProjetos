import type { Metadata } from "next";
import { AuthShell } from "@/app/_components/AuthShell";
import { LoginForm } from "./LoginForm";

// GET /equipe — login da EQUIPE InnovareCode (e-mail + senha). Rota
// separada de /entrar (cliente, link mágico) para que cada público veja só
// o caminho que importa pra ele — ver app/entrar/page.tsx para o contrato
// do lado do cliente. `POST /api/auth/login` (LoginForm) redireciona para
// /admin no sucesso; papel errado é tratado por app/admin/layout.tsx.
export const metadata: Metadata = { title: "Entrar — Equipe — Innovare Acompanhe" };

export default function EquipePage() {
  return (
    <AuthShell
      brandEyebrow="Innovare Acompanhe"
      brandHeading="Painel interno — Equipe InnovareCode"
      brandSub="Acompanhe briefings recebidos, atualize o status dos projetos e mantenha os clientes informados a cada etapa."
      header={
        <>
          <h1>Entrar</h1>
          <p className="lead">Use seu e-mail e senha de equipe para acessar o painel.</p>
        </>
      }
      secureNote="Acesso restrito à equipe InnovareCode. Esqueceu a senha ou não tem conta? Fale com quem administra o sistema."
    >
      <LoginForm />
      <p className="auth-switch">
        É cliente? <a href="/entrar">Acesse seu portal</a>
      </p>
    </AuthShell>
  );
}
