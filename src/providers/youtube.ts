import { spawn } from 'child_process';
import chalk from 'chalk';
import { YoutubeTranscript } from 'youtube-transcript';
import { transcribeWithWhisper } from '../transcription/whisper';
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
      if (code !== 0) return reject(new Error(stderr));
      resolve(stdout);
    });
  });

const isRateLimit = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.toLowerCase().includes('too many requests');
};

const fetchMeta = async (url: string): Promise<string> => {
  const baseArgs = ['--dump-json', '--no-download'];
  try {
    return await runYtDlp([...baseArgs, url]);
  } catch (err) {
    if (isRateLimit(err)) {
      console.log(
        chalk.gray('  → Rate limited, retrying with Chrome cookies...'),
      );
      return await runYtDlp([
        ...baseArgs,
        '--cookies-from-browser',
        'chrome',
        url,
      ]);
    }
    throw err;
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
