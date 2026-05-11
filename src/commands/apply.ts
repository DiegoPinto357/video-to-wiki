import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join, isAbsolute } from 'path';
import chalk from 'chalk';
import { jsonrepair } from 'jsonrepair';
import { config } from '../config';
import { backupFile } from '../utils/backup';

type AiAction = 'create' | 'update' | 'suggest' | 'ask';

type AiSuggestion = {
  action: 'suggest';
  type: 'new_tag' | 'new_folder';
  value: string;
  reason: string;
};

type AiAsk = {
  action: 'ask';
  question: string;
};

type AiWrite = {
  action: 'create' | 'update';
  target: string;
  content: string;
  sources?: Array<{ title: string; url: string }>;
};

type AiOutput = AiWrite | AiSuggestion | AiAsk;

type ApplyResult = {
  status: 'success' | 'error';
  action: AiAction | null;
  file?: string;
  question?: string;
  message?: string;
};

const deduplicateSources = (
  sources: Array<{ title: string; url: string }>,
): Array<{ title: string; url: string }> => {
  const seen = new Set<string>();
  return sources.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
};

const resolveTarget = (wikiPath: string, target: string): string =>
  isAbsolute(target) ? target : join(wikiPath, target);

const applyWrite = async (
  wikiPath: string,
  payload: AiWrite,
  jsonOutput: boolean,
): Promise<void> => {
  if (!payload.target) {
    const msg = 'Missing required field: "target"';
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          status: 'error',
          action: payload.action,
          message: msg,
        }),
      );
    } else {
      console.error(chalk.red(msg));
    }
    process.exit(1);
  }

  if (!payload.content) {
    const msg = 'Missing required field: "content"';
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          status: 'error',
          action: payload.action,
          message: msg,
        }),
      );
    } else {
      console.error(chalk.red(msg));
    }
    process.exit(1);
  }

  const targetPath = resolveTarget(wikiPath, payload.target);

  const exists = await access(targetPath)
    .then(() => true)
    .catch(() => false);

  if (payload.action === 'create' && exists && !jsonOutput) {
    console.error(
      chalk.yellow(
        `⚠ File already exists — backing up and overwriting: ${payload.target}`,
      ),
    );
  }

  if (exists) {
    await backupFile(wikiPath, targetPath);
  }

  const sources = payload.sources ? deduplicateSources(payload.sources) : [];
  const finalPayload = { ...payload, sources };

  try {
    await writeFile(targetPath, finalPayload.content, 'utf-8');
  } catch (err) {
    const msg = `Failed to write file "${payload.target}": ${err instanceof Error ? err.message : String(err)}`;
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          status: 'error',
          action: payload.action,
          file: payload.target,
          message: msg,
        }),
      );
    } else {
      console.error(chalk.red(msg));
    }
    process.exit(1);
  }

  if (jsonOutput) {
    const result: ApplyResult = {
      status: 'success',
      action: payload.action,
      file: payload.target,
    };
    console.log(JSON.stringify(result));
  } else {
    console.log(
      chalk.green(
        `✓ ${payload.action === 'create' ? 'Created' : 'Updated'}: ${payload.target}`,
      ),
    );
    if (sources.length) {
      console.log(
        chalk.gray(`  Sources: ${sources.map(s => s.title).join(', ')}`),
      );
    }
  }
};

const applySuggestion = (payload: AiSuggestion, jsonOutput: boolean): void => {
  if (jsonOutput) {
    const result: ApplyResult = { status: 'success', action: 'suggest' };
    console.log(JSON.stringify(result));
  } else {
    console.log(chalk.cyan(`💡 AI Suggestion (${payload.type})`));
    console.log(`   Value:  ${chalk.white(payload.value)}`);
    console.log(`   Reason: ${chalk.gray(payload.reason)}`);
    console.log(chalk.yellow('   → Review and apply manually if appropriate.'));
  }
};

const applyAsk = (payload: AiAsk, jsonOutput: boolean): void => {
  if (jsonOutput) {
    const result: ApplyResult = {
      status: 'success',
      action: 'ask',
      question: payload.question,
    };
    console.log(JSON.stringify(result));
  } else {
    console.log(chalk.cyan(`❓ AI Question:`));
    console.log(`   ${chalk.white(payload.question)}`);
    console.log(chalk.yellow('   → Answer manually and re-run apply.'));
  }
};

export const applyCommand = new Command('apply')
  .description(
    'Apply AI-generated output (create/update doc or handle suggestion)',
  )
  .argument(
    '<file>',
    'Path to the AI output JSON file (or - to read from stdin)',
  )
  .option('--json', 'Output result as JSON')
  .action(async (file: string, opts: { json?: boolean }) => {
    const { wikiPath } = config;
    const jsonOutput = !!opts.json;

    let raw: string;
    if (file === '-') {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
      raw = Buffer.concat(chunks).toString('utf-8');
    } else {
      try {
        raw = await readFile(file, 'utf-8');
      } catch (err) {
        const msg = `Cannot read file "${file}": ${err instanceof Error ? err.message : String(err)}`;
        if (jsonOutput) {
          console.log(
            JSON.stringify({
              status: 'error',
              action: null,
              file,
              message: msg,
            }),
          );
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }
    }

    let payload: AiOutput;
    try {
      const repaired = jsonrepair(raw);
      payload = JSON.parse(repaired) as AiOutput;
    } catch (err) {
      const msg = `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`;
      if (jsonOutput) {
        console.log(
          JSON.stringify({ status: 'error', action: null, message: msg }),
        );
      } else {
        console.error(chalk.red(msg));
      }
      process.exit(1);
    }

    if (!['create', 'update', 'suggest', 'ask'].includes(payload.action)) {
      const msg = `Unknown action: "${payload.action}". Expected create, update, suggest, or ask.`;
      if (jsonOutput) {
        console.log(
          JSON.stringify({
            status: 'error',
            action: payload.action,
            message: msg,
          }),
        );
      } else {
        console.error(chalk.red(msg));
      }
      process.exit(1);
    }

    if (payload.action === 'suggest') {
      applySuggestion(payload as AiSuggestion, jsonOutput);
    } else if (payload.action === 'ask') {
      applyAsk(payload as AiAsk, jsonOutput);
    } else {
      await applyWrite(wikiPath, payload as AiWrite, jsonOutput);
    }
  });
