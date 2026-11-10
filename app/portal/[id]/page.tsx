import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/session";
import { getPortalProject, getClientName } from "@/lib/portal-data";
import { PortalShell } from "../_components/PortalShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { PhaseTimeline, projectProgress } from "@/app/_components/PhaseTimeline";
import { ProjectSummary } from "@/app/_components/ProjectSummary";
import { ApprovalCallout } from "@/app/_components/ApprovalCallout";
import { UpdatesList } from "@/app/_components/UpdatesList";
import { formatDateTime } from "@/app/_components/format";
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
  const [project, companyName] = await Promise.all([getPortalProject(client.clientId, id), getClientName(client.clientId)]);
  if (!project) notFound();

  const meta = metaOrFallback(PROJECT_STATUS_META, project.status);
  const progress = projectProgress(project.stages);

  return (
    <PortalShell clientName={client.name} companyName={companyName}>
      <nav className="crumb" aria-label="Trilha">
        <Link href="/portal">Meus projetos</Link>
        <span>/</span>
        <span>{project.code}</span>
      </nav>

      <div className="title-row">
        <div>
          <h1>{project.title}</h1>
          <div className="title-meta">
            <span className="chip">{project.code}</span>
            <span>Atualizado em {formatDateTime(project.updatedAt)}</span>
          </div>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      <ProjectSummary
        progressPct={progress.progressPct}
        doneStages={progress.doneStages}
        totalStages={progress.totalStages}
        currentPhaseLabel={progress.currentPhaseLabel}
        currentPhaseIndex={progress.currentPhaseIndex}
        totalPhases={progress.totalPhases}
        nextMilestoneLabel={progress.nextMilestoneLabel}
        expectedStartAt={project.expectedStartAt}
        expectedEndAt={project.expectedEndAt}
      />

      {progress.pendingApproval && (
        <ApprovalCallout
          stageName={progress.pendingApproval.name}
          inProgress={progress.pendingApproval.status === "EM_ANDAMENTO"}
          anchorHref="#etapas-heading"
        />
      )}

      <div className="detail">
        <section className="card card-pad" aria-labelledby="etapas-heading">
          <h2 id="etapas-heading" className="section-title">
            Etapas
          </h2>
          <p className="section-hint" style={{ marginBottom: 14 }}>
            Descoberta → Planejamento &amp; Design → Desenvolvimento → Entrega &amp; Suporte.
          </p>
          <PhaseTimeline stages={project.stages} variant="portal" />
        </section>

        <section className="card card-pad" aria-labelledby="atualizacoes-heading">
          <h2 id="atualizacoes-heading" className="section-title" style={{ marginBottom: 14 }}>
            Atualizações
          </h2>
          <UpdatesList updates={project.updates} />
        </section>
      </div>
    </PortalShell>
  );
}
