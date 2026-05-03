import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { SourceData } from '../types';
import { initSystemFiles } from './system';

export const ensureVaultDirs = async (vaultPath: string): Promise<void> => {
  const dirs = [
    join(vaultPath, '_inbox'),
    join(vaultPath, '.system', 'sources', 'raw'),
    join(vaultPath, '.system', 'backup', 'docs'),
  ];
  await Promise.all(dirs.map(d => mkdir(d, { recursive: true })));
  await initSystemFiles(vaultPath);
};

export const getSourcePath = (vaultPath: string, id: string): string =>
  join(vaultPath, '.system', 'sources', 'raw', `${id}.json`);

export const sourceExists = async (
  vaultPath: string,
  id: string,
): Promise<boolean> => {
  try {
    await access(getSourcePath(vaultPath, id));
    return true;
  } catch {
    return false;
  }
};

export const saveSource = async (
  vaultPath: string,
  data: SourceData,
): Promise<void> => {
  const path = getSourcePath(vaultPath, data.id);
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
};
