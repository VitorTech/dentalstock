import { Loader2 } from "lucide-react";

/** Indicador de carregamento padrão do sistema. */
export default function Spinner({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}
