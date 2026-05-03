import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { readSources, markSourceProcessed } from '../utils/system';
import { backupFile } from '../utils/backup';
import { buildDoc, docPath } from './write-doc';
import type { SourceData } from '../types';

export const updateDocCommand = new Command('update-doc')
  .description(
    'Regenerate a doc from its raw source (backs up the existing file first)',
  )
  .argument('[id]', 'Source ID (omit to update all processed sources)')
  .action(async (id?: string) => {
    const { vaultPath } = config;
    const sources = await readSources(vaultPath);
    const rawDir = join(vaultPath, '.system', 'sources', 'raw');

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
      const outPath = docPath(vaultPath, data.title, sourceId);

      await backupFile(vaultPath, outPath);
      await writeFile(outPath, buildDoc(data), 'utf-8');
      await markSourceProcessed(vaultPath, sourceId, outPath);
      console.log(chalk.green(`✓ Updated: ${outPath}`));
    }
  });
