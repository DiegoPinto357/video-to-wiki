import { spawn } from 'child_process';
import { unlink, access } from 'fs/promises';
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
      if (code !== 0) return reject(new Error(`yt-dlp failed: ${stderr}`));
      resolve(stdout);
    });
  });

export const instagramCookiesPath = (vaultPath: string) =>
  join(vaultPath, 'System', 'instagram-cookies.txt');

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

  console.log(chalk.gray('  → Fetching metadata...'));
  const metaRaw = await runYtDlp([
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
  await runYtDlp([
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
