import { describe, expect, it } from "vitest";
import { canManageCatalog, canManageTeam, canSeeCosts, isPlatformAdmin } from "./policies";

describe("role permissions", () => {
  it("only OWNER owns the clinic account", () => {
    expect(isPlatformAdmin("OWNER")).toBe(true);
    expect(isPlatformAdmin("MEMBER")).toBe(false);
    expect(isPlatformAdmin("ASSISTANT")).toBe(false);
  });

  it("the assistant cannot change the catalog, see costs or manage the team", () => {
    expect(canManageCatalog("ASSISTANT")).toBe(false);
    expect(canSeeCosts("ASSISTANT")).toBe(false);
    expect(canManageTeam("ASSISTANT")).toBe(false);
  });

  it("OWNER and MEMBER have full access inside the clinic", () => {
    for (const papel of ["OWNER", "MEMBER"] as const) {
      expect(canManageCatalog(papel)).toBe(true);
      expect(canSeeCosts(papel)).toBe(true);
      expect(canManageTeam(papel)).toBe(true);
    }
  });
});
