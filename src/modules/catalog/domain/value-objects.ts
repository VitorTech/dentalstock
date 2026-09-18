/** Catalog value objects. */

/**
 * Optional image URL.
 *
 * http/https only, by allowlist: `javascript:` or `data:` in an image `src`
 * opens the door to XSS when the value is rendered (OWASP A03).
 *
 * It never throws: an invalid URL becomes no image at all, and the screen
 * falls back to a placeholder icon — a broken link must not block registering
 * a material.
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
