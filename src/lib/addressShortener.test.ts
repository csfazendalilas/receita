import { describe, expect, it } from "vitest";
import { applyAddressAbbreviations } from "./addressShortener";

describe("applyAddressAbbreviations", () => {
  it("abrevia logradouros mantendo numero", () => {
    const input = "Rua das Flores 123, Centro";
    expect(applyAddressAbbreviations(input, false)).toBe("R. das Flores 123, Centro");
  });

  it("aplica abreviacao opcional de cidade e estado", () => {
    const input = "Avenida Beira Mar 500, Florianopolis, Santa Catarina";
    expect(applyAddressAbbreviations(input, true)).toBe("Av. Beira Mar 500, Floripa, SC");
  });
});
