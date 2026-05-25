import { mkdir, writeFile, access, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import type { SourceData } from '../types';
import { initSystemFiles } from './system';

const EXCLUDED_DIRS = new Set(['.system', '_inbox', '.git', 'node_modules']);

export const findMarkdownFiles = async (
  wikiPath: string,
  dir = wikiPath,
): Promise<string[]> => {
  const entries = await readdir(dir).catch(() => [] as string[]);
  const results: string[] = [];

  await Promise.all(
    entries.map(async entry => {
      const fullPath = join(dir, entry);
      const s = await stat(fullPath).catch(() => null);
      if (!s) return;
      if (s.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry)) {
          results.push(...(await findMarkdownFiles(wikiPath, fullPath)));
        }
      } else if (entry.endsWith('.md')) {
        results.push(relative(wikiPath, fullPath));
      }
    }),
  );

  return results;
};

export const ensureWikiDirs = async (wikiPath: string): Promise<void> => {
  const dirs = [
    join(wikiPath, '_inbox'),
    join(wikiPath, '.system', 'sources', 'raw'),
    join(wikiPath, '.system', 'backup', 'docs'),
  ];
  await Promise.all(dirs.map(d => mkdir(d, { recursive: true })));
  await initSystemFiles(wikiPath);
};

export const getSourcePath = (wikiPath: string, id: string): string =>
  join(wikiPath, '.system', 'sources', 'raw', `${id}.json`);

export const sourceExists = async (
  wikiPath: string,
  id: string,
): Promise<boolean> => {
  try {
    await access(getSourcePath(wikiPath, id));
    return true;
  } catch {
    return false;
  }
};

export const saveSource = async (
  wikiPath: string,
  data: SourceData,
): Promise<void> => {
  const path = getSourcePath(wikiPath, data.id);
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
};
