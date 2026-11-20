import type { ResolvedRules } from "../rules/loader.js";
import type { Person } from "../schemas/person.js";
import {
  addDays,
  formatDate,
  parseDate,
  parseOffset,
  parseTime,
  toUtcMinutes,
  type CalendarDate,
} from "../core/dates.js";
import { sunriseUtcMinutes } from "../core/sun.js";

/** India Standard Time, used when no UTC offset is given. */
export const DEFAULT_UTC_OFFSET = "+05:30";

export interface BirthMoment {
  /** The civil date as entered. */
  civil: CalendarDate;
  /** The date all numbers use: civil, or the Vedic (sunrise) day under D2. */
  date: CalendarDate;
  /** Birth instant in minutes since the epoch, when a time was given. */
  utcMinutes?: number;
  offsetMinutes: number;
  notes: string[];
  rule_refs: string[];
}

/**
 * Settles the birth date the engine works from (rules spec 3.1, D2). Under
 * "sunrise", a birth before local sunrise belongs to the previous Vedic day;
 * that needs the time and the place's latitude and longitude, and without
 * them the civil date is used with a note.
 */
export function birthMoment(person: Person, rules: ResolvedRules): BirthMoment {
  const civil = parseDate(person.dob, "person.dob");
  const offsetMinutes = parseOffset(person.birth_place?.utc_offset ?? DEFAULT_UTC_OFFSET);
  const notes: string[] = [];
  let utcMinutes: number | undefined;
  if (person.birth_time) {
    const t = parseTime(person.birth_time);
    utcMinutes = toUtcMinutes(civil, t.hour, t.minute, offsetMinutes);
  }

  let date = civil;
  if (rules.settings["date.day_boundary"] === "sunrise") {
    const lat = person.birth_place?.lat;
    const lon = person.birth_place?.lon;
    if (utcMinutes === undefined || lat === undefined || lon === undefined) {
      notes.push("Sunrise day boundary needs birth time, latitude and longitude; the civil date is used.");
    } else {
      const sunrise = sunriseUtcMinutes(civil, lat, lon);
      if (sunrise !== null && utcMinutes < sunrise) {
        date = addDays(civil, -1);
        notes.push(
          `Born before local sunrise, so the Vedic day is ${formatDate(date)} (civil date ${person.dob}).`,
        );
      }
    }
  }
  return {
    civil,
    date,
    ...(utcMinutes === undefined ? {} : { utcMinutes }),
    offsetMinutes,
    notes,
    rule_refs: ["D2"],
  };
}
