import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';
import { readTags } from '../utils/system';
import type { SourceData } from '../types';
import { extractSummary } from '../utils/doc-summary';
import { findMarkdownFiles } from '../utils/wiki';

export const aiContextCommand = new Command('ai-context')
  .description(
    'Return raw source + wiki structure in one call (token-efficient)',
  )
  .argument('<id>', 'Source ID')
  .option('--wiki <name>', 'Wiki to operate on')
  .action(async (id: string, opts: { wiki?: string }) => {
    const { wikiPath, wikiContext } = await resolveWikiConfig(opts.wiki);

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
    const [files, { tags, categories }] = await Promise.all([
      findMarkdownFiles(wikiPath),
      readTags(wikiPath),
    ]);

    const docs = await Promise.all(
      files.map(async file => {
        const fullPath = join(wikiPath, file);
        const title = file
          .replace(/\s\[[a-f0-9]+\]\.md$/, '')
          .replace(/\.md$/, '');
        const summary = await extractSummary(fullPath);
        return { title, path: file, summary };
      }),
    );

    console.log(
      JSON.stringify(
        {
          raw,
          structure: { docs, tags, categories },
          ...(wikiContext ? { wikiContext } : {}),
        },
        null,
        2,
      ),
    );
  });
