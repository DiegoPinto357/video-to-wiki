import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { normalizeUrl } from '../utils/url';
import { generateId } from '../utils/id';
import { ensureVaultDirs, sourceExists, saveSource } from '../utils/vault';
import { markSourceIngested } from '../utils/system';
import { fetchYouTube } from '../providers/youtube';

export const ingestCommand = new Command('ingest')
  .description('Ingest video links from $VAULT_PATH/Inbox/links.txt')
  .action(async () => {
    const { vaultPath } = config;
    const linksFile = join(vaultPath, 'Inbox', 'links.md');

    await ensureVaultDirs(vaultPath);

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

      if (await sourceExists(vaultPath, id)) {
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
        } else {
          throw new Error(`Provider not yet implemented: ${normalized.source}`);
        }

        await saveSource(vaultPath, data);
        await markSourceIngested(vaultPath, data.id);
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
  });
