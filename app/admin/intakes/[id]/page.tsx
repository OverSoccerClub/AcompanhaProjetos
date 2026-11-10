import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { getIntake } from "@/app/actions/intake-admin";
import type { ValidatedIntakePayload } from "@/lib/intake-validation";
import { AdminShell } from "../../_components/AdminShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { formatDateTime } from "@/app/_components/format";
import { INTAKE_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";
import { ConvertIntakeForm } from "./ConvertIntakeForm";
import { IntakeStatus } from "@/lib/generated/prisma/enums";

export const metadata: Metadata = { title: "Intake — Admin — Innovare Acompanhe" };

function briefingValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function briefingLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export default async function AdminIntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const intake = await getIntake(id);
  if (!intake) notFound();

  const payload = intake.payload as unknown as ValidatedIntakePayload;
  const meta = metaOrFallback(INTAKE_STATUS_META, intake.status);
  const briefingEntries = Object.entries(payload.briefing ?? {});

  return (
    <AdminShell active="intakes" staffName={staff.name}>
      <div className="breadcrumb">
        <Link href="/admin">← Voltar para a fila de intakes</Link>
      </div>

      <div className="page-title-row">
        <div>
          <h1>{intake.protocol}</h1>
          <p className="section-hint">Recebido em {formatDateTime(intake.createdAt)}</p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      <div className="detail-grid">
        <div className="stack" style={{ gap: 20 }}>
          <section className="card card-pad" aria-labelledby="empresa-heading">
            <h2 id="empresa-heading" className="section-title">
              Empresa
            </h2>
            <dl className="kv-grid" style={{ marginTop: 12 }}>
              <div>
                <dt>Marca</dt>
                <dd>{payload.company.marca}</dd>
              </div>
              <div>
                <dt>Segmento</dt>
                <dd>{payload.company.segmento}</dd>
              </div>
              {payload.company.cidade_uf && (
                <div>
                  <dt>Cidade/UF</dt>
                  <dd>{payload.company.cidade_uf}</dd>
                </div>
              )}
              {payload.company.site_atual && (
                <div>
                  <dt>Site atual</dt>
                  <dd>{payload.company.site_atual}</dd>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>Descrição</dt>
                <dd>{payload.company.descricao_da_empresa}</dd>
              </div>
            </dl>
          </section>

          <section className="card card-pad" aria-labelledby="contato-heading">
            <h2 id="contato-heading" className="section-title">
              Contato
            </h2>
            <dl className="kv-grid" style={{ marginTop: 12 }}>
              <div>
                <dt>Nome</dt>
                <dd>{payload.contact.nome}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{payload.contact.email}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>{payload.contact.whatsapp}</dd>
              </div>
              {payload.contact.cargo && (
                <div>
                  <dt>Cargo</dt>
                  <dd>{payload.contact.cargo}</dd>
                </div>
              )}
            </dl>
          </section>

          {briefingEntries.length > 0 && (
            <section className="card card-pad" aria-labelledby="briefing-heading">
              <h2 id="briefing-heading" className="section-title">
                Briefing
              </h2>
              <dl className="kv-grid" style={{ marginTop: 12 }}>
                {briefingEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt>{briefingLabel(key)}</dt>
                    <dd>{briefingValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="card card-pad">
          {intake.status === IntakeStatus.CONVERTIDO ? (
            <>
              <h2 className="section-title">Já convertido</h2>
              <p className="section-hint" style={{ marginBottom: 14 }}>
                Este intake já gerou um projeto.
              </p>
              {intake.project && (
                <Link href={`/admin/projetos/${intake.project.id}`} className="btn btn-primary btn-block">
                  Ver projeto {intake.project.code}
                </Link>
              )}
            </>
          ) : (
            <>
              <h2 className="section-title">Converter em projeto</h2>
              <p className="section-hint" style={{ marginBottom: 14 }}>
                Cria o projeto, semeia as etapas padrão e convida o contato para o portal.
              </p>
              <ConvertIntakeForm
                intakeId={intake.id}
                defaultTitle={`${payload.company.marca} — Site`}
                defaultContactName={payload.contact.nome}
                defaultContactEmail={payload.contact.email}
              />
            </>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
