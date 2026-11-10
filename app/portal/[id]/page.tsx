import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/session";
import { getPortalProject } from "@/lib/portal-data";
import { PortalShell } from "../_components/PortalShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { PhaseTimeline } from "@/app/_components/PhaseTimeline";
import { UpdatesList } from "@/app/_components/UpdatesList";
import { formatDate } from "@/app/_components/format";
import { PROJECT_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";

export const metadata: Metadata = { title: "Projeto — Innovare Acompanhe" };

// `getPortalProject(clientId, projectId)` já filtra pelo cliente da sessão
// E por `visibility = CLIENTE` nas updates (estrutural, dentro do WHERE —
// ver lib/portal-data.ts). Não existe aqui nenhum `if` extra de segurança
// porque a consulta não devolve nada para checar: projeto de outro cliente
// ou update interna simplesmente não vêm no resultado.
export default async function PortalProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await requireClient();
  const { id } = await params;
  const project = await getPortalProject(client.clientId, id);
  if (!project) notFound();

  const meta = metaOrFallback(PROJECT_STATUS_META, project.status);

  return (
    <PortalShell clientName={client.name}>
      <div className="breadcrumb">
        <Link href="/portal">← Voltar para seus projetos</Link>
      </div>

      <div className="page-title-row">
        <div>
          <h1>
            {project.code} — {project.title}
          </h1>
          <p className="section-hint">
            {project.expectedStartAt && <>Início previsto em {formatDate(project.expectedStartAt)} · </>}
            {project.expectedEndAt && <>Entrega prevista em {formatDate(project.expectedEndAt)}</>}
          </p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      <div className="detail-grid">
        <section className="card card-pad" aria-labelledby="etapas-heading">
          <h2 id="etapas-heading" className="section-title">
            Fases do projeto
          </h2>
          <p className="section-hint" style={{ marginBottom: 14 }}>
            Descoberta → Planejamento &amp; Design → Desenvolvimento → Entrega &amp; Suporte.
          </p>
          <PhaseTimeline stages={project.stages} />
        </section>

        <section className="card card-pad" aria-labelledby="atualizacoes-heading">
          <h2 id="atualizacoes-heading" className="section-title">
            Atualizações
          </h2>
          <p className="section-hint" style={{ marginBottom: 14 }}>
            O que a equipe InnovareCode compartilhou sobre o seu projeto.
          </p>
          <UpdatesList updates={project.updates} />
        </section>
      </div>
    </PortalShell>
  );
}
