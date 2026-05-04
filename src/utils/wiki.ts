import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { SourceData } from '../types';
import { initSystemFiles } from './system';

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
