import { EngineError } from "../errors.js";

/**
 * Calendar helpers on plain {year, month, day} values. The engine never reads
 * the clock: every date comes in as an ISO string (YYYY-MM-DD).
 */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 0;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(m: number): string {
  return MONTHS[m - 1] ?? String(m);
}

/** Parses YYYY-MM-DD and rejects dates that do not exist (30 February). */
export function parseDate(iso: string, field = "date"): CalendarDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    throw new EngineError("invalid_date", `${iso} is not a date in the form YYYY-MM-DD.`, field);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    const label = month >= 1 && month <= 12 ? `${day} ${monthName(month)} ${year}` : iso;
    throw new EngineError("invalid_date", `${label} is not a date.`, field);
  }
  return { year, month, day };
}

export function formatDate(d: CalendarDate): string {
  const p = (n: number, w: number) => String(n).padStart(w, "0");
  return `${p(d.year, 4)}-${p(d.month, 2)}-${p(d.day, 2)}`;
}

/** Days since 1970-01-01 (proleptic Gregorian), for comparisons and arithmetic. */
export function toDayNumber(d: CalendarDate): number {
  // Howard Hinnant's days_from_civil.
  const y = d.month <= 2 ? d.year - 1 : d.year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (d.month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(z0: number): CalendarDate {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

export function addDays(d: CalendarDate, n: number): CalendarDate {
  return fromDayNumber(toDayNumber(d) + n);
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return toDayNumber(a) - toDayNumber(b);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(d: CalendarDate): number {
  return (((toDayNumber(d) + 4) % 7) + 7) % 7;
}

/** Completed years of age on a date (a 29 February birthday counts on 1 March in common years). */
export function ageOn(birth: CalendarDate, on: CalendarDate): number {
  const hadBirthday =
    on.month > birth.month || (on.month === birth.month && on.day >= birth.day);
  return on.year - birth.year - (hadBirthday ? 0 : 1);
}

/** Parses HH:MM (24 hour). */
export function parseTime(hhmm: string, field = "person.birth_time"): { hour: number; minute: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  const hour = Number(m?.[1]);
  const minute = Number(m?.[2]);
  if (!m || hour > 23 || minute > 59) {
    throw new EngineError("invalid_time", `${hhmm} is not a time in the form HH:MM.`, field);
  }
  return { hour, minute };
}

/** Parses a UTC offset such as +05:30 into minutes. */
export function parseOffset(offset: string, field = "person.birth_place.utc_offset"): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m || Number(m[2]) > 14 || Number(m[3]) > 59) {
    throw new EngineError("invalid_input", `${offset} is not a UTC offset like +05:30.`, field);
  }
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Minutes since 1970-01-01T00:00Z of a local date and time at a UTC offset. */
export function toUtcMinutes(
  d: CalendarDate,
  hour: number,
  minute: number,
  offsetMinutes: number,
): number {
  return toDayNumber(d) * 1440 + hour * 60 + minute - offsetMinutes;
}

/** Parses the Lichun table's "YYYY-MM-DDTHH:MMZ" into minutes since the epoch. */
export function parseUtcInstant(iso: string): number {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})Z$/.exec(iso);
  if (!m) throw new EngineError("invalid_rules", `Bad UTC instant ${iso}.`);
  return toUtcMinutes(parseDate(m[1]!), Number(m[2]), Number(m[3]), 0);
}

/** The local calendar date of a UTC instant (minutes since epoch) at an offset. */
export function localDateOf(utcMinutes: number, offsetMinutes: number): CalendarDate {
  return fromDayNumber(Math.floor((utcMinutes + offsetMinutes) / 1440));
}
