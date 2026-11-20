import { toDayNumber, type CalendarDate } from "./dates.js";

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * Sunrise for a calendar date at a place, as minutes since the epoch (UTC),
 * using the NOAA / Almanac for Computers approximation (about one minute).
 * Used only for the practitioner's sunrise day boundary (D2). Returns null
 * where the sun does not rise that day.
 */
export function sunriseUtcMinutes(date: CalendarDate, lat: number, lon: number): number | null {
  // Day of year.
  const n = toDayNumber(date) - toDayNumber({ year: date.year, month: 1, day: 1 }) + 1;
  const lngHour = lon / 15;
  const t = n + (6 - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  let L = M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634;
  L = ((L % 360) + 360) % 360;
  let RA = deg(Math.atan(0.91764 * Math.tan(rad(L))));
  RA = ((RA % 360) + 360) % 360;
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
  const sinDec = 0.39782 * Math.sin(rad(L));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
  if (cosH > 1 || cosH < -1) return null;
  const H = (360 - deg(Math.acos(cosH))) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const UT = (((T - lngHour) % 24) + 24) % 24;
  // UT is wrapped to 0-24 h; far east of Greenwich the local sunrise falls on the previous UTC day.
  const localSolar = UT + lngHour;
  const shift = localSolar >= 24 ? -1 : localSolar < 0 ? 1 : 0;
  return (toDayNumber(date) + shift) * 1440 + Math.round(UT * 60);
}
