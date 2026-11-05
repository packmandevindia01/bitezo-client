#!/usr/bin/env node
/**
 * ESLint ratchet (Phase 0). The repo has thousands of existing lint errors, so `eslint .` cannot be a
 * gate yet. This compares error counts PER RULE with lint-baseline.json:
 *   - any rule with MORE errors than the baseline → fail (new debt is not allowed)
 *   - fewer errors → pass, and run `npm run lint:baseline` to lock the improvement in
 * Usage: node scripts/lint-ratchet.mjs [--update]
 */
import { ESLint } from "eslint";
import fs from "node:fs";

const BASELINE = new URL("../lint-baseline.json", import.meta.url);
const update = process.argv.includes("--update");

const eslint = new ESLint();
const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);
const byRule = {};
let total = 0;
for (const r of results) {
  for (const m of r.messages) {
    if (m.severity !== 2) continue;
    const rule = m.ruleId || "(parse)";
    byRule[rule] = (byRule[rule] || 0) + 1;
    total++;
  }
}
const sorted = Object.fromEntries(Object.entries(byRule).sort((a, b) => b[1] - a[1]));

const old = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : null;

if (update || !old) {
  if (old && !process.argv.includes("--force")) {
    const worse = Object.entries(sorted).filter(([k, v]) => v > (old.byRule[k] || 0));
    if (worse.length) {
      console.error("Refusing to raise the baseline (use --force only with review):", worse);
      process.exit(1);
    }
  }
  fs.writeFileSync(BASELINE, JSON.stringify({ total, byRule: sorted }, null, 2) + "\n");
  console.log(`lint baseline written: ${total} errors`);
  process.exit(0);
}

const regressions = [];
for (const [rule, count] of Object.entries(sorted)) {
  const allowed = old.byRule[rule] || 0;
  if (count > allowed) regressions.push(`${rule}: ${count} (baseline ${allowed}, +${count - allowed})`);
}
console.log(`lint errors: ${total} (baseline ${old.total})`);
if (regressions.length) {
  console.error("New lint errors introduced:\n  " + regressions.join("\n  "));
  console.error("Fix them, or run `npx eslint <file>` to see where.");
  process.exit(1);
}
if (total < old.total) console.log(`Improved by ${old.total - total}. Run "npm run lint:baseline" to lock it in.`);
