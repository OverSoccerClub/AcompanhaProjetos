"use client";

// Dropdown "registros por página" das listas do admin. Precisa ser client
// porque navega no `onChange` (sem form/submit) — ao trocar o tamanho,
// sempre volta para a página 1 (um pageSize maior pode não ter página N
// válida) e preserva filtro/busca atuais na URL.
import { useId } from "react";
import { useRouter } from "next/navigation";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

export function PageSizeSelect({
  value,
  basePath,
  status,
  q,
}: {
  value: number;
  basePath: string;
  status?: string;
  q?: string;
}) {
  const router = useRouter();
  const id = useId();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    qs.set("pageSize", e.target.value);
    qs.set("page", "1");
    router.push(`${basePath}?${qs.toString()}`);
  }

  return (
    <label className="page-size" htmlFor={id}>
      <span>Por página</span>
      <select id={id} className="input select-sm" value={value} onChange={handleChange} aria-label="Registros por página">
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
