import { Command } from 'commander';
import { readFile, appendFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { normalizeUrl } from '../utils/url';
import { generateId } from '../utils/id';
import { sourceExists } from '../utils/vault';

export const addSourceCommand = new Command('add-source')
  .description('Add a URL directly to the inbox links file')
  .argument('<url>', 'Video URL to add')
  .action(async (url: string) => {
    const { vaultPath } = config;
    const linksFile = join(vaultPath, 'Inbox', 'links.md');

    let normalized: ReturnType<typeof normalizeUrl>;
    try {
      normalized = normalizeUrl(url);
    } catch {
      console.error(chalk.red(`Unsupported URL: ${url}`));
      process.exit(1);
    }

    const id = generateId(normalized.url);

    if (await sourceExists(vaultPath, id)) {
      console.log(chalk.yellow(`↷ Already ingested: ${normalized.url}`));
      return;
    }

    // Check if URL is already in links.md
    try {
      await access(linksFile);
      const existing = await readFile(linksFile, 'utf-8');
      if (existing.includes(normalized.url)) {
        console.log(chalk.yellow(`↷ Already in inbox: ${normalized.url}`));
        return;
      }
    } catch {
      // file doesn't exist yet, will be created by append
    }

    await appendFile(linksFile, `\n${normalized.url}\n`, 'utf-8');
    console.log(chalk.green(`✓ Added to inbox: ${normalized.url}`));
    console.log(chalk.gray('  Run ingestion to process it.'));
  });
