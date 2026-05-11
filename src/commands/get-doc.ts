import { Command } from 'commander';
import { readFile, access } from 'fs/promises';
import { join, basename } from 'path';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';

type DocSource = { title: string; url: string };

const parseSources = (content: string): DocSource[] => {
  const match = content.match(/##\s+Sources\s*\n([\s\S]*?)(?:\n##|$)/);
  if (!match) return [];
  const section = match[1];
  const sources: DocSource[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(section)) !== null) {
    sources.push({ title: m[1], url: m[2] });
  }
  return sources;
};

const stripFrontmatter = (content: string): string => {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('---', 3);
  return end === -1 ? content : content.slice(end + 3).trimStart();
};

export const getDocCommand = new Command('get-doc')
  .description('Return full content and metadata for a wiki document')
  .argument('<file>', 'Document filename (e.g. "My Doc.md")')
  .option('--wiki <name>', 'Wiki to operate on')
  .action(async (file: string, opts: { wiki?: string }) => {
    const { wikiPath } = await resolveWikiConfig(opts.wiki);
    const filePath = join(wikiPath, file);

    try {
      await access(filePath);
    } catch {
      console.error(chalk.red(`Document not found: ${file}`));
      process.exit(1);
    }

    const content = await readFile(filePath, 'utf-8');
    const name = basename(file, '.md');
    const title = name.replace(/\s\[[a-f0-9]+\]$/, '');
    const sources = parseSources(content);

    console.log(JSON.stringify({ title, content, sources }, null, 2));
  });
