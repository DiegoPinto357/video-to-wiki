import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { SourceData } from '../types';

export const ensureVaultDirs = async (vaultPath: string): Promise<void> => {
  const dirs = [
    join(vaultPath, 'Inbox'),
    join(vaultPath, 'Sources', 'raw'),
    join(vaultPath, 'Docs'),
    join(vaultPath, 'System'),
    join(vaultPath, 'Backup', 'Docs'),
  ];
  await Promise.all(dirs.map(d => mkdir(d, { recursive: true })));
};

export const getSourcePath = (vaultPath: string, id: string): string =>
  join(vaultPath, 'Sources', 'raw', `${id}.json`);

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
