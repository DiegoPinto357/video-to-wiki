#!/usr/bin/env node
import './config';
import { Command } from 'commander';
import { ingestCommand, runIngest } from './commands/ingest';
import { authCommand } from './commands/auth';
import { listRawCommand } from './commands/list-raw';
import { listUnprocessedCommand } from './commands/list-unprocessed';
import { listStructureCommand } from './commands/list-structure';
import { getRawCommand } from './commands/get-raw';
import { getDocCommand } from './commands/get-doc';
import { writeDocCommand } from './commands/write-doc';
import { updateDocCommand } from './commands/update-doc';
import { addSourceCommand } from './commands/add-source';
import { tagsCommand } from './commands/tags';
import { applyCommand } from './commands/apply';
import { markProcessedCommand } from './commands/mark-processed';
import { aiContextCommand } from './commands/ai-context';
import { cleanupCommand } from './commands/cleanup';

const program = new Command();

program
  .name('app')
  .description('Video Knowledge Ingestion CLI')
  .version('1.0.0');

program.addCommand(ingestCommand);
program.addCommand(authCommand);
program.addCommand(listRawCommand);
program.addCommand(listUnprocessedCommand);
program.addCommand(listStructureCommand);
program.addCommand(getRawCommand);
program.addCommand(getDocCommand);
program.addCommand(writeDocCommand);
program.addCommand(updateDocCommand);
program.addCommand(addSourceCommand);
program.addCommand(tagsCommand);
program.addCommand(applyCommand);
program.addCommand(markProcessedCommand);
program.addCommand(aiContextCommand);
program.addCommand(cleanupCommand);

program.action(runIngest);

program.parseAsync(process.argv);
