import { Command } from 'commander';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';
import { readSources, markSourceProcessed } from '../utils/system';

export const markProcessedCommand = new Command('mark-processed')
  .description('Mark a source as processed')
  .argument('<id>', 'Source ID')
  .action(async (id: string) => {
    const { wikiPath } = await resolveWikiConfig();

    const sources = await readSources(wikiPath);
    if (!sources[id]) {
      console.error(chalk.red(`Source not found: ${id}`));
      process.exit(1);
    }

    // Idempotent: if already processed, return success
    await markSourceProcessed(wikiPath, id);

    console.log(JSON.stringify({ status: 'success' }));
  });
