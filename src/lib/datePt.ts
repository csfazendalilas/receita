const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];

export function parseDdMmYyyy(value: string): { day: number; month: number; year: number } | null {
  const m = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/.exec(value);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year };
}

export function formatDateFullPt(ddMmYyyy: string): string {
  const parsed = parseDdMmYyyy(ddMmYyyy);
  if (!parsed) return ddMmYyyy;
  const monthName = MONTHS_PT[parsed.month - 1];
  return `${String(parsed.day).padStart(2, "0")} de ${monthName} de ${parsed.year}`;
}

