import { Command } from 'commander';
import { resolve } from 'path';
import { mkdir } from 'fs/promises';
import chalk from 'chalk';
import {
  readRegistry,
  saveRegistry,
  resolveWiki,
  profileDir,
} from '../utils/registry';
import {
  initSystemFiles,
  readConfig,
  setConfigField,
  patchConfig,
} from '../utils/system';

const listCommand = new Command('list')
  .description('List all registered wikis')
  .action(async () => {
    const registry = await readRegistry();
    if (registry.wikis.length === 0) {
      console.log(chalk.yellow('No wikis registered.'));
      console.log('  Add one: npm run dev -- wiki add <path> --name <name>');
      return;
    }
    console.log('Registered wikis:\n');
    for (const w of registry.wikis) {
      const active = w.name === registry.activeWiki;
      const marker = active ? chalk.green('● ') : '  ';
      console.log(`${marker}${chalk.bold(w.name)}`);
      console.log(`    ${chalk.dim(w.path)}`);
    }
  });

const addCommand = new Command('add')
  .description('Register a wiki by path')
  .argument('<path>', 'Absolute or relative path to the wiki folder')
  .option('--name <name>', 'Name to identify the wiki')
  .action(async (rawPath: string, opts: { name?: string }) => {
    const wikiPath = resolve(rawPath);
    await mkdir(wikiPath, { recursive: true });

    const registry = await readRegistry();
    const existingByPath = registry.wikis.find(
      w => resolve(w.path) === wikiPath,
    );
    if (existingByPath) {
      console.log(
        chalk.yellow(
          `Wiki at "${wikiPath}" is already registered as "${existingByPath.name}".`,
        ),
      );
      return;
    }

    let name = opts.name;
    if (!name) {
      try {
        const cfg = await readConfig(wikiPath);
        if (cfg.name) name = cfg.name;
      } catch {
        /* ignore */
      }
    }
    if (!name) {
      console.error(chalk.red('Provide a name with --name <name>.'));
      process.exit(1);
    }

    if (registry.wikis.find(w => w.name === name)) {
      console.error(
        chalk.red(
          `A wiki named "${name}" already exists. Choose a different name.`,
        ),
      );
      process.exit(1);
    }

    registry.wikis.push({ name, path: wikiPath });
    if (!registry.activeWiki) registry.activeWiki = name;
    await saveRegistry(registry);

    console.log(chalk.green(`✓ Registered wiki "${name}" at ${wikiPath}`));
    if (registry.activeWiki === name) {
      console.log(chalk.dim('  Set as active wiki.'));
    }
  });

const initCommand = new Command('init')
  .description('Initialize .system/ files for a registered wiki')
  .argument('<name>', 'Name of the registered wiki to initialize')
  .option('--description <text>', 'Wiki description')
  .option('--language <lang>', 'Content language (e.g. pt-BR, en-US)')
  .option('--wiki-context <text>', 'AI context hint for the wiki')
  .action(
    async (
      name: string,
      opts: { description?: string; language?: string; wikiContext?: string },
    ) => {
      const result = await resolveWiki(name);
      if (!result.ok) {
        console.error(chalk.red(result.error));
        process.exit(1);
      }

      const { path: wikiPath } = result.wiki;
      await initSystemFiles(wikiPath);

      const fields: Record<string, string> = { name };
      if (opts.description) fields.description = opts.description;
      if (opts.language) fields.language = opts.language;
      if (opts.wikiContext) fields.wikiContext = opts.wikiContext;

      await patchConfig(wikiPath, fields);

      console.log(
        chalk.green(
          `✓ Initialized .system/ files for wiki "${name}" at ${wikiPath}`,
        ),
      );
      console.log(chalk.dim(`  Profile dir: ${profileDir}`));
    },
  );

const removeCommand = new Command('remove')
  .description('Unregister a wiki')
  .argument('<name>', 'Name of the wiki to remove')
  .action(async (name: string) => {
    const registry = await readRegistry();
    const idx = registry.wikis.findIndex(w => w.name === name);
    if (idx === -1) {
      console.error(chalk.red(`Wiki "${name}" not found.`));
      process.exit(1);
    }
    registry.wikis.splice(idx, 1);
    if (registry.activeWiki === name) {
      registry.activeWiki = registry.wikis[0]?.name ?? null;
    }
    await saveRegistry(registry);
    console.log(chalk.green(`✓ Removed wiki "${name}".`));
  });

const useCommand = new Command('use')
  .description('Set the active wiki')
  .argument('<name>', 'Name of the wiki to activate')
  .action(async (name: string) => {
    const registry = await readRegistry();
    if (!registry.wikis.find(w => w.name === name)) {
      const names = registry.wikis.map(w => w.name).join(', ');
      console.error(
        chalk.red(`Wiki "${name}" not found. Registered: ${names}`),
      );
      process.exit(1);
    }
    registry.activeWiki = name;
    await saveRegistry(registry);
    console.log(chalk.green(`✓ Active wiki set to "${name}".`));
  });

const recoverCommand = new Command('recover')
  .description(
    'Re-register a wiki from its own .system/config.json (use if registry was lost)',
  )
  .argument('<path>', 'Path to the wiki folder')
  .action(async (rawPath: string) => {
    const wikiPath = resolve(rawPath);
    let cfg;
    try {
      cfg = await readConfig(wikiPath);
    } catch {
      console.error(
        chalk.red(`Cannot read .system/config.json in "${wikiPath}".`),
      );
      process.exit(1);
    }

    if (!cfg.name) {
      console.error(
        chalk.red(
          'config.json has no "name" field. Set it first with: wiki config set name <name>',
        ),
      );
      process.exit(1);
    }

    const registry = await readRegistry();
    const existing = registry.wikis.find(w => w.name === cfg.name);
    if (existing) {
      existing.path = wikiPath;
      console.log(
        chalk.yellow(
          `Wiki "${cfg.name}" already registered — path updated to ${wikiPath}.`,
        ),
      );
    } else {
      registry.wikis.push({ name: cfg.name, path: wikiPath });
      console.log(
        chalk.green(`✓ Recovered and registered wiki "${cfg.name}".`),
      );
    }
    await saveRegistry(registry);
  });

const configSetCommand = new Command('set')
  .description('Set a config field for the active wiki')
  .argument('<key>', 'Config key (name, description, language, wikiContext)')
  .argument('<value>', 'Value to set')
  .option('--wiki <name>', 'Target wiki name')
  .action(async (key: string, value: string, opts: { wiki?: string }) => {
    const result = await resolveWiki(opts.wiki);
    if (!result.ok) {
      console.error(chalk.red(result.error));
      process.exit(1);
    }
    await setConfigField(result.wiki.path, key, value);
    console.log(
      chalk.green(
        `✓ Set "${key}" = "${value}" for wiki "${result.wiki.name}".`,
      ),
    );
  });

const configCommand = new Command('config')
  .description('Show or update wiki configuration')
  .option('--wiki <name>', 'Target wiki name')
  .action(async (opts: { wiki?: string }) => {
    const result = await resolveWiki(opts.wiki);
    if (!result.ok) {
      console.error(chalk.red(result.error));
      process.exit(1);
    }
    const cfg = await readConfig(result.wiki.path);
    console.log(JSON.stringify(cfg, null, 2));
  })
  .addCommand(configSetCommand);

export const wikiCommand = new Command('wiki')
  .description('Manage registered wikis')
  .addCommand(listCommand)
  .addCommand(addCommand)
  .addCommand(initCommand)
  .addCommand(removeCommand)
  .addCommand(useCommand)
  .addCommand(recoverCommand)
  .addCommand(configCommand);
