import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, ScrollText, Stethoscope } from "lucide-react";
import ToothIcon from "@/shared/ui/ToothIcon";

/**
 * Página pública — porta de entrada do sistema.
 *
 * Estática de propósito: não lê sessão nem banco, então o Next a serve como
 * HTML pronto. Quem já tem cookie é levado ao app pelo middleware antes de
 * chegar aqui.
 */
export const metadata = {
  title: "DentalStock — Controle de estoque por procedimento",
};

const RECURSOS = [
  {
    icon: Stethoscope,
    titulo: "Baixa por procedimento",
    texto:
      "Cada procedimento tem sua lista de materiais. Ao finalizar um atendimento, o estoque é debitado numa transação — ou tudo, ou nada.",
  },
  {
    icon: ScrollText,
    titulo: "Livro-razão do estoque",
    texto:
      "Nenhum saldo muda sem um movimento registrado, com tipo, autor, data e motivo. Correção manual exige justificativa.",
  },
  {
    icon: Boxes,
    titulo: "Custo médio ponderado",
    texto:
      "Entradas recalculam o custo do material pela média ponderada, e o custo é congelado na finalização — o histórico não muda de valor depois.",
  },
  {
    icon: BarChart3,
    titulo: "Consumo e reposição",
    texto:
      "Painel com consumo real, materiais em baixa, validade próxima e custo por especialidade.",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-canvas">
      <section className="mx-auto max-w-3xl px-5 pb-20 pt-20 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ToothIcon size={26} />
        </div>

        <h1 className="text-[38px] font-semibold leading-tight tracking-tight text-ink sm:text-[52px]">
          DentalStock
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[16.5px] leading-relaxed text-subink">
          Controle de estoque para clínicas odontológicas, organizado por procedimento:
          o material sai do estoque quando o atendimento é finalizado, e cada movimento
          fica registrado com autor e motivo.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Entrar <ArrowRight size={17} />
        </Link>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2">
          {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
            <div
              key={titulo}
              className="rounded-xl2 border border-hairline bg-surface p-5 shadow-card"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-accent">
                <Icon size={17} />
              </div>
              <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-subink">{texto}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
