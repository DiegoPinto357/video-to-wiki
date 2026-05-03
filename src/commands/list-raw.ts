import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { readSources } from '../utils/system';
import type { SourceData } from '../types';

export const listRawCommand = new Command('list-raw')
  .description('List all ingested raw sources')
  .action(async () => {
    const { vaultPath } = config;
    const rawDir = join(vaultPath, '.system', 'sources', 'raw');

    let files: string[];
    try {
      files = (await readdir(rawDir)).filter(f => f.endsWith('.json'));
    } catch {
      console.log(chalk.yellow('No sources found. Run ingestion first.'));
      return;
    }

    if (files.length === 0) {
      console.log(chalk.yellow('No sources ingested yet.'));
      return;
    }

    const sources = await readSources(vaultPath);

    const rows = await Promise.all(
      files.map(async file => {
        const id = file.replace('.json', '');
        const raw = await readFile(join(rawDir, file), 'utf-8');
        const data = JSON.parse(raw) as SourceData;
        const entry = sources[id];
        return {
          id,
          data,
          processed: entry?.processed ?? false,
          docPath: entry?.docPath,
        };
      }),
    );

    rows.sort((a, b) => a.data.createdAt.localeCompare(b.data.createdAt));

    console.log(chalk.bold(`\n${rows.length} source(s) ingested:\n`));

    for (const { id, data, processed, docPath } of rows) {
      const sourceLabel =
        data.source === 'youtube' ? chalk.red('YT') : chalk.magenta('IG');
      const date = new Date(data.createdAt).toLocaleDateString();
      const status = processed
        ? chalk.green(`✓ ${docPath ?? 'processed'}`)
        : chalk.gray('○ not processed');

      console.log(`  ${sourceLabel} ${chalk.white(data.title)}`);
      console.log(`     ${chalk.gray(id)} · ${date} · ${status}`);
      console.log(`     ${chalk.gray(data.url)}`);
      console.log();
    }
  });
