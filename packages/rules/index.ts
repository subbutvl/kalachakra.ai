// @kalachakra/rules: rule DATA only. No logic lives here; the engine validates
// and resolves these files (packages/engine/src/rules).

import manifest from "./v1.0/manifest.json" with { type: "json" };
import letters from "./v1.0/letters.json" with { type: "json" };
import planets from "./v1.0/planets.json" with { type: "json" };
import compounds from "./v1.0/compounds.json" with { type: "json" };
import loshu from "./v1.0/loshu.json" with { type: "json" };
import kua from "./v1.0/kua.json" with { type: "json" };
import mobile from "./v1.0/mobile.json" with { type: "json" };
import business from "./v1.0/business.json" with { type: "json" };
import compatibility from "./v1.0/compatibility.json" with { type: "json" };
import optimizer from "./v1.0/optimizer.json" with { type: "json" };
import dates from "./v1.0/dates.json" with { type: "json" };
import switches from "./v1.0/switches.json" with { type: "json" };

import houseDefault from "./profiles/house-default.json" with { type: "json" };
import vedicpupilCompat from "./profiles/vedicpupil-compat.json" with { type: "json" };
import samplePractitioner from "./profiles/sample-practitioner.json" with { type: "json" };

/** Every rules version shipped, keyed by version id. Values are raw, unvalidated JSON. */
export const rulesVersions = {
  "v1.0": {
    manifest,
    letters,
    planets,
    compounds,
    loshu,
    kua,
    mobile,
    business,
    compatibility,
    optimizer,
    dates,
    switches,
  },
} as const;

/** The rule profiles shipped in phase 1, keyed by profile id. Raw, unvalidated JSON. */
export const ruleProfiles = {
  "house-default": houseDefault,
  "vedicpupil-compat": vedicpupilCompat,
  "sample-practitioner": samplePractitioner,
} as const;

export const DEFAULT_PROFILE_ID = "house-default";
