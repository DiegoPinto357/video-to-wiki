import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';

export const profileDir = join(homedir(), '.video-to-wiki');
const registryPath = join(profileDir, 'wikis.json');

export type WikiEntry = {
  name: string;
  path: string;
};

export type Registry = {
  activeWiki: string | null;
  wikis: WikiEntry[];
};

const defaultRegistry = (): Registry => ({ activeWiki: null, wikis: [] });

export const readRegistry = async (): Promise<Registry> => {
  try {
    return JSON.parse(await readFile(registryPath, 'utf-8')) as Registry;
  } catch {
    return defaultRegistry();
  }
};

export const saveRegistry = async (registry: Registry): Promise<void> => {
  await mkdir(profileDir, { recursive: true });
  await writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
};

export type ResolvedWiki = WikiEntry;

export type ResolveResult =
  | { ok: true; wiki: ResolvedWiki }
  | { ok: false; error: string };

/**
 * Resolve the wiki to operate on.
 * Priority: --wiki flag > activeWiki > auto-select if only one.
 */
export const resolveWiki = async (
  wikiFlag?: string,
): Promise<ResolveResult> => {
  const registry = await readRegistry();

  if (registry.wikis.length === 0) {
    return {
      ok: false,
      error:
        'No wikis registered. Run: npm run dev -- wiki add <path> --name <name>',
    };
  }

  if (wikiFlag) {
    const found = registry.wikis.find(w => w.name === wikiFlag);
    if (!found) {
      const names = registry.wikis.map(w => w.name).join(', ');
      return {
        ok: false,
        error: `Wiki "${wikiFlag}" not found. Registered wikis: ${names}`,
      };
    }
    return { ok: true, wiki: { ...found, path: resolve(found.path) } };
  }

  if (registry.wikis.length === 1) {
    const w = registry.wikis[0];
    return { ok: true, wiki: { ...w, path: resolve(w.path) } };
  }

  if (registry.activeWiki) {
    const found = registry.wikis.find(w => w.name === registry.activeWiki);
    if (found) {
      return { ok: true, wiki: { ...found, path: resolve(found.path) } };
    }
  }

  const names = registry.wikis.map(w => w.name).join(', ');
  return {
    ok: false,
    error: `Multiple wikis registered. Specify one with --wiki <name> or set active with: npm run dev -- wiki use <name>\nRegistered: ${names}`,
  };
};
