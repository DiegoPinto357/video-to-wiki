import { Command } from 'commander';
import chalk from 'chalk';

export const ingestCommand = new Command('ingest')
  .description('Ingest video links from a file into the vault')
  .argument('<links-file>', 'path to the links file')
  .action(async (linksFile: string) => {
    console.log(chalk.yellow('ingest command not yet implemented'), linksFile);
  });
