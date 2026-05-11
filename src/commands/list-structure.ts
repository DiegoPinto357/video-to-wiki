import { Command } from 'commander';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { resolveWikiConfig } from '../config';
import { readTags } from '../utils/system';
import { extractSummary } from '../utils/doc-summary';

type WikiStructure = {
  docs: Array<{
    title: string;
    path: string;
    summary: string;
  }>;
  tags: string[];
  categories: string[];
};

export const listStructureCommand = new Command('list-structure')
  .description('Output current wiki structure as JSON (for AI context)')
  .option('--pretty', 'Pretty-print the JSON output')
  .action(async (opts: { pretty?: boolean }) => {
    const { wikiPath } = await resolveWikiConfig();

    const [files, { tags, categories }] = await Promise.all([
      readdir(wikiPath).catch(() => [] as string[]),
      readTags(wikiPath),
    ]);

    const docFiles = files.filter(f => f.endsWith('.md'));

    const docs = await Promise.all(
      docFiles.map(async file => {
        const fullPath = join(wikiPath, file);
        const title = file
          .replace(/\s\[[a-f0-9]+\]\.md$/, '')
          .replace(/\.md$/, '');
        const summary = await extractSummary(fullPath);
        return { title, path: file, summary };
      }),
    );

    const structure: WikiStructure = { docs, tags, categories };

    const output = opts.pretty
      ? JSON.stringify(structure, null, 2)
      : JSON.stringify(structure);

    console.log(output);
  });
