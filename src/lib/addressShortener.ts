export type AddressShortenOptions = {
  allowCityAbbrev?: boolean;
};

const BASE_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bRua\b/gi, "R."],
  [/\bAvenida\b/gi, "Av."],
  [/\bServidao\b/gi, "Serv."],
  [/\bServidao\b/gi, "Serv."],
  [/\bRodovia\b/gi, "Rod."],
  [/\bTravessa\b/gi, "Tv."],
  [/\bEstrada\b/gi, "Estr."]
];

const CITY_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bFlorianopolis\b/gi, "Floripa"],
  [/\bSanta Catarina\b/gi, "SC"]
];

function removeDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function replaceWithMap(text: string, map: Array<[RegExp, string]>): string {
  let out = text;
  for (const [pattern, replacement] of map) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function applyAddressAbbreviations(rawAddress: string, allowCityAbbrev = false): string {
  if (!rawAddress.trim()) return "";

  const safe = removeDiacritics(rawAddress);
  let shortened = replaceWithMap(safe, BASE_ABBREVIATIONS);
  if (allowCityAbbrev) {
    shortened = replaceWithMap(shortened, CITY_ABBREVIATIONS);
  }

  return shortened.replace(/\s+/g, " ").trim();
}

export function shortenAddress(rawAddress: string, options: AddressShortenOptions = {}): string {
  return applyAddressAbbreviations(rawAddress, Boolean(options.allowCityAbbrev));
}
