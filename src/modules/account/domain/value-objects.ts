/** Account value objects: the clinic's URL slug and visual identity. */
import { ValidationError } from "@/shared/domain";

/**
 * Clinic identifier used in URLs.
 *
 * Derived from the name by a deterministic transformation plus a final
 * allowlist (`a-z0-9-`): even if the name carries accents, emoji or `../`, the
 * result only contains characters that are safe in a path and in a query.
 */
export class Slug {
  private constructor(readonly value: string) {}

  private static readonly MAX = 40;
  private static readonly FALLBACK = "clinica";

  /** Derives the slug from a free-form name. Never throws: there is always an output. */
  static fromName(name: string): Slug {
    const normalized = name
      .toLowerCase()
      .normalize("NFD")
      // After NFD, accents become combining marks (non-ASCII).
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, Slug.MAX)
      .replace(/-+$/g, "");

    return new Slug(normalized || Slug.FALLBACK);
  }

  /** Numbered variant, for when the base slug is already taken. */
  withSuffix(n: number): Slug {
    const suffix = `-${n}`;
    const base = this.value.slice(0, Slug.MAX - suffix.length).replace(/-+$/g, "");
    return new Slug(`${base}${suffix}`);
  }

  toString() {
    return this.value;
  }
}

/** Hex color #RRGGBB — strict allowlist to prevent CSS injection. */
export class HexColor {
  private constructor(readonly value: string) {}

  static create(raw: unknown, field = "color"): HexColor {
    if (typeof raw !== "string" || !/^#[0-9a-fA-F]{6}$/.test(raw.trim())) {
      throw new ValidationError("Cor deve estar no formato #RRGGBB.", field);
    }
    return new HexColor(raw.trim().toLowerCase());
  }

  toString() {
    return this.value;
  }
}
