import { describe, expect, it } from "vitest";
import { canManageCatalog, canManageTeam, canSeeCosts, isPlatformAdmin } from "./policies";

describe("permissões por papel", () => {
  it("apenas OWNER é administrador da plataforma", () => {
    expect(isPlatformAdmin("OWNER")).toBe(true);
    expect(isPlatformAdmin("MEMBER")).toBe(false);
    expect(isPlatformAdmin("ASSISTANT")).toBe(false);
  });

  it("auxiliar não altera catálogo, não vê custo e não gere equipe", () => {
    expect(canManageCatalog("ASSISTANT")).toBe(false);
    expect(canSeeCosts("ASSISTANT")).toBe(false);
    expect(canManageTeam("ASSISTANT")).toBe(false);
  });

  it("OWNER e MEMBER têm acesso pleno na clínica", () => {
    for (const papel of ["OWNER", "MEMBER"] as const) {
      expect(canManageCatalog(papel)).toBe(true);
      expect(canSeeCosts(papel)).toBe(true);
      expect(canManageTeam(papel)).toBe(true);
    }
  });
});
