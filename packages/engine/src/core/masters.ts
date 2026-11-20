import type { Settings } from "../schemas/settings.js";

/**
 * Where a number is used decides whether master numbers are kept (D3).
 *  - "pythagorean": life path, expression, soul urge, personality, maturity...
 *  - "personal_year": personal year (and month / day built on it)
 *  - "vedic": Mulank, Bhagyank planet, Chaldean name number, Lo Shu,
 *    mobile, vehicle, house and business numbers
 */
export type MasterContext = "pythagorean" | "personal_year" | "vedic";

export function keepMasters(
  settings: Pick<Settings, "masters.mode">,
  context: MasterContext,
): boolean {
  switch (settings["masters.mode"]) {
    case "always_reduce":
      return false;
    case "pythagorean_and_personal_years":
      return context === "pythagorean" || context === "personal_year";
    case "everywhere":
      return true;
  }
}
