import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { readSources, markSourceProcessed } from '../utils/system';
import type { SourceData } from '../types';

export const buildDoc = (data: SourceData): string => {
  const date = new Date(data.createdAt).toISOString().split('T')[0];
  const frontmatter = [
    '---',
    `title: "${data.title.replace(/"/g, "'")}"`,
    `source: ${data.source}`,
    `url: ${data.url}`,
    `date: ${date}`,
    `tags: []`,
    `processed: false`,
    '---',
  ].join('\n');

  const body = [
    `# ${data.title}`,
    '',
    '## Description',
    '',
    data.description || '_No description available._',
    '',
    '## Transcript',
    '',
    data.transcript || '_No transcript available._',
  ].join('\n');

  return `${frontmatter}\n\n${body}\n`;
};

export const docPath = (
  wikiPath: string,
  title: string,
  id: string,
): string => {
  const safe = title
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return join(wikiPath, `${safe} [${id.slice(0, 8)}].md`);
};

export const writeDocCommand = new Command('write-doc')
  .description('Create an Obsidian doc from a raw source')
  .argument('[id]', 'Source ID (omit to process all unprocessed sources)')
  .action(async (id?: string) => {
    const { wikiPath } = config;
    const sources = await readSources(wikiPath);
    const rawDir = join(wikiPath, '.system', 'sources', 'raw');

    const toProcess = id
      ? [id]
      : Object.entries(sources)
          .filter(([, entry]) => !entry.processed)
          .map(([sourceId]) => sourceId);

    if (toProcess.length === 0) {
      console.log(chalk.yellow('No unprocessed sources found.'));
      return;
    }

    for (const sourceId of toProcess) {
      const rawPath = join(rawDir, `${sourceId}.json`);

      try {
        await access(rawPath);
      } catch {
        console.log(chalk.red(`✗ Source not found: ${sourceId}`));
        continue;
      }

      const data = JSON.parse(await readFile(rawPath, 'utf-8')) as SourceData;
      const outPath = docPath(wikiPath, data.title, sourceId);

      try {
        await access(outPath);
        console.log(chalk.yellow(`↷ Already exists: ${outPath}`));
        continue;
      } catch {
        // doesn't exist yet — proceed
      }

      await writeFile(outPath, buildDoc(data), 'utf-8');
      await markSourceProcessed(wikiPath, sourceId, outPath);
      console.log(chalk.green(`✓ Written: ${outPath}`));
    }
  });
