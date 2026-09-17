/** Ícone de dente desenhado à mão (o lucide-react não tem um).
 * Segue as convenções visuais do lucide: viewBox 24, traço em currentColor,
 * pontas arredondadas — assim combina com os demais ícones do sistema. */
export default function ToothIcon({
  size = 24,
  strokeWidth = 1.8,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5.6c-1.4-1.4-2.9-2.1-4.5-2.1C5 3.5 3.4 5.4 3.4 8c0 2.2.6 3.9 1.1 5.7.4 1.5.6 3 .8 4.4.2 1.4.5 2.4 1.6 2.4 1 0 1.4-1.1 1.7-2.4.3-1.3.6-2.6 1.3-3.2.3-.3.7-.4 1.1-.4s.8.1 1.1.4c.7.6 1 1.9 1.3 3.2.3 1.3.7 2.4 1.7 2.4 1.1 0 1.4-1 1.6-2.4.2-1.4.4-2.9.8-4.4.5-1.8 1.1-3.5 1.1-5.7 0-2.6-1.6-4.5-4.1-4.5-1.6 0-3.1.7-4.5 2.1Z" />
    </svg>
  );
}
