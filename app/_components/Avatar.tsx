// Avatar circular com iniciais — topbar/sidebar (usuário logado) e tabelas
// do admin (linha "quem"). Puramente decorativo (o nome completo já está em
// texto ao lado), por isso `aria-hidden`.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`avatar${className ? ` ${className}` : ""}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
