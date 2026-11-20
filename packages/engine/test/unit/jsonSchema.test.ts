import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rulesJsonSchemas } from "../../src/index.js";

const schemaDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "rules",
  "schema",
);

describe("packages/rules/schema", () => {
  it("is up to date with the engine's Zod schemas (run pnpm --filter @kalachakra/engine gen:schemas)", () => {
    const generated = rulesJsonSchemas();
    const committed = readdirSync(schemaDir).filter((f) => f.endsWith(".schema.json"));
    expect(committed.sort()).toEqual(Object.keys(generated).sort());
    for (const [file, schema] of Object.entries(generated)) {
      expect(JSON.parse(readFileSync(join(schemaDir, file), "utf8")), file).toEqual(schema);
    }
  });
});
