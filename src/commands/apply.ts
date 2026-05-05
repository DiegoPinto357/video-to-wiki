import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join, isAbsolute } from 'path';
import chalk from 'chalk';
import { config } from '../config';
import { backupFile } from '../utils/backup';

type AiAction = 'create' | 'update' | 'suggest';

type AiSuggestion = {
  action: 'suggest';
  type: 'new_tag' | 'new_folder';
  value: string;
  reason: string;
};

type AiWrite = {
  action: 'create' | 'update';
  target: string;
  content: string;
  sources?: Array<{ title: string; url: string }>;
};

type AiOutput = AiWrite | AiSuggestion;

const resolveTarget = (wikiPath: string, target: string): string =>
  isAbsolute(target) ? target : join(wikiPath, target);

const applyWrite = async (
  wikiPath: string,
  payload: AiWrite,
): Promise<void> => {
  const targetPath = resolveTarget(wikiPath, payload.target);

  const exists = await access(targetPath)
    .then(() => true)
    .catch(() => false);

  if (payload.action === 'create' && exists) {
    console.log(
      chalk.yellow(
        `⚠ File already exists — backing up and overwriting: ${payload.target}`,
      ),
    );
  }

  if (exists) {
    await backupFile(wikiPath, targetPath);
  }

  await writeFile(targetPath, payload.content, 'utf-8');
  console.log(
    chalk.green(
      `✓ ${payload.action === 'create' ? 'Created' : 'Updated'}: ${payload.target}`,
    ),
  );

  if (payload.sources?.length) {
    console.log(
      chalk.gray(`  Sources: ${payload.sources.map(s => s.title).join(', ')}`),
    );
  }
};

const applySuggestion = (payload: AiSuggestion): void => {
  console.log(chalk.cyan(`💡 AI Suggestion (${payload.type})`));
  console.log(`   Value:  ${chalk.white(payload.value)}`);
  console.log(`   Reason: ${chalk.gray(payload.reason)}`);
  console.log(chalk.yellow('   → Review and apply manually if appropriate.'));
};

export const applyCommand = new Command('apply')
  .description(
    'Apply AI-generated output (create/update doc or handle suggestion)',
  )
  .argument(
    '<file>',
    'Path to the AI output JSON file (or - to read from stdin)',
  )
  .action(async (file: string) => {
    const { wikiPath } = config;

    let raw: string;
    if (file === '-') {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
      raw = Buffer.concat(chunks).toString('utf-8');
    } else {
      try {
        raw = await readFile(file, 'utf-8');
      } catch {
        console.error(chalk.red(`Cannot read file: ${file}`));
        process.exit(1);
      }
    }

    let payload: AiOutput;
    try {
      payload = JSON.parse(raw) as AiOutput;
    } catch {
      console.error(chalk.red('Invalid JSON in AI output file.'));
      process.exit(1);
    }

    if (!['create', 'update', 'suggest'].includes(payload.action)) {
      console.error(
        chalk.red(
          `Unknown action: "${payload.action}". Expected create, update, or suggest.`,
        ),
      );
      process.exit(1);
    }

    if (payload.action === 'suggest') {
      applySuggestion(payload as AiSuggestion);
    } else {
      await applyWrite(wikiPath, payload as AiWrite);
    }
  });
