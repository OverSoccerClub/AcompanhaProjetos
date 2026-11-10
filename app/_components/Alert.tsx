// Alerta de estado (sucesso/erro/info) para resultado de ações assíncronas.
// `role="status"` (info/success) não interrompe o leitor de tela; erros
// usam `role="alert"` (assertivo) porque exigem atenção imediata do usuário.
export function Alert({
  tone,
  children,
}: {
  tone: "success" | "danger" | "info";
  children: React.ReactNode;
}) {
  return (
    <div className="alert" data-tone={tone} role={tone === "danger" ? "alert" : "status"}>
      <span aria-hidden="true">{tone === "success" ? "✓" : tone === "danger" ? "⚠" : "ℹ"}</span>
      <span>{children}</span>
    </div>
  );
}
