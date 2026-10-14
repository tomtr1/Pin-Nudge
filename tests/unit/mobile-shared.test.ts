import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHARED_FILES, transform } from "../../mobile/scripts/sync-shared.mjs";

/** The iOS app keeps generated copies of shared types and option lists; they must match the web app. */
describe("mobile shared code", () => {
  for (const f of SHARED_FILES as { from: string; to: string }[]) {
    it(`mobile/src/shared/${f.to} is in sync with ${f.from} (run: cd mobile && npm run sync-shared)`, () => {
      const expected = transform(readFileSync(path.resolve(f.from), "utf8"));
      const actual = readFileSync(path.resolve("mobile/src/shared", f.to), "utf8");
      expect(actual).toBe(expected);
    });
  }
});
