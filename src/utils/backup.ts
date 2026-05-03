import { copyFile, mkdir, readdir, rm, access } from 'fs/promises';
import { join, basename, extname } from 'path';
import { readConfig } from './system';

const backupDir = (vaultPath: string, filePath: string): string => {
  const name = basename(filePath, extname(filePath));
  return join(vaultPath, 'Backup', 'Docs', name);
};

const timestamp = (): string =>
  new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

export const backupFile = async (
  vaultPath: string,
  filePath: string,
): Promise<void> => {
  const cfg = await readConfig(vaultPath);
  if (!cfg.backup.enabled) return;

  // Check file exists before trying to back it up
  try {
    await access(filePath);
  } catch {
    return;
  }

  const dir = backupDir(vaultPath, filePath);
  await mkdir(dir, { recursive: true });

  const ext = extname(filePath);
  const dest = join(dir, `${timestamp()}${ext}`);
  await copyFile(filePath, dest);

  // Prune oldest versions beyond maxVersions
  const versions = (await readdir(dir)).sort();
  const excess = versions.length - cfg.backup.maxVersions;
  if (excess > 0) {
    await Promise.all(
      versions.slice(0, excess).map(v => rm(join(dir, v), { force: true })),
    );
  }
};
