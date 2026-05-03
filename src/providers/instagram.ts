import { spawn } from 'child_process';
import { unlink, access, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import { transcribeFile } from '../transcription/whisper';
import type { SourceData } from '../types';

type YtDlpMeta = {
  title?: string;
  description?: string;
};

const AUTH_ERROR_PATTERNS = [
  'login required',
  'not logged in',
  'checkpoint required',
  'please wait a few minutes',
];

const isAuthError = (stderr: string) =>
  AUTH_ERROR_PATTERNS.some(p => stderr.toLowerCase().includes(p));

const runYtDlp = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on('close', code => {
      if (code !== 0) {
        if (isAuthError(stderr)) return reject(new Error('SESSION_EXPIRED'));
        return reject(new Error(`yt-dlp failed: ${stderr}`));
      }
      resolve(stdout);
    });
  });

export class InstagramAuthError extends Error {
  constructor() {
    super('Instagram session expired');
    this.name = 'InstagramAuthError';
  }
}

export const instagramCookiesPath = (vaultPath: string) =>
  join(vaultPath, '.system', 'instagram-cookies.txt');

export const fetchInstagram = async (
  id: string,
  url: string,
  vaultPath: string,
): Promise<SourceData> => {
  const cookiesFile = instagramCookiesPath(vaultPath);

  try {
    await access(cookiesFile);
  } catch {
    throw new Error('Instagram cookies not found. Run: app auth instagram');
  }

  const ytDlpWithAuthCheck = async (args: string[]) => {
    try {
      return await runYtDlp(args);
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        // Wipe stale session so auto-auth triggers on retry
        await rm(cookiesFile, { force: true });
        await rm(join(vaultPath, 'System', 'browser-state'), {
          recursive: true,
          force: true,
        });
        throw new InstagramAuthError();
      }
      throw err;
    }
  };

  console.log(chalk.gray('  → Fetching metadata...'));
  const metaRaw = await ytDlpWithAuthCheck([
    '--dump-json',
    '--no-download',
    '--cookies',
    cookiesFile,
    url,
  ]);
  const meta = JSON.parse(metaRaw) as YtDlpMeta;
  const title =
    meta.title ?? meta.description?.slice(0, 60) ?? 'Instagram Video';
  const description = meta.description ?? '';

  const tempBase = join(tmpdir(), `vtw-${randomUUID()}`);
  const tempPath = `${tempBase}.mp3`;

  console.log(chalk.gray('  → Downloading audio...'));
  await ytDlpWithAuthCheck([
    '-x',
    '--audio-format',
    'mp3',
    '--cookies',
    cookiesFile,
    '-o',
    `${tempBase}.%(ext)s`,
    url,
  ]);

  let transcript = '';
  try {
    console.log(
      chalk.gray('  → Transcribing audio (this may take a minute)...'),
    );
    transcript = await transcribeFile(tempPath);
  } finally {
    await unlink(tempPath).catch(() => {});
  }

  return {
    id,
    url,
    source: 'instagram',
    title,
    description,
    transcript,
    createdAt: new Date().toISOString(),
  };
};
