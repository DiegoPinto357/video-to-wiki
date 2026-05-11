import { profileDir, resolveWiki } from './utils/registry';
import { readConfig } from './utils/system';

export { profileDir };

export type WikiConfig = {
  wikiPath: string;
  wikiName: string | null;
  wikiContext: string | null;
};

export const resolveWikiConfig = async (
  wikiFlag?: string,
): Promise<WikiConfig> => {
  const result = await resolveWiki(wikiFlag);

  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  const wikiPath = result.wiki.path;
  const fileConfig = await readConfig(wikiPath);
  return {
    wikiPath,
    wikiName: result.wiki.name,
    wikiContext: fileConfig.wikiContext ?? null,
  };
};
