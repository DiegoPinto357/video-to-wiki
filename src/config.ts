import 'dotenv/config';
import { resolve } from 'path';
import { profileDir, resolveWiki } from './utils/registry';
import { readConfig } from './utils/system';

export { profileDir };

export type WikiConfig = {
  wikiPath: string;
  wikiName: string | null;
  wikiContext: string | null;
};

/**
 * Resolve wiki config for CLI commands.
 * Priority: --wiki flag > registry activeWiki > auto-select if only one > .env fallback.
 */
export const resolveWikiConfig = async (
  wikiFlag?: string,
): Promise<WikiConfig> => {
  const result = await resolveWiki(wikiFlag);

  if (result.ok) {
    const wikiPath = result.wiki.path;
    const fileConfig = await readConfig(wikiPath);
    return {
      wikiPath,
      wikiName: result.wiki.name,
      wikiContext: fileConfig.wikiContext ?? process.env.WIKI_CONTEXT ?? null,
    };
  }

  // Fall back to .env (legacy / migration path)
  const envPath = process.env.WIKI_PATH;
  if (envPath) {
    return {
      wikiPath: resolve(envPath),
      wikiName: null,
      wikiContext: process.env.WIKI_CONTEXT ?? null,
    };
  }

  console.error(`Error: ${result.error}`);
  process.exit(1);
};

/** @deprecated Use resolveWikiConfig() instead. Kept for commands not yet migrated. */
export const config = {
  wikiPath: (() => {
    const p = process.env.WIKI_PATH;
    return p ? resolve(p) : '';
  })(),
  wikiContext: process.env.WIKI_CONTEXT ?? null,
};
