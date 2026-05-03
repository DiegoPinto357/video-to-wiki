#!/usr/bin/env node
import { Command } from 'commander';
import { ingestCommand } from './commands/ingest';

const program = new Command();

program
  .name('app')
  .description('Video Knowledge Ingestion CLI')
  .version('1.0.0');

program.addCommand(ingestCommand);

program.parse(process.argv);
