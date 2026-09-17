/** Value Objects do catálogo. */

/**
 * URL de imagem opcional.
 *
 * Somente http/https por allowlist: `javascript:` ou `data:` em `src` de imagem
 * abrem porta para XSS quando o valor é renderizado (OWASP A03).
 *
 * Como `TrackingTag`, nunca lança: URL inválida vira ausência de imagem, e a
 * tela cai no ícone de reserva — um link quebrado não impede cadastrar material.
 */
export class ImageUrl {
  private static readonly MAX = 2048;

  static optional(raw: unknown): string | null {
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const value = raw.trim();
    if (value.length > ImageUrl.MAX) return null;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return value;
    } catch {
      return null;
    }
  }
}
