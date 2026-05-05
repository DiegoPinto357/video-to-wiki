import { Command } from 'commander';
import { readdir } from 'fs/promises';
import chalk from 'chalk';
import { config } from '../config';
import { readTags, readSources } from '../utils/system';

type WikiStructure = {
  docs: Array<{ title: string; path: string; processed: boolean }>;
  tags: string[];
  categories: string[];
};

export const listStructureCommand = new Command('list-structure')
  .description('Output current wiki structure as JSON (for AI context)')
  .option('--pretty', 'Pretty-print the JSON output')
  .action(async (opts: { pretty?: boolean }) => {
    const { wikiPath } = config;

    const [files, { tags, categories }, sources] = await Promise.all([
      readdir(wikiPath).catch(() => [] as string[]),
      readTags(wikiPath),
      readSources(wikiPath),
    ]);

    const docFiles = files.filter(f => f.endsWith('.md'));

    // Build a reverse map: docPath → id
    const pathToId = Object.fromEntries(
      Object.entries(sources).map(([id, entry]) => [entry.docPath ?? '', id]),
    );

    const docs = docFiles.map(file => {
      const fullPath = `${wikiPath}/${file}`;
      const id = pathToId[fullPath];
      const title = file
        .replace(/\s\[[a-f0-9]+\]\.md$/, '')
        .replace(/\.md$/, '');
      return {
        title,
        path: file,
        processed: id ? (sources[id]?.processed ?? false) : false,
      };
    });

    const structure: WikiStructure = { docs, tags, categories };

    const output = opts.pretty
      ? JSON.stringify(structure, null, 2)
      : JSON.stringify(structure);

    console.log(output);
  });
