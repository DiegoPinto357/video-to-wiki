import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import type { SourceData } from '../types';

export const getRawCommand = new Command('get-raw')
  .description('Return full raw content for a source by ID')
  .argument('<id>', 'Source ID')
  .action(async (id: string) => {
    const { wikiPath } = config;
    const filePath = join(wikiPath, '.system', 'sources', 'raw', `${id}.json`);

    let data: SourceData;
    try {
      const raw = await readFile(filePath, 'utf-8');
      data = JSON.parse(raw) as SourceData;
    } catch {
      console.error(chalk.red(`Source not found: ${id}`));
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  });
