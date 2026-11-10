"use client";

// Mantém a tela sincronizada com o servidor sem F5: dispara `router.refresh()`
// num intervalo curto para re-rodar os Server Components da rota atual e
// trazer dados novos (status, etapas, atualizações) — o App Router
// reconcilia a árvore existente, sem flicker nem perda de posição de
// rolagem. Pausa quando a aba está em segundo plano (`document.hidden`)
// para não gastar ciclos à toa, e sincroniza na hora ao voltar pra ela.
//
// Componente pequeno e só de UI — nenhuma lógica de negócio aqui, apenas o
// gatilho de refresh e um indicador sutil de "ao vivo".
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 12_000;

export function LiveRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    function sync() {
      if (document.hidden) return;
      router.refresh();
      setLastSync(new Date());
    }

    const id = setInterval(sync, intervalMs);

    function onVisibilityChange() {
      if (!document.hidden) sync();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, intervalMs]);

  // `suppressHydrationWarning`: o texto depende de `lastSync` (estado só do
  // cliente, não existe no HTML gerado pelo servidor) — sem isso o React
  // reclamaria de uma divergência que é esperada aqui.
  return (
    <span className="sync" suppressHydrationWarning>
      <span className="sync-dot" aria-hidden="true" />
      {lastSync
        ? `Sincronizado às ${lastSync.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`
        : "Atualização automática ativa"}
    </span>
  );
}
