#!/usr/bin/env node
import './config';
import { Command } from 'commander';
import { ingestCommand, runIngest } from './commands/ingest';
import { authCommand } from './commands/auth';
import { listRawCommand } from './commands/list-raw';
import { listStructureCommand } from './commands/list-structure';
import { writeDocCommand } from './commands/write-doc';
import { updateDocCommand } from './commands/update-doc';
import { addSourceCommand } from './commands/add-source';
import { tagsCommand } from './commands/tags';
import { applyCommand } from './commands/apply';

const program = new Command();

program
  .name('app')
  .description('Video Knowledge Ingestion CLI')
  .version('1.0.0');

program.addCommand(ingestCommand);
program.addCommand(authCommand);
program.addCommand(listRawCommand);
program.addCommand(listStructureCommand);
program.addCommand(writeDocCommand);
program.addCommand(updateDocCommand);
program.addCommand(addSourceCommand);
program.addCommand(tagsCommand);
program.addCommand(applyCommand);

program.action(runIngest);

program.parseAsync(process.argv);
