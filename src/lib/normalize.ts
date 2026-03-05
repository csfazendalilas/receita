function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const UNIT_MAP: Array<{ regex: RegExp; normalized: string }> = [
  { regex: /^(CAIXA\(S\)|CAIXAS?|CX)$/i, normalized: "CX" },
  { regex: /^(COMPRIMIDO\(S\)|COMPRIMIDOS?|CPR)$/i, normalized: "CPR" },
  { regex: /^(CAPSULA\(S\)|CAPSULAS?|CAP)$/i, normalized: "CAPS" },
  { regex: /^(FRASCO\(S\)|FRASCOS?|FR)$/i, normalized: "FR" }
];

export function normalizeQty(input: string): string {
  const clean = stripDiacritics(input).replace(/\s+/g, " ").trim().toUpperCase();
  if (!clean) return "";

  const m = /^(\d+)\s+(.+)$/.exec(clean);
  if (!m) return clean;

  const amount = m[1];
  const rawUnit = m[2].trim();

  for (const entry of UNIT_MAP) {
    if (entry.regex.test(rawUnit)) {
      return `${amount} ${entry.normalized}`;
    }
  }

  return `${amount} ${rawUnit}`;
}
