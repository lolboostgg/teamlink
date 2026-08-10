import fs from "node:fs";
import path from "node:path";

/**
 * Cuts Font Awesome down to the icons this codebase actually draws.
 *
 * The full stylesheet carries every glyph in the free set — about 2,000 rules
 * — for the 175-odd this site uses, and it is loaded on every page. This
 * emits the same file with the unused icon rules removed.
 *
 * Generated at build time, never by hand. A checked-in list would be one more
 * thing to remember when adding an icon, and the failure mode of forgetting
 * is an invisible blank square rather than an error. Scanning the source on
 * every build means the two cannot drift.
 *
 * Every icon name in the codebase is a literal, including the ones inside
 * template strings (`fa-solid ${x ? "fa-eye" : "fa-eye-slash"}`) — the scan
 * below reads raw text, so those are found too. If somebody ever builds a
 * name out of a variable, this is the file that has to learn about it.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "node_modules/@fortawesome/fontawesome-free/css/all.min.css");
const OUT = path.join(ROOT, "src/app/generated/fontawesome.css");

/** Every `fa-…` token appearing anywhere in the source tree. */
function usedTokens() {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Prisma's generated client is megabytes of unrelated text.
        if (entry.name !== "generated") walk(full);
      } else if (/\.(tsx?|css)$/.test(entry.name) && full !== OUT) {
        for (const match of fs.readFileSync(full, "utf8").matchAll(/\bfa-[a-z0-9-]+/g)) found.add(match[0]);
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return found;
}

/**
 * Splits a stylesheet into top-level rules, counting braces so an @font-face
 * or @keyframes block survives in one piece. Splitting on "}" does not.
 */
function topLevelRules(css) {
  const rules = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i];
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        rules.push(css.slice(start, i + 1));
        start = i + 1;
      }
    }
  }
  if (start < css.length) rules.push(css.slice(start));
  return rules;
}

/**
 * What a glyph rule looks like in Font Awesome 7:
 *
 *   .fa-check{--fa:"\f00c"}
 *   .fa-close,.fa-multiply,.fa-remove,.fa-times,.fa-xmark{--fa:"\f00d"}
 *
 * The codepoint moved into a custom property in v7; earlier versions wrote
 * `.fa-check:before{content:"\f00c"}`. Both selector shapes are recognised so
 * an upgrade in either direction does not silently strip every icon.
 *
 * The body check matters as much as the selector: `.fa-spin`, `.fa-2xl`,
 * `.fa-border` and `.fa-stack` are single-class `.fa-*` rules too, and they
 * are structural. Only a rule that sets --fa (or a v6 content:) is a glyph.
 */
const ICON_SELECTOR = /^\.(fa-[a-z0-9-]+)(::?before)?$/;
const GLYPH_BODY = /^\{\s*(--fa\s*:|content\s*:)/;

function main() {
  const css = fs.readFileSync(SOURCE, "utf8");
  const used = usedTokens();

  let kept = 0;
  let dropped = 0;

  const out = topLevelRules(css)
    .map((rule) => {
      const brace = rule.indexOf("{");
      if (brace === -1 || rule.trimStart().startsWith("@")) return rule; // at-rules pass through whole
      const selectors = rule.slice(0, brace).split(",").map((s) => s.trim()).filter(Boolean);
      const iconSelectors = selectors.filter((s) => ICON_SELECTOR.test(s));

      // Anything that is not purely an icon-glyph rule is structural — the
      // base .fa class, the family weights, .fa-spin, the animations — and is
      // kept untouched.
      if (iconSelectors.length !== selectors.length) return rule;
      if (!GLYPH_BODY.test(rule.slice(brace))) return rule;

      // FA groups aliases into one rule (.fa-xmark,.fa-close,.fa-times), so
      // keep the rule if any alias is used, and only the aliases in use.
      const wanted = iconSelectors.filter((s) => used.has(s.match(ICON_SELECTOR)[1]));
      if (wanted.length === 0) {
        dropped += 1;
        return "";
      }
      kept += 1;
      return wanted.join(",") + rule.slice(brace);
    })
    .join("");

  // The @font-face blocks point at `../webfonts/…`, which resolves next to
  // the stylesheet inside node_modules and nowhere near where this one lands.
  // Rewritten to a path from the generated file back to the package, computed
  // here rather than hardcoded so moving either end cannot break it. Going
  // through the bundler (rather than copying the fonts into public/) is what
  // keeps their immutable hashed URLs.
  const webfonts = path
    .relative(path.dirname(OUT), path.join(ROOT, "node_modules/@fortawesome/fontawesome-free/webfonts"))
    .split(path.sep)
    .join("/");
  const withFonts = out.replaceAll("../webfonts/", `${webfonts}/`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    `/* GENERATED by scripts/build-icon-css.mjs — do not edit, do not commit.\n` +
      `   ${kept} icon rules kept, ${dropped} dropped. */\n${withFonts}`,
    "utf8",
  );

  const before = Buffer.byteLength(css);
  const after = fs.statSync(OUT).size;
  console.log(
    `[icons] ${kept} icon rules kept, ${dropped} dropped — ` +
      `${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`,
  );
}

main();
