"use client";

import { TriangleAlert } from "lucide-react";

/**
 * Aviso de falha no topo da lista.
 *
 * Existe porque escrita que falha em silêncio é pior que erro visível: o
 * usuário fecha a tela achando que salvou. Renderiza nada quando não há
 * mensagem, para o chamador não precisar de condicional.
 */
export default function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-2 rounded-xl2 bg-danger-soft px-4 py-3 text-[13px] text-danger"
    >
      <TriangleAlert size={15} className="shrink-0" />
      {message}
    </div>
  );
}
