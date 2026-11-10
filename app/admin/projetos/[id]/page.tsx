import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { getProjectForAdmin } from "@/app/actions/project-admin";
import { AdminShell } from "../../_components/AdminShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { PhaseTimeline } from "@/app/_components/PhaseTimeline";
import { UpdatesList } from "@/app/_components/UpdatesList";
import { LiveRefresh } from "@/app/_components/LiveRefresh";
import { formatDate } from "@/app/_components/format";
import { PROJECT_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";
import { ProjectStatusForm } from "./ProjectStatusForm";
import { StageControl } from "./StageControl";
import { AddUpdateForm } from "./AddUpdateForm";
import { InviteClientForm } from "./InviteClientForm";

export const metadata: Metadata = { title: "Projeto — Admin — Innovare Acompanhe" };

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const project = await getProjectForAdmin(id);
  if (!project) notFound();

  const meta = metaOrFallback(PROJECT_STATUS_META, project.status);

  return (
    <AdminShell active="projetos" staffName={staff.name}>
      <div className="breadcrumb">
        <Link href="/admin/projetos">← Voltar para projetos</Link>
      </div>

      <div className="page-title-row">
        <div>
          <h1>
            {project.code} — {project.title}
          </h1>
          <p className="section-hint">
            {project.client.name} · criado em {formatDate(project.createdAt)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LiveRefresh />
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack" style={{ gap: 20 }}>
          <section className="card card-pad" aria-labelledby="etapas-heading">
            <h2 id="etapas-heading" className="section-title">
              Fases e etapas
            </h2>
            <div style={{ marginTop: 12 }}>
              <PhaseTimeline
                stages={project.stages}
                variant="admin"
                renderControls={(stage) => <StageControl stageId={stage.id} currentStatus={stage.status} />}
              />
            </div>
          </section>

          <section className="card card-pad" aria-labelledby="atualizacoes-heading">
            <h2 id="atualizacoes-heading" className="section-title">
              Linha do tempo
            </h2>
            <p className="section-hint" style={{ marginBottom: 14 }}>
              Atualizações internas e visíveis ao cliente, mais recentes primeiro.
            </p>
            <UpdatesList updates={project.updates} showVisibility />
          </section>
        </div>

        <div className="stack" style={{ gap: 20 }}>
          <section className="card card-pad" aria-labelledby="status-heading">
            <h2 id="status-heading" className="section-title">
              Status do projeto
            </h2>
            <div style={{ marginTop: 12 }}>
              <ProjectStatusForm projectId={project.id} currentStatus={project.status} />
            </div>
          </section>

          <section className="card card-pad" aria-labelledby="nova-atualizacao-heading">
            <h2 id="nova-atualizacao-heading" className="section-title">
              Nova atualização
            </h2>
            <div style={{ marginTop: 12 }}>
              <AddUpdateForm
                projectId={project.id}
                stages={project.stages.map((s) => ({ id: s.id, name: s.name }))}
              />
            </div>
          </section>

          <section className="card card-pad" aria-labelledby="cliente-heading">
            <h2 id="cliente-heading" className="section-title">
              Cliente
            </h2>
            <dl className="kv-grid" style={{ marginTop: 12, marginBottom: 16 }}>
              <div>
                <dt>Empresa</dt>
                <dd>{project.client.name}</dd>
              </div>
              {project.client.segment && (
                <div>
                  <dt>Segmento</dt>
                  <dd>{project.client.segment}</dd>
                </div>
              )}
            </dl>
            <h3 className="section-title" style={{ fontSize: "0.9rem" }}>
              Convidar acesso ao portal
            </h3>
            <div style={{ marginTop: 10 }}>
              <InviteClientForm clientId={project.client.id} />
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
