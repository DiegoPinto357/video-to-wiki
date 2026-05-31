import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { readRegistry } from '../utils/registry';
import { readSources, readConfig } from '../utils/system';
import { sourceExists } from '../utils/wiki';
import { normalizeUrl } from '../utils/url';
import { generateId } from '../utils/id';
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
  type: 'knowledge' | 'recipe';
  pendingLinks: string[];
  unprocessed: UnprocessedItem[];
  error?: string;
};

const getPendingLinks = async (wikiPath: string): Promise<string[]> => {
  const linksFile = join(wikiPath, '_inbox', 'links.md');
  let raw: string;
  try {
    raw = await readFile(linksFile, 'utf-8');
  } catch {
    return [];
  }

  const urls = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('http'));

  const pending = await Promise.all(
    urls.map(async url => {
      try {
        const normalized = normalizeUrl(url);
        const id = generateId(normalized.url);
        const exists = await sourceExists(wikiPath, id);
        return exists ? null : normalized.url;
      } catch {
        return url; // unsupported/unknown URL — show it anyway
      }
    }),
  );

  return pending.filter((u): u is string => u !== null);
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
  .description(
    'Show pending inbox links and unprocessed sources across all wikis',
  )
  .option('--short', 'Show only counts per wiki, no item details')
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
          const [pendingLinks, unprocessed, config] = await Promise.all([
            getPendingLinks(wikiPath),
            getUnprocessed(wikiPath),
            readConfig(wikiPath),
          ]);
          const type = config.type ?? 'knowledge';
          return {
            name: wiki.name,
            path: wikiPath,
            type,
            pendingLinks,
            unprocessed,
          };
        } catch (err) {
          return {
            name: wiki.name,
            path: wikiPath,
            type: 'knowledge' as const,
            pendingLinks: [],
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

    const totalLinks = results.reduce((n, w) => n + w.pendingLinks.length, 0);
    const totalUnprocessed = results.reduce(
      (n, w) => n + w.unprocessed.length,
      0,
    );

    for (const wiki of results) {
      const hasAnything =
        wiki.pendingLinks.length > 0 || wiki.unprocessed.length > 0;
      const marker = hasAnything ? chalk.green('●') : chalk.dim('○');
      const typeLabel = wiki.type === 'recipe' ? chalk.dim(' (recipe)') : '';
      console.log(`${marker} ${chalk.bold(wiki.name)}${typeLabel}`);

      if (wiki.error) {
        console.log(`  ${chalk.red(`Error: ${wiki.error}`)}`);
        continue;
      }

      if (wiki.pendingLinks.length > 0) {
        console.log(
          `  ${chalk.magenta(`${wiki.pendingLinks.length} link${wiki.pendingLinks.length !== 1 ? 's' : ''} to ingest`)}`,
        );
        if (!opts.short) {
          for (const url of wiki.pendingLinks) {
            console.log(`  ${chalk.dim('·')} ${chalk.dim(url)}`);
          }
        }
      }

      if (wiki.unprocessed.length > 0) {
        console.log(
          `  ${chalk.yellow(`${wiki.unprocessed.length} source${wiki.unprocessed.length !== 1 ? 's' : ''} to process`)}`,
        );
        if (!opts.short) {
          for (const item of wiki.unprocessed) {
            const date = item.createdAt.slice(0, 10);
            console.log(
              `  ${chalk.dim('·')} ${chalk.cyan(`[${item.id.slice(0, 8)}]`)} ${item.title}  ${chalk.dim(date)}`,
            );
          }
        }
      }

      if (!hasAnything) {
        console.log(`  ${chalk.dim('up to date')}`);
      }
    }

    console.log();
    if (totalLinks === 0 && totalUnprocessed === 0) {
      console.log(chalk.green('✓ All wikis are up to date.'));
    } else {
      const parts: string[] = [];
      if (totalLinks > 0)
        parts.push(
          chalk.magenta(
            `${totalLinks} link${totalLinks !== 1 ? 's' : ''} to ingest`,
          ),
        );
      if (totalUnprocessed > 0)
        parts.push(
          chalk.yellow(
            `${totalUnprocessed} source${totalUnprocessed !== 1 ? 's' : ''} to process`,
          ),
        );
      console.log(parts.join(chalk.dim('  ·  ')));
    }
  });
