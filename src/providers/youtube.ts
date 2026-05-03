import ytdl from '@distube/ytdl-core';
import { YoutubeTranscript } from 'youtube-transcript';
import { transcribeWithWhisper } from '../transcription/whisper';
import type { SourceData } from '../types';

export const fetchYouTube = async (
  id: string,
  url: string,
): Promise<SourceData> => {
  const [info, transcriptItems] = await Promise.all([
    ytdl.getBasicInfo(url),
    YoutubeTranscript.fetchTranscript(url).catch(() => []),
  ]);

  const { title, description } = info.videoDetails;

  let transcript: string;
  if (transcriptItems.length > 0) {
    transcript = transcriptItems.map(t => t.text).join(' ');
  } else {
    console.log('No captions found, falling back to Whisper transcription...');
    transcript = await transcribeWithWhisper(url);
  }

  return {
    id,
    url,
    source: 'youtube',
    title,
    description: description ?? '',
    transcript,
    createdAt: new Date().toISOString(),
  };
};
