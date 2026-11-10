// Botão de submit genérico para forms client-side que chamam Server Actions
// diretamente (não via `action={fn}` do <form>, por isso sem useFormStatus —
// o estado `pending` é controlado por quem chama, que sabe o resultado da
// Promise). `aria-busy` informa leitor de tela sem precisar de live region
// extra para esse estado.
export function SubmitButton({
  pending,
  pendingLabel,
  children,
  variant = "primary",
  className,
  ...rest
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="submit"
      className={`btn btn-${variant}${className ? ` ${className}` : ""}`}
      disabled={pending || rest.disabled}
      aria-busy={pending}
      {...rest}
    >
      {pending && <span className="spinner" data-tone={variant === "primary" ? "light" : "dark"} aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
