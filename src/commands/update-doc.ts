import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';
import { readSources, markSourceProcessed } from '../utils/system';
import { backupFile } from '../utils/backup';
import { buildDoc, docPath } from './write-doc';
import type { SourceData } from '../types';

export const updateDocCommand = new Command('update-doc')
  .description(
    'Regenerate a doc from its raw source (backs up the existing file first)',
  )
  .argument('[id]', 'Source ID (omit to update all processed sources)')
  .option('--wiki <name>', 'Wiki to operate on')
  .action(async (id?: string, opts: { wiki?: string } = {}) => {
    const { wikiPath } = await resolveWikiConfig(opts.wiki);
    const sources = await readSources(wikiPath);
    const rawDir = join(wikiPath, '.system', 'sources', 'raw');

    const toUpdate = id
      ? [id]
      : Object.entries(sources)
          .filter(([, entry]) => entry.processed)
          .map(([sourceId]) => sourceId);

    if (toUpdate.length === 0) {
      console.log(chalk.yellow('No processed sources found.'));
      return;
    }

    for (const sourceId of toUpdate) {
      const rawPath = join(rawDir, `${sourceId}.json`);

      try {
        await access(rawPath);
      } catch {
        console.log(chalk.red(`✗ Raw source not found: ${sourceId}`));
        continue;
      }

      const data = JSON.parse(await readFile(rawPath, 'utf-8')) as SourceData;
      const outPath = docPath(wikiPath, data.title, sourceId);

      await backupFile(wikiPath, outPath);
      await writeFile(outPath, buildDoc(data), 'utf-8');
      await markSourceProcessed(wikiPath, sourceId);
      console.log(chalk.green(`✓ Updated: ${outPath}`));
    }
  });
