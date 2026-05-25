import { Command } from 'commander';
import { readdir, copyFile, access, readFile } from 'fs/promises';
import { join, basename, extname, relative } from 'path';
import chalk from 'chalk';
import { resolveWikiConfig } from '../config';

const backupDir = (wikiPath: string, docPath: string): string => {
  const name = basename(docPath, extname(docPath));
  return join(wikiPath, '.system', 'backup', 'docs', name);
};

const resolveDocPath = (wikiPath: string, file: string): string =>
  join(wikiPath, file);

const listVersions = async (
  wikiPath: string,
  file: string,
): Promise<string[]> => {
  const dir = backupDir(wikiPath, file);
  try {
    const versions = await readdir(dir);
    return versions.sort().reverse(); // newest first
  } catch {
    return [];
  }
};

const listCommand = new Command('list')
  .description('List backup versions for a document')
  .argument(
    '<file>',
    'Document path relative to wiki root (e.g. "Folder/Doc.md")',
  )
  .option('--wiki <name>', 'Wiki to operate on')
  .option('--json', 'Output as JSON')
  .action(async (file: string, opts: { wiki?: string; json?: boolean }) => {
    const { wikiPath } = await resolveWikiConfig(opts.wiki);
    const versions = await listVersions(wikiPath, file);

    if (opts.json) {
      console.log(JSON.stringify({ file, versions }));
      return;
    }

    if (versions.length === 0) {
      console.log(chalk.yellow(`No backups found for: ${file}`));
      return;
    }

    console.log(chalk.bold(`\nBackups for ${file}:`));
    versions.forEach((v, i) => {
      const label = i === 0 ? chalk.green(' (latest)') : '';
      console.log(`  ${chalk.cyan(v)}${label}`);
    });
    console.log();
  });

const getCommand = new Command('get')
  .description('Read the content of a backup version')
  .argument(
    '<file>',
    'Document path relative to wiki root (e.g. "Folder/Doc.md")',
  )
  .argument('[version]', 'Version filename to read (omit to read the latest)')
  .option('--wiki <name>', 'Wiki to operate on')
  .option('--json', 'Output as JSON')
  .action(
    async (
      file: string,
      version: string | undefined,
      opts: { wiki?: string; json?: boolean },
    ) => {
      const { wikiPath } = await resolveWikiConfig(opts.wiki);
      const versions = await listVersions(wikiPath, file);

      if (versions.length === 0) {
        const msg = `No backups found for: ${file}`;
        if (opts.json) {
          console.log(JSON.stringify({ status: 'error', message: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const target = version ?? versions[0];

      if (!versions.includes(target!)) {
        const msg = `Version not found: ${target}. Available: ${versions.join(', ')}`;
        if (opts.json) {
          console.log(JSON.stringify({ status: 'error', message: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const src = join(backupDir(wikiPath, file), target!);
      const content = await readFile(src, 'utf-8');

      if (opts.json) {
        console.log(JSON.stringify({ file, version: target, content }));
      } else {
        console.log(chalk.bold(`\n── Backup: ${target} ──\n`));
        console.log(content);
      }
    },
  );

const restoreCommand = new Command('restore')
  .description('Restore a backup version of a document')
  .argument(
    '<file>',
    'Document path relative to wiki root (e.g. "Folder/Doc.md")',
  )
  .argument(
    '[version]',
    'Version filename to restore (omit to restore the latest)',
  )
  .option('--wiki <name>', 'Wiki to operate on')
  .option('--json', 'Output as JSON')
  .action(
    async (
      file: string,
      version: string | undefined,
      opts: { wiki?: string; json?: boolean },
    ) => {
      const { wikiPath } = await resolveWikiConfig(opts.wiki);
      const versions = await listVersions(wikiPath, file);

      if (versions.length === 0) {
        const msg = `No backups found for: ${file}`;
        if (opts.json) {
          console.log(JSON.stringify({ status: 'error', message: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const target = version ?? versions[0];

      if (!versions.includes(target!)) {
        const msg = `Version not found: ${target}. Available: ${versions.join(', ')}`;
        if (opts.json) {
          console.log(JSON.stringify({ status: 'error', message: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const dir = backupDir(wikiPath, file);
      const src = join(dir, target!);
      const dest = resolveDocPath(wikiPath, file);

      try {
        await access(dest);
      } catch {
        const msg = `Target document not found: ${file}`;
        if (opts.json) {
          console.log(JSON.stringify({ status: 'error', message: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      await copyFile(src, dest);

      const restored = relative(wikiPath, dest);
      if (opts.json) {
        console.log(
          JSON.stringify({
            status: 'success',
            file: restored,
            version: target,
          }),
        );
      } else {
        console.log(chalk.green(`✓ Restored: ${restored}`));
        console.log(chalk.gray(`  From backup: ${target}`));
      }
    },
  );

export const backupCommand = new Command('backup')
  .description('Manage document backups')
  .addCommand(listCommand)
  .addCommand(getCommand)
  .addCommand(restoreCommand);
