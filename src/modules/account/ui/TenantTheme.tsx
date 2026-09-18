import type { ThemeMode } from "@/modules/account/domain";

/**
 * Applies the clinic's theme (mode and accent color) to authenticated areas.
 *
 * It exists because the root layout no longer reads the session: doing it
 * there made even the public landing dynamic, though it does not depend on who
 * is signed in. Here the cost lands where it makes sense — on pages that
 * already require a session and are already rendered on demand.
 *
 * The script is inline and runs while the HTML is still streaming, before the
 * page content paints. That is why someone who picked the dark theme never
 * sees the light one flash first.
 *
 * Security note: `mode` and `accent` come from the database, but were
 * validated on write (ThemeMode is a closed union; the color goes through the
 * HexColor value object). They are still serialized with JSON.stringify rather
 * than interpolated directly — that is what stops an unexpected value from
 * closing the string and becoming code.
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
