/**
 * Input checks as the customer types (phase 1 spec 5.2). The API checks again;
 * these only give quick, friendly messages.
 */

/** Every message these checks can return, so the Tamil check sees them. */
export const MESSAGES = /* i18n */ [
  "Please enter the name.",
  "Please type the name in English letters, as it is spelt.",
  "A name needs at least 2 letters.",
  "Please enter the date of birth.",
  "Please enter the incorporation date.",
  "That date does not exist.",
  "Please use a year between 1900 and 2100.",
  "Enter a 10-digit Indian mobile number (+91 or a leading 0 is fine).",
  "Use a registration like KA 05 MN 1234.",
  "Use a number like 12 or 12B.",
  "Use English letters, at least 2.",
  "Use HH:MM.",
  "Choose a basis for the Kua number.",
  "Choose a Kua basis.",
] as const;

export function lettersOnly(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();
}

export function checkName(name: string): string | undefined {
  if (!name.trim()) return "Please enter the name.";
  if (/\p{Script=Tamil}|\p{Script=Devanagari}/u.test(name))
    return "Please type the name in English letters, as it is spelt.";
  if (lettersOnly(name).replace(/ /g, "").length < 2) return "A name needs at least 2 letters.";
  return undefined;
}

export function checkDate(iso: string, label = "date of birth"): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return `Please enter the ${label}.`;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d)
    return "That date does not exist.";
  if (y < 1900 || y > 2100) return "Please use a year between 1900 and 2100.";
  return undefined;
}

/** The 10-digit national number, with +91, 0091 or a leading 0 removed. */
export function nationalMobile(raw: string): string | undefined {
  let s = raw.replace(/[\s\-().]/g, "");
  for (const p of ["+91", "0091", "0"]) {
    if (s.startsWith(p) && s.length - p.length === 10) {
      s = s.slice(p.length);
      break;
    }
  }
  return /^\d{10}$/.test(s) ? s : undefined;
}

export function checkMobile(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  return nationalMobile(raw)
    ? undefined
    : "Enter a 10-digit Indian mobile number (+91 or a leading 0 is fine).";
}

export function checkRegistration(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const r = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(r) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(r)
    ? undefined
    : "Use a registration like KA 05 MN 1234.";
}

export function checkHouse(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  return /^\d+[A-Za-z]{0,2}$/.test(raw.replace(/[\s\-/]/g, ""))
    ? undefined
    : "Use a number like 12 or 12B.";
}

export function longDate(iso: string, language: "en" | "ta" = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "ta" ? "ta-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}
