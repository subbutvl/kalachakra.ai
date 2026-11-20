// Writes packages/rules/schema/*.schema.json from the engine's Zod schemas.
// Run: pnpm --filter @kalachakra/engine gen:schemas
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rulesJsonSchemas } from "../src/schemas/jsonSchema.js";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "rules", "schema");
mkdirSync(outDir, { recursive: true });
for (const [file, schema] of Object.entries(rulesJsonSchemas())) {
  writeFileSync(join(outDir, file), JSON.stringify(schema, null, 2) + "\n");
  console.log(`wrote rules/schema/${file}`);
}
