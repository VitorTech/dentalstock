/** Value Objects da conta: documento fiscal, endereço e identidade visual da clínica. */
import { ValidationError } from "@/shared/domain";

/**
 * Identificador de clínica usado em URL.
 *
 * Derivado do nome por transformação determinística e allowlist final
 * (`a-z0-9-`): mesmo que o nome traga acento, emoji ou `../`, o resultado só
 * contém caracteres seguros para caminho e para consulta.
 */
export class Slug {
  private constructor(readonly value: string) {}

  private static readonly MAX = 40;
  private static readonly FALLBACK = "clinica";

  /** Deriva o slug a partir de um nome livre. Nunca lança: sempre há saída. */
  static fromName(name: string): Slug {
    const normalized = name
      .toLowerCase()
      .normalize("NFD")
      // Após o NFD os acentos ficam como marcas combinantes (não-ASCII).
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, Slug.MAX)
      .replace(/-+$/g, "");

    return new Slug(normalized || Slug.FALLBACK);
  }

  /** Variante numerada, para quando o slug base já está em uso. */
  withSuffix(n: number): Slug {
    const suffix = `-${n}`;
    const base = this.value.slice(0, Slug.MAX - suffix.length).replace(/-+$/g, "");
    return new Slug(`${base}${suffix}`);
  }

  toString() {
    return this.value;
  }
}

/** Cor hexadecimal #RRGGBB — allowlist estrita para impedir injeção de CSS. */
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
