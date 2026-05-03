import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

export type TagsFile = {
  categories: string[];
  tags: string[];
};

export type SourceEntry = {
  processed: boolean;
  docPath?: string;
};

export type SourcesFile = Record<string, SourceEntry>;

export type ConfigFile = {
  backup: {
    enabled: boolean;
    maxVersions: number;
  };
};

const DEFAULTS = {
  tags: (): TagsFile => ({ categories: [], tags: [] }),
  sources: (): SourcesFile => ({}),
  config: (): ConfigFile => ({ backup: { enabled: true, maxVersions: 10 } }),
};

const systemPath = (vaultPath: string, file: string) =>
  join(vaultPath, '.system', file);

const readJson = async <T>(path: string, fallback: () => T): Promise<T> => {
  try {
    await access(path);
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return fallback();
  }
};

const writeJson = async (path: string, data: unknown): Promise<void> =>
  writeFile(path, JSON.stringify(data, null, 2), 'utf-8');

export const initSystemFiles = async (vaultPath: string): Promise<void> => {
  const files: Array<[string, () => unknown]> = [
    ['tags.json', DEFAULTS.tags],
    ['sources.json', DEFAULTS.sources],
    ['config.json', DEFAULTS.config],
  ];

  await Promise.all(
    files.map(async ([file, defaultFn]) => {
      const path = systemPath(vaultPath, file);
      try {
        await access(path);
      } catch {
        await writeJson(path, defaultFn());
      }
    }),
  );
};

export const readConfig = (vaultPath: string): Promise<ConfigFile> =>
  readJson(systemPath(vaultPath, 'config.json'), DEFAULTS.config);

export const readTags = (vaultPath: string): Promise<TagsFile> =>
  readJson(systemPath(vaultPath, 'tags.json'), DEFAULTS.tags);

export const readSources = (vaultPath: string): Promise<SourcesFile> =>
  readJson(systemPath(vaultPath, 'sources.json'), DEFAULTS.sources);

export const markSourceIngested = async (
  vaultPath: string,
  id: string,
): Promise<void> => {
  const path = systemPath(vaultPath, 'sources.json');
  const sources = await readSources(vaultPath);
  if (!sources[id]) {
    sources[id] = { processed: false };
    await writeJson(path, sources);
  }
};

export const markSourceProcessed = async (
  vaultPath: string,
  id: string,
  docPath: string,
): Promise<void> => {
  const path = systemPath(vaultPath, 'sources.json');
  const sources = await readSources(vaultPath);
  sources[id] = { processed: true, docPath };
  await writeJson(path, sources);
};
