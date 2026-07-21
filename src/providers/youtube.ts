import { spawn } from 'child_process';
import { access } from 'fs/promises';
import chalk from 'chalk';
import { YoutubeTranscript } from 'youtube-transcript';
import { transcribeWithWhisper } from '../transcription/whisper';
import { profileDir } from '../utils/registry';
import type { SourceData } from '../types';

type YtDlpMeta = {
  title?: string;
  description?: string;
};

const AUTH_ERROR_PATTERNS = [
  '429',
  'too many requests',
  'sign in to confirm',
  'confirm you\'re not a bot',
  'visitor data',
];

const isAuthRequired = (msg: string): boolean =>
  AUTH_ERROR_PATTERNS.some(p => msg.toLowerCase().includes(p.toLowerCase()));

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
      if (code !== 0) return reject(new Error(stderr));
      resolve(stdout);
    });
  });

export const youtubeCookiesPath = () =>
  `${profileDir}/youtube-cookies.txt`;

const fetchMeta = async (url: string): Promise<string> => {
  const baseArgs = ['--dump-json', '--no-download'];
  const cookiesFile = youtubeCookiesPath();

  try {
    return await runYtDlp([...baseArgs, url]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isAuthRequired(msg)) throw err;

    // Try cookies file first, then fall back to browser cookies
    try {
      await access(cookiesFile);
      console.log(chalk.gray('  → Auth required, retrying with saved cookies...'));
      return await runYtDlp([...baseArgs, '--cookies', cookiesFile, url]);
    } catch {
      // No cookies file, try browser cookies
    }

    console.log(
      chalk.gray('  → Auth required, retrying with Chrome cookies...'),
    );
    return await runYtDlp([
      ...baseArgs,
      '--cookies-from-browser',
      'chrome',
      url,
    ]);
  }
};

export const fetchYouTube = async (
  id: string,
  url: string,
): Promise<SourceData> => {
  console.log(chalk.gray('  → Fetching metadata & captions...'));

  const metaRaw = await fetchMeta(url);
  const meta = JSON.parse(metaRaw) as YtDlpMeta;
  const title = meta.title ?? 'YouTube Video';
  const description = meta.description ?? '';

  const transcriptItems = await YoutubeTranscript.fetchTranscript(url).catch(
    () => [],
  );

  let transcript: string;
  if (transcriptItems.length > 0) {
    transcript = transcriptItems.map(t => t.text).join(' ');
  } else {
    console.log(
      chalk.gray(
        '  → No captions found, transcribing with Whisper (this may take a minute)...',
      ),
    );
    transcript = await transcribeWithWhisper(url);
  }

  return {
    id,
    url,
    source: 'youtube',
    title,
    description,
    transcript,
    createdAt: new Date().toISOString(),
  };
};
