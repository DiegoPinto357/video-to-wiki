#!/usr/bin/env node
import './config';
import { Command } from 'commander';
import { ingestCommand, runIngest } from './commands/ingest';
import { authCommand } from './commands/auth';

const program = new Command();

program
  .name('app')
  .description('Video Knowledge Ingestion CLI')
  .version('1.0.0');

program.addCommand(ingestCommand);
program.addCommand(authCommand);

program.action(runIngest);

program.parseAsync(process.argv);
