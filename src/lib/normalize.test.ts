import { describe, expect, it } from "vitest";
import { normalizeQty } from "./normalize";

describe("normalizeQty", () => {
  it("normaliza caixa", () => {
    expect(normalizeQty("2 caixas")).toBe("2 CX");
  });

  it("normaliza comprimido com acento", () => {
    expect(normalizeQty("30 comprimidos")).toBe("30 CPR");
  });

  it("normaliza capsula", () => {
    expect(normalizeQty("1 capsula(s)")).toBe("1 CAPS");
  });

  it("mantem unidade desconhecida", () => {
    expect(normalizeQty("5 ampolas")).toBe("5 AMPOLAS");
  });
});
