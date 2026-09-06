/**
 * Minimal MediaWiki template parser.
 *
 * helldivers.wiki.gg stores stats as template calls, e.g.
 *   {{Infobox Enemy | health = 2400 | ... }}
 *   {{Anatomy Row | part_name = Butt | health = 950 | av = 0 | ... }}
 * repeated once per body part.
 *
 * This does not aim to be a full wikitext parser (no parser-function
 * evaluation, no template transclusion) - just enough brace/bracket
 * depth tracking to reliably split "{{Name | k = v | k2 = v2 }}" into
 * a plain key/value object, including repeated template calls.
 */

export interface TemplateInstance {
  name: string;
  params: Record<string, string>;
}

function stripWikiMarkup(v: string): string {
  return v
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1") // [[Page|Display]] -> Display
    .replace(/'''''|'''|''/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function normalizeTemplateName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

/** Splits the inside of a template call on top-level "|" chars, respecting nested {{}} / [[]]. */
function splitTopLevelParams(s: string): Record<string, string> {
  const parts: string[] = [];
  let depthCurly = 0;
  let depthSquare = 0;
  let buf = "";
  for (let k = 0; k < s.length; k++) {
    const two = s.slice(k, k + 2);
    if (two === "{{") { depthCurly++; buf += two; k++; continue; }
    if (two === "}}") { depthCurly = Math.max(0, depthCurly - 1); buf += two; k++; continue; }
    if (two === "[[") { depthSquare++; buf += two; k++; continue; }
    if (two === "]]") { depthSquare = Math.max(0, depthSquare - 1); buf += two; k++; continue; }
    if (s[k] === "|" && depthCurly === 0 && depthSquare === 0) {
      parts.push(buf);
      buf = "";
      continue;
    }
    buf += s[k];
  }
  if (buf.length) parts.push(buf);

  const out: Record<string, string> = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue; // unnamed positional param, e.g. the template's own name pass-through; ignore
    const key = p.slice(0, eq).trim();
    const val = stripWikiMarkup(p.slice(eq + 1));
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Finds every top-level {{templateName ...}} call in wikitext and returns
 * its parameters as a plain object. Multiple calls to the same template
 * (e.g. one "Anatomy Row" per body part) all come back, in document order.
 */
export function findTemplates(wikitext: string, templateName: string): TemplateInstance[] {
  const target = normalizeTemplateName(templateName);
  const results: TemplateInstance[] = [];
  let i = 0;

  while (i < wikitext.length) {
    const start = wikitext.indexOf("{{", i);
    if (start === -1) break;

    let depth = 0;
    let j = start;
    while (j < wikitext.length) {
      if (wikitext.startsWith("{{", j)) { depth++; j += 2; continue; }
      if (wikitext.startsWith("}}", j)) { depth--; j += 2; if (depth === 0) break; continue; }
      j++;
    }
    if (depth !== 0) break; // unbalanced braces near end of document, stop

    const block = wikitext.slice(start + 2, j - 2);
    i = j;

    const firstPipe = block.indexOf("|");
    const rawName = (firstPipe === -1 ? block : block.slice(0, firstPipe)).trim();
    if (normalizeTemplateName(rawName) !== target) {
      // Not a match, but the target may be nested inside this template's own
      // parameters (e.g. {{Anatomy Row}} calls living inside {{Anatomy Table|...}}).
      results.push(...findTemplates(block, templateName));
      continue;
    }

    const paramsPart = firstPipe === -1 ? "" : block.slice(firstPipe + 1);
    results.push({ name: rawName, params: splitTopLevelParams(paramsPart) });
  }

  return results;
}

/** Convenience for single-instance templates like an infobox; returns the first match or null. */
export function findTemplate(wikitext: string, templateName: string): TemplateInstance | null {
  const all = findTemplates(wikitext, templateName);
  return all.length ? all[0] : null;
}

export function isRedirect(wikitext: string): string | null {
  const m = wikitext.match(/^\s*#REDIRECT\s*\[\[([^\]|]+)/i);
  return m ? m[1].trim() : null;
}
