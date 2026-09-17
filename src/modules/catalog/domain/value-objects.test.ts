import { describe, expect, it } from "vitest";
import { ImageUrl } from "./value-objects";

describe("ImageUrl", () => {
  it("aceita http e https, aparando espaços", () => {
    expect(ImageUrl.optional("  https://cdn.exemplo.com/resina.png ")).toBe(
      "https://cdn.exemplo.com/resina.png"
    );
    expect(ImageUrl.optional("http://exemplo.com/a.jpg")).toBe("http://exemplo.com/a.jpg");
  });

  it("descarta esquemas perigosos em vez de gravá-los (XSS)", () => {
    expect(ImageUrl.optional("javascript:alert(1)")).toBeNull();
    expect(ImageUrl.optional("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
  });

  it("nunca lança: inválida, longa demais ou não-texto vira ausência", () => {
    expect(ImageUrl.optional("não é url")).toBeNull();
    expect(ImageUrl.optional(`https://exemplo.com/${"a".repeat(2048)}`)).toBeNull();
    expect(ImageUrl.optional(123)).toBeNull();
    expect(ImageUrl.optional("")).toBeNull();
  });
});
