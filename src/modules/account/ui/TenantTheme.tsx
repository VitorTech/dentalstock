import type { ThemeMode } from "@/modules/account/domain";

/**
 * Aplica o tema da clínica (modo e cor de destaque) nas áreas autenticadas.
 *
 * Existe porque o layout raiz deixou de ler a sessão: fazer isso lá tornava
 * dinâmica até a landing pública, que não depende de quem está logado. Aqui o
 * custo fica onde faz sentido — em páginas que já exigem sessão e já são
 * renderizadas sob demanda.
 *
 * O script é inline e roda enquanto o HTML ainda está sendo transmitido, antes
 * de o conteúdo da página pintar. Por isso quem escolheu tema escuro não vê o
 * claro piscar antes.
 *
 * Nota de segurança: `mode` e `accent` vêm do banco, mas foram validados na
 * escrita (ThemeMode é união fechada; a cor passa pelo value object HexColor).
 * Ainda assim são serializados com JSON.stringify, e não interpolados direto —
 * é o que impede que um valor inesperado feche a string e vire código.
 */
export default function TenantTheme({
  mode,
  accent,
}: {
  mode: ThemeMode;
  accent: string;
}) {
  const script = `
(function(){
  try {
    var mode = ${JSON.stringify(mode)};
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.style.setProperty('--accent', ${JSON.stringify(accent)});
  } catch (e) {}
})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
