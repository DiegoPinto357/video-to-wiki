import { Command } from 'commander';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';
import { normalizeUrl } from '../utils/url';
import { generateId } from '../utils/id';
import { ensureWikiDirs, sourceExists, saveSource } from '../utils/wiki';
import { markSourceIngested } from '../utils/system';
import { fetchYouTube } from '../providers/youtube';
import {
  fetchInstagram,
  instagramCookiesPath,
  InstagramAuthError,
} from '../providers/instagram';
import { runInstagramAuth } from './auth';

export const runIngest = async (wikiFlag?: string): Promise<void> => {
  const { wikiPath } = await resolveWikiConfig(wikiFlag);
  const linksFile = join(wikiPath, '_inbox', 'links.md');

  await ensureWikiDirs(wikiPath);

  let raw: string;
  try {
    raw = await readFile(linksFile, 'utf-8');
  } catch {
    console.error(chalk.red(`Links file not found: ${linksFile}`));
    process.exit(1);
  }

  const urls = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('http'));

  if (urls.length === 0) {
    console.log(chalk.yellow('No URLs found in links.md'));
    return;
  }

  // Auto-auth Instagram if needed
  const hasInstagram = urls.some(url => {
    try {
      return normalizeUrl(url).source === 'instagram';
    } catch {
      return false;
    }
  });

  if (hasInstagram) {
    const cookiesExist = await access(instagramCookiesPath())
      .then(() => true)
      .catch(() => false);
    if (!cookiesExist) {
      console.log(
        chalk.yellow('Instagram links detected — authentication required.\n'),
      );
      await runInstagramAuth();
    }
  }

  console.log(
    chalk.cyan(`Found ${urls.length} URL(s). Starting ingestion...\n`),
  );

  let skipped = 0;
  let success = 0;
  let failed = 0;

  for (const url of urls) {
    let normalized: ReturnType<typeof normalizeUrl>;

    try {
      normalized = normalizeUrl(url);
    } catch {
      console.log(chalk.red(`✗ Unsupported URL: ${url}`));
      failed++;
      continue;
    }

    const id = generateId(normalized.url);

    if (await sourceExists(wikiPath, id)) {
      console.log(
        chalk.gray(`↷ Skipping (already ingested): ${normalized.url}`),
      );
      skipped++;
      continue;
    }

    console.log(chalk.blue(`↓ Ingesting: ${normalized.url}`));

    try {
      let data;

      if (normalized.source === 'youtube') {
        data = await fetchYouTube(id, normalized.url);
      } else if (normalized.source === 'instagram') {
        try {
          data = await fetchInstagram(id, normalized.url);
        } catch (err) {
          if (err instanceof InstagramAuthError) {
            console.log(
              chalk.yellow('\n  Session expired — re-authenticating...'),
            );
            await runInstagramAuth();
            data = await fetchInstagram(id, normalized.url);
          } else {
            throw err;
          }
        }
      } else {
        throw new Error(`Provider not yet implemented: ${normalized.source}`);
      }

      await saveSource(wikiPath, data);
      await markSourceIngested(wikiPath, data.id);
      console.log(chalk.green(`✓ Saved: ${data.title}`));
      success++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`✗ Failed: ${url}\n  ${message}`));
      failed++;
    }
  }

  console.log(
    `\nDone. ${chalk.green(`${success} ingested`)}, ${chalk.gray(`${skipped} skipped`)}, ${chalk.red(`${failed} failed`)}.`,
  );
};

export const ingestCommand = new Command('ingest')
  .description('Ingest video links from $WIKI_PATH/_inbox/links.md')
  .option('--wiki <name>', 'Wiki to operate on')
  .action(async (opts: { wiki?: string }) => runIngest(opts.wiki));
