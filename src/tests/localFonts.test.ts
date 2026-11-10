/** Interface fonts come from the app, never from the internet, and are in the offline cache. */
import { describe, it, expect } from "vitest";
import indexHtml from "../../index.html?raw";
import viteConfig from "../../vite.config.ts?raw";

// Vitest empties every .css import, so these two are read from disk.
const { readFileSync } = (await import(/* @vite-ignore */ `node:${"fs"}`)) as { readFileSync: (path: string, encoding: string) => string };
const fontsCss = readFileSync("src/shared/styles/fonts.css", "utf8");
const indexCss = readFileSync("src/index.css", "utf8");

const shipped = Object.keys(import.meta.glob("/public/fonts/ui/*.woff2")).map((p) => p.replace("/public", ""));
const declared = [...fontsCss.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);

describe("interface fonts", () => {
  it("nothing is loaded from an external font service", () => {
    expect(indexHtml).not.toMatch(/fonts\.(googleapis|gstatic)/);
    expect(fontsCss).not.toMatch(/https?:/);
  });

  it("every declared font file ships with the app, and none is left over", () => {
    expect(declared.length).toBeGreaterThan(0);
    expect([...declared].sort()).toEqual([...shipped].sort());
  });

  it("keeps the names the screens use, across all weights", () => {
    const families = [...fontsCss.matchAll(/font-family: '([^']+)'/g)].map((m) => m[1]);
    expect(new Set(families)).toEqual(new Set(["Outfit", "Inter"]));
    expect(fontsCss.match(/font-weight: 100 900/g)).toHaveLength(families.length);
  });

  it("the stylesheet is imported and the files are in the offline cache", () => {
    expect(indexCss).toContain('@import "./shared/styles/fonts.css"');
    expect(viteConfig).toMatch(/globPatterns: \[[^\]]*woff2/);
  });
});
