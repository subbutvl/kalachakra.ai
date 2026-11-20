// `pnpm dev` starts the API (milestone 4) and the web app (milestone 6) once they exist.
// Until then it says what can be run instead.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const apps = ["apps/api/package.json", "apps/web/package.json"].filter((p) => existsSync(p));
if (apps.length === 0) {
  console.log(`
KalaChakra has no server or web app yet: the API arrives in milestone 4 and the web app in milestone 6.

What you can run now:
  pnpm numbers --name "Aarav Mehra" --dob 1991-08-14 --gender male
      prints every number for a name and date (add --profile kalachakra-classic, --as-of 2026-11-20, --json)
  pnpm check
      type check, lint and every test
`);
  process.exit(0);
}
const r = spawnSync("pnpm", ["exec", "turbo", "run", "dev"], { stdio: "inherit", shell: true });
process.exit(r.status ?? 1);
