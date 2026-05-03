import ytdl from '@distube/ytdl-core';
import { YoutubeTranscript } from 'youtube-transcript';
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
  const transcript = transcriptItems.map(t => t.text).join(' ');

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
