import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { readTags, addTag, removeTag } from '../utils/system';

type Frontmatter = { tags?: string[] };

const parseFrontmatterTags = (content: string): string[] => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  const tagsLine = match[1].match(/^tags:\s*\[([^\]]*)\]/m);
  if (!tagsLine) return [];
  return tagsLine[1]
    .split(',')
    .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
};

const listCommand = new Command('list')
  .description('List all defined tags')
  .action(async () => {
    const { wikiPath } = config;
    const { categories, tags } = await readTags(wikiPath);

    if (categories.length === 0 && tags.length === 0) {
      console.log(
        chalk.yellow(
          'No tags defined yet. Edit vault/.system/tags.json to add them.',
        ),
      );
      return;
    }

    if (categories.length > 0) {
      console.log(chalk.bold('\nCategories:'));
      categories.forEach(c => console.log(`  ${chalk.cyan(c)}`));
    }

    if (tags.length > 0) {
      console.log(chalk.bold('\nTags:'));
      tags.forEach(t => console.log(`  ${chalk.white(t)}`));
    }
    console.log();
  });

const validateCommand = new Command('validate')
  .description('Check that all docs only use tags defined in tags.json')
  .action(async () => {
    const { wikiPath } = config;
    const { tags, categories } = await readTags(wikiPath);
    const defined = new Set([...tags, ...categories]);
    const docsDir = wikiPath;

    let files: string[];
    try {
      files = (await readdir(docsDir)).filter(f => f.endsWith('.md'));
    } catch {
      console.log(chalk.yellow('No docs found.'));
      return;
    }

    let issues = 0;

    for (const file of files) {
      const content = await readFile(join(docsDir, file), 'utf-8');
      const docTags = parseFrontmatterTags(content);
      const unknown = docTags.filter(t => defined.size > 0 && !defined.has(t));

      if (unknown.length > 0) {
        console.log(chalk.red(`✗ ${file}`));
        unknown.forEach(t => console.log(`   Unknown tag: ${chalk.yellow(t)}`));
        issues++;
      }
    }

    if (issues === 0) {
      console.log(
        chalk.green(`✓ All tags valid across ${files.length} doc(s).`),
      );
    } else {
      console.log(chalk.red(`\n${issues} file(s) with unknown tags.`));
    }
  });

const addCommand = new Command('add')
  .description('Add one or more tags or categories to tags.json')
  .argument('<tags...>', 'Tag name(s) to add')
  .option('--category', 'Add as categories instead of tags')
  .action(async (tags: string[], opts: { category?: boolean }) => {
    const { wikiPath } = config;
    const type = opts.category ? 'category' : 'tag';
    await addTag(wikiPath, tags, type);
    console.log(JSON.stringify({ status: 'success', type, tags }));
  });

const removeCommand = new Command('remove')
  .description('Remove a tag or category from tags.json')
  .argument('<tag>', 'Tag name to remove')
  .option('--category', 'Remove from categories instead of tags')
  .action(async (tag: string, opts: { category?: boolean }) => {
    const { wikiPath } = config;
    const type = opts.category ? 'category' : 'tag';
    await removeTag(wikiPath, tag, type);
    console.log(JSON.stringify({ status: 'success', type, tag }));
  });

export const tagsCommand = new Command('tags')
  .description('Manage wiki tags')
  .addCommand(listCommand)
  .addCommand(validateCommand)
  .addCommand(addCommand)
  .addCommand(removeCommand);
