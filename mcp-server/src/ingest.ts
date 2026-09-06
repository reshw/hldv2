import { findTemplate, findTemplates, isRedirect } from "./wikitext.js";
import { readCache, writeCache, diffRecords, type CacheRecord, type Kind } from "./cache.js";

const INFOBOX_NAME: Record<Kind, string> = {
  enemy: "Infobox Enemy",
  weapon: "Infobox Weapon",
};

export interface IngestResult {
  id: string;
  kind: Kind;
  status: "ingested" | "error";
  changes?: string[];
  record?: CacheRecord;
  message?: string;
}

/**
 * Parses wikitext the USER pasted in (copied from the page's "Edit source" view
 * in their own browser) into a CacheRecord. No network access happens here -
 * see README for why this server does not fetch helldivers.wiki.gg itself.
 */
export function ingestWikitext(kind: Kind, id: string, page: string, wikitext: string): IngestResult {
  const previous = readCache(kind, id);

  const redirectTarget = isRedirect(wikitext);
  if (redirectTarget) {
    return {
      id,
      kind,
      status: "error",
      message: `pasted text is just a redirect to "${redirectTarget}" - open that page's "Edit source" instead and paste its wikitext`,
    };
  }

  const infobox = findTemplate(wikitext, INFOBOX_NAME[kind]);
  const rows = kind === "enemy" ? findTemplates(wikitext, "Anatomy Row").map((t) => t.params) : undefined;

  if (!infobox) {
    return {
      id,
      kind,
      status: "error",
      message: `no {{${INFOBOX_NAME[kind]}}} template found in the pasted text - make sure you copied the raw wikitext ` +
        `(the page's "Edit source" view), not the rendered article text`,
    };
  }

  const record: CacheRecord = {
    id,
    page,
    title: page,
    fetchedAt: new Date().toISOString(),
    infobox: infobox.params,
    ...(rows ? { rows } : {}),
  };

  const changes = diffRecords(previous, record);
  writeCache(kind, record);
  return { id, kind, status: "ingested", changes, record };
}
