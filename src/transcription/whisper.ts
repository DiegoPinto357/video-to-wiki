import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import ytdl from '@distube/ytdl-core';

const downloadAudio = async (url: string): Promise<string> => {
  const tempPath = join(tmpdir(), `vtw-${randomUUID()}.webm`);
  const audioStream = ytdl(url, { filter: 'audioonly' });
  await pipeline(audioStream, createWriteStream(tempPath));
  return tempPath;
};

const runWhisper = (audioPath: string, modelSize: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'scripts', 'transcribe.py');
    const proc = spawn('python', [scriptPath, audioPath, modelSize]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`Whisper failed: ${stderr}`));
      try {
        const result = JSON.parse(stdout) as { text?: string; error?: string };
        if (result.error) return reject(new Error(result.error));
        resolve(result.text ?? '');
      } catch {
        reject(new Error(`Failed to parse Whisper output: ${stdout}`));
      }
    });
  });

export const transcribeWithWhisper = async (
  url: string,
  modelSize = 'small',
): Promise<string> => {
  const audioPath = await downloadAudio(url);
  try {
    return await runWhisper(audioPath, modelSize);
  } finally {
    await unlink(audioPath).catch(() => {});
  }
};
