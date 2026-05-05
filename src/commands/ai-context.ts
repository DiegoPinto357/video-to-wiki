import { Command } from 'commander';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { readTags, readSources } from '../utils/system';
import type { SourceData } from '../types';
import { extractSummary } from '../utils/doc-summary';

export const aiContextCommand = new Command('ai-context')
  .description(
    'Return raw source + wiki structure in one call (token-efficient)',
  )
  .argument('<id>', 'Source ID')
  .action(async (id: string) => {
    const { wikiPath } = config;

    // Get raw source
    const rawPath = join(wikiPath, '.system', 'sources', 'raw', `${id}.json`);
    let raw: SourceData;
    try {
      raw = JSON.parse(await readFile(rawPath, 'utf-8')) as SourceData;
    } catch {
      console.error(chalk.red(`Source not found: ${id}`));
      process.exit(1);
    }

    // Get wiki structure
    const [files, { tags, categories }, sources] = await Promise.all([
      readdir(wikiPath).catch(() => [] as string[]),
      readTags(wikiPath),
      readSources(wikiPath),
    ]);

    const pathToId = Object.fromEntries(
      Object.entries(sources).map(([sid, entry]) => [entry.docPath ?? '', sid]),
    );

    const docs = await Promise.all(
      files
        .filter(f => f.endsWith('.md'))
        .map(async file => {
          const fullPath = join(wikiPath, file);
          const sid = pathToId[fullPath];
          const title = file
            .replace(/\s\[[a-f0-9]+\]\.md$/, '')
            .replace(/\.md$/, '');
          const summary = await extractSummary(fullPath);
          return {
            title,
            path: file,
            processed: sid ? (sources[sid]?.processed ?? false) : false,
            summary,
          };
        }),
    );

    console.log(
      JSON.stringify({ raw, structure: { docs, tags, categories } }, null, 2),
    );
  });
