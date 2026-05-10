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

const systemPath = (wikiPath: string, file: string) =>
  join(wikiPath, '.system', file);

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

export const initSystemFiles = async (wikiPath: string): Promise<void> => {
  const files: Array<[string, () => unknown]> = [
    ['tags.json', DEFAULTS.tags],
    ['sources.json', DEFAULTS.sources],
    ['config.json', DEFAULTS.config],
  ];

  await Promise.all(
    files.map(async ([file, defaultFn]) => {
      const path = systemPath(wikiPath, file);
      try {
        await access(path);
      } catch {
        await writeJson(path, defaultFn());
      }
    }),
  );
};

export const readConfig = (wikiPath: string): Promise<ConfigFile> =>
  readJson(systemPath(wikiPath, 'config.json'), DEFAULTS.config);

export const readTags = (wikiPath: string): Promise<TagsFile> =>
  readJson(systemPath(wikiPath, 'tags.json'), DEFAULTS.tags);

export const addTag = async (
  wikiPath: string,
  tags: string | string[],
  type: 'tag' | 'category' = 'tag',
): Promise<void> => {
  const path = systemPath(wikiPath, 'tags.json');
  const data = await readTags(wikiPath);
  const list = type === 'category' ? data.categories : data.tags;
  const toAdd = Array.isArray(tags) ? tags : [tags];
  let changed = false;
  for (const tag of toAdd) {
    if (!list.includes(tag)) {
      list.push(tag);
      changed = true;
    }
  }
  if (changed) await writeJson(path, data);
};

export const removeTag = async (
  wikiPath: string,
  tag: string,
  type: 'tag' | 'category' = 'tag',
): Promise<void> => {
  const path = systemPath(wikiPath, 'tags.json');
  const data = await readTags(wikiPath);
  if (type === 'category') {
    data.categories = data.categories.filter(t => t !== tag);
  } else {
    data.tags = data.tags.filter(t => t !== tag);
  }
  await writeJson(path, data);
};

export const readSources = (wikiPath: string): Promise<SourcesFile> =>
  readJson(systemPath(wikiPath, 'sources.json'), DEFAULTS.sources);

export const markSourceIngested = async (
  wikiPath: string,
  id: string,
): Promise<void> => {
  const path = systemPath(wikiPath, 'sources.json');
  const sources = await readSources(wikiPath);
  if (!sources[id]) {
    sources[id] = { processed: false };
    await writeJson(path, sources);
  }
};

export const markSourceProcessed = async (
  wikiPath: string,
  id: string,
  docPath: string,
): Promise<void> => {
  const path = systemPath(wikiPath, 'sources.json');
  const sources = await readSources(wikiPath);
  sources[id] = { processed: true, docPath };
  await writeJson(path, sources);
};
