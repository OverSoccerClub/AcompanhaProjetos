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

// Rótulos amigáveis para as chaves de `payload.briefing` — espelham os
// `name` dos campos em js/solicitar-site.js (site). Chave desconhecida
// (ex.: campo novo que o site passou a enviar) cai no fallback automático
// em vez de desaparecer — ver `briefingLabel`.
const BRIEFING_LABELS: Record<string, string> = {
  objetivo_principal: "Objetivo principal",
  publico_alvo: "Público-alvo",
  acao_principal: "Ação principal esperada",
  tem_logo: "Já tem logotipo?",
  cores_da_marca: "Cores da marca",
  estilo_desejado: "Estilo desejado",
  referencias: "Referências / sites admirados",
  paginas_desejadas: "Páginas desejadas",
  destaques: "Destaques (o que não pode faltar)",
  textos_prontos: "Textos já estão prontos?",
  fotos: "Fotos próprias disponíveis?",
  funcoes_extras: "Funções extras",
  dominio: "Domínio desejado",
  contas_de_email: "Contas de e-mail profissional",
  prazo_desejado: "Prazo desejado",
  investimento: "Faixa de investimento",
  como_conheceu: "Como conheceu a Innovare Code",
  observacoes: "Observações livres",
};

// Blocos 3 a 7 do formulário do site (1 e 2 já viram as seções "Contato" e
// "Empresa" acima). Mantém a mesma ordem e agrupamento que o cliente viu ao
// preencher — ajuda o time a revisar o briefing na mesma "forma mental".
const BRIEFING_BLOCKS: { title: string; keys: string[] }[] = [
  { title: "Objetivo do site", keys: ["objetivo_principal", "publico_alvo", "acao_principal"] },
  { title: "Identidade visual", keys: ["tem_logo", "cores_da_marca", "estilo_desejado", "referencias"] },
  {
    title: "Conteúdo e estrutura",
    keys: ["paginas_desejadas", "destaques", "textos_prontos", "fotos", "funcoes_extras"],
  },
  { title: "Domínio e e-mail", keys: ["dominio", "contas_de_email"] },
  {
    title: "Prazo, investimento e observações",
    keys: ["prazo_desejado", "investimento", "como_conheceu", "observacoes"],
  },
];

function briefingLabel(key: string): string {
  return (
    BRIEFING_LABELS[key] ??
    key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

function hasValue(value: string | string[] | undefined): value is string | string[] {
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

function BriefingValue({ value }: { value: string | string[] }) {
  if (Array.isArray(value)) {
    return (
      <div className="chip-row">
        {value.map((item) => (
          <span key={item} className="chip">
            {item}
          </span>
        ))}
      </div>
    );
  }
  return <>{value}</>;
}

export default async function AdminIntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const intake = await getIntake(id);
  if (!intake) notFound();

  const payload = intake.payload as unknown as ValidatedIntakePayload;
  const meta = metaOrFallback(INTAKE_STATUS_META, intake.status);
  const briefing = payload.briefing ?? {};

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
              {payload.company.cnpj && (
                <div>
                  <dt>CNPJ</dt>
                  <dd>{payload.company.cnpj}</dd>
                </div>
              )}
              {payload.company.cidade_uf && (
                <div>
                  <dt>Cidade/UF</dt>
                  <dd>{payload.company.cidade_uf}</dd>
                </div>
              )}
              {payload.company.tempo_de_mercado && (
                <div>
                  <dt>Tempo de mercado</dt>
                  <dd>{payload.company.tempo_de_mercado}</dd>
                </div>
              )}
              {payload.company.site_atual && (
                <div>
                  <dt>Site atual</dt>
                  <dd>{payload.company.site_atual}</dd>
                </div>
              )}
              {payload.company.instagram && (
                <div>
                  <dt>Instagram</dt>
                  <dd>{payload.company.instagram}</dd>
                </div>
              )}
              {payload.company.facebook && (
                <div>
                  <dt>Facebook</dt>
                  <dd>{payload.company.facebook}</dd>
                </div>
              )}
              {payload.company.linkedin && (
                <div>
                  <dt>LinkedIn</dt>
                  <dd>{payload.company.linkedin}</dd>
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

          {BRIEFING_BLOCKS.map((block) => {
            const entries = block.keys
              .map((key) => [key, briefing[key]] as const)
              .filter((entry): entry is [string, string | string[]] => hasValue(entry[1]));
            if (entries.length === 0) return null;
            const headingId = `briefing-${block.title.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <section key={block.title} className="card card-pad" aria-labelledby={headingId}>
                <h2 id={headingId} className="section-title">
                  {block.title}
                </h2>
                <dl className="kv-grid" style={{ marginTop: 12 }}>
                  {entries.map(([key, value]) => (
                    <div key={key}>
                      <dt>{briefingLabel(key)}</dt>
                      <dd>
                        <BriefingValue value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
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
