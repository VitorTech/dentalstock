import ToothIcon from "@/shared/ui/ToothIcon";

/** Rodapé padrão do sistema, presente em todas as telas. */
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline/80 bg-surface/40">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-5 py-6 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-2 text-subink">
          <ToothIcon size={15} className="text-accent" />
          <span className="text-[12.5px] font-medium text-ink">DentalStock</span>
        </div>
        <p className="text-[12px] text-subink">
          © {year} DentalStock · Gestão de estoque odontológico
        </p>
      </div>
    </footer>
  );
}
