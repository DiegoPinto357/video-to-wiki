import { Command } from 'commander';
import { join } from 'path';
import { resolveWikiConfig } from '../config';
import { readTags } from '../utils/system';
import { extractSummary } from '../utils/doc-summary';
import { findMarkdownFiles } from '../utils/wiki';

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
  .option('--wiki <name>', 'Wiki to operate on')
  .action(async (opts: { pretty?: boolean; wiki?: string }) => {
    const { wikiPath } = await resolveWikiConfig(opts.wiki);

    const [files, { tags, categories }] = await Promise.all([
      findMarkdownFiles(wikiPath),
      readTags(wikiPath),
    ]);

    const docFiles = files;

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
