import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { readRegistry } from '../utils/registry';
import { readSources } from '../utils/system';
import type { SourceData } from '../types';
import type { VideoSource } from '../utils/url';

type UnprocessedItem = {
  id: string;
  title: string;
  source: VideoSource;
  createdAt: string;
};

type WikiStatus = {
  name: string;
  path: string;
  unprocessed: UnprocessedItem[];
  error?: string;
};

const getUnprocessed = async (wikiPath: string): Promise<UnprocessedItem[]> => {
  const rawDir = join(wikiPath, '.system', 'sources', 'raw');

  let files: string[];
  try {
    files = (await readdir(rawDir)).filter(f => f.endsWith('.json'));
  } catch {
    return [];
  }

  const sources = await readSources(wikiPath);

  const rows = await Promise.all(
    files.map(async file => {
      const id = file.replace('.json', '');
      if (sources[id]?.processed) return null;
      const raw = await readFile(join(rawDir, file), 'utf-8');
      const data = JSON.parse(raw) as SourceData;
      return {
        id: data.id,
        title: data.title,
        source: data.source,
        createdAt: data.createdAt,
      };
    }),
  );

  const items = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return items;
};

export const statusCommand = new Command('status')
  .description('Show unprocessed items across all registered wikis')
  .option('--short', 'Show only counts per wiki, no item titles')
  .option('--json', 'Output as JSON')
  .action(async (opts: { short?: boolean; json?: boolean }) => {
    const registry = await readRegistry();

    if (registry.wikis.length === 0) {
      if (opts.json) {
        console.log(JSON.stringify([]));
      } else {
        console.log(chalk.yellow('No wikis registered.'));
      }
      return;
    }

    const results: WikiStatus[] = await Promise.all(
      registry.wikis.map(async wiki => {
        const wikiPath = resolve(wiki.path);
        try {
          const unprocessed = await getUnprocessed(wikiPath);
          return { name: wiki.name, path: wikiPath, unprocessed };
        } catch (err) {
          return {
            name: wiki.name,
            path: wikiPath,
            unprocessed: [],
            error: String(err),
          };
        }
      }),
    );

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    const total = results.reduce((n, w) => n + w.unprocessed.length, 0);

    for (const wiki of results) {
      const count = wiki.unprocessed.length;
      const marker = count > 0 ? chalk.green('●') : chalk.dim('○');
      const countLabel =
        count > 0
          ? chalk.yellow(`${count} unprocessed`)
          : chalk.dim('0 unprocessed');

      console.log(`${marker} ${chalk.bold(wiki.name)}  ${countLabel}`);

      if (wiki.error) {
        console.log(`  ${chalk.red(`Error: ${wiki.error}`)}`);
      }

      if (!opts.short && count > 0) {
        for (const item of wiki.unprocessed) {
          const date = item.createdAt.slice(0, 10);
          console.log(
            `  ${chalk.dim('·')} ${chalk.cyan(`[${item.id.slice(0, 8)}]`)} ${item.title}  ${chalk.dim(date)}`,
          );
        }
      }
    }

    console.log();
    if (total === 0) {
      console.log(chalk.green('✓ All wikis are up to date.'));
    } else {
      console.log(
        chalk.yellow(
          `${total} item${total !== 1 ? 's' : ''} pending across all wikis.`,
        ),
      );
    }
  });
