import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { resolveWikiConfig } from '../config';
import { readSources } from '../utils/system';
import type { SourceData } from '../types';

export const listUnprocessedCommand = new Command('list-unprocessed')
  .description('List unprocessed sources as JSON (no transcript)')
  .option('--wiki <name>', 'Wiki to operate on')
  .action(async (opts: { wiki?: string }) => {
    const { wikiPath } = await resolveWikiConfig(opts.wiki);
    const rawDir = join(wikiPath, '.system', 'sources', 'raw');

    let files: string[];
    try {
      files = (await readdir(rawDir)).filter(f => f.endsWith('.json'));
    } catch {
      console.log(JSON.stringify([]));
      return;
    }

    const sources = await readSources(wikiPath);

    const rows = await Promise.all(
      files.map(async file => {
        const id = file.replace('.json', '');
        const entry = sources[id];
        if (entry?.processed) return null;
        const raw = await readFile(join(rawDir, file), 'utf-8');
        const data = JSON.parse(raw) as SourceData;
        return {
          id: data.id,
          title: data.title,
          source: data.source,
          createdAt: data.createdAt,
          processed: false,
        };
      }),
    );

    const unprocessed = rows.filter(Boolean);
    unprocessed.sort((a, b) => a!.createdAt.localeCompare(b!.createdAt));

    console.log(JSON.stringify(unprocessed, null, 2));
  });
