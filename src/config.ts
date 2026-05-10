import 'dotenv/config';
import { resolve } from 'path';

const getVaultPath = (): string => {
  const wikiPath = process.env.WIKI_PATH;
  if (!wikiPath) {
    console.error('Error: WIKI_PATH is not set. Add it to your .env file.');
    process.exit(1);
  }
  return resolve(wikiPath);
};

export const config = {
  wikiPath: getVaultPath(),
  wikiContext: process.env.WIKI_CONTEXT ?? null,
};
