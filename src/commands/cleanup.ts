import { Command } from 'commander';
import { readFile, writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';
import { readSources } from '../utils/system';
import { normalizeUrl } from '../utils/url';
import { generateId } from '../utils/id';

export const cleanupCommand = new Command('cleanup')
  .description(
    'Clean up ingested inbox links and raw files for processed sources',
  )
  .option('--dry-run', 'Show what would be removed without making changes')
  .action(async (opts: { dryRun?: boolean }) => {
    const { wikiPath } = await resolveWikiConfig();
    const dryRun = !!opts.dryRun;

    if (dryRun) {
      console.log(chalk.yellow('Dry run — no changes will be made.\n'));
    }

    const sources = await readSources(wikiPath);
    const ingestedIds = new Set(Object.keys(sources));
    const processedIds = new Set(
      Object.entries(sources)
        .filter(([, entry]) => entry.processed)
        .map(([id]) => id),
    );

    // ── Level 1: Inbox cleanup ──────────────────────────────────────────────
    const linksFile = join(wikiPath, '_inbox', 'links.md');
    let inboxCleaned = 0;

    try {
      const raw = await readFile(linksFile, 'utf-8');
      const lines = raw.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('http')) return true; // keep non-URL lines
        try {
          const { url: normalized } = normalizeUrl(trimmed);
          const id = generateId(normalized);
          if (ingestedIds.has(id)) {
            console.log(chalk.gray(`  inbox remove: ${trimmed}`));
            inboxCleaned++;
            return false;
          }
        } catch {
          // unparseable URL — keep it
        }
        return true;
      });

      if (inboxCleaned > 0) {
        if (!dryRun) {
          await writeFile(linksFile, filteredLines.join('\n'), 'utf-8');
        }
        console.log(
          chalk.green(
            `✓ Inbox: removed ${inboxCleaned} already-ingested URL(s)`,
          ),
        );
      } else {
        console.log(chalk.gray('  Inbox: nothing to clean'));
      }
    } catch {
      console.log(chalk.yellow('  Inbox: links.md not found, skipping'));
    }

    // ── Level 2: Raw file cleanup ───────────────────────────────────────────
    let rawCleaned = 0;

    for (const id of processedIds) {
      const rawPath = join(wikiPath, '.system', 'sources', 'raw', `${id}.json`);
      try {
        await access(rawPath);
        console.log(chalk.gray(`  raw remove: ${id}.json`));
        if (!dryRun) await unlink(rawPath);
        rawCleaned++;
      } catch {
        // file already gone — skip
      }
    }

    if (rawCleaned > 0) {
      console.log(
        chalk.green(`✓ Raw: removed ${rawCleaned} processed source file(s)`),
      );
    } else {
      console.log(chalk.gray('  Raw: nothing to clean'));
    }

    if (dryRun) {
      console.log(
        chalk.yellow(
          `\nDry run complete. Run without --dry-run to apply changes.`,
        ),
      );
    }
  });
