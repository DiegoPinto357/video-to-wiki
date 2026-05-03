export type VideoSource = 'youtube' | 'instagram';

export type NormalizedUrl = {
  url: string;
  source: VideoSource;
};

export const normalizeUrl = (raw: string): NormalizedUrl => {
  const url = new URL(raw.trim());

  if (isYouTube(url)) return { url: normalizeYouTube(url), source: 'youtube' };
  if (isInstagram(url))
    return { url: normalizeInstagram(url), source: 'instagram' };

  throw new Error(`Unsupported video source: ${raw}`);
};

const isYouTube = (url: URL): boolean =>
  ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname);

const isInstagram = (url: URL): boolean =>
  ['instagram.com', 'www.instagram.com'].includes(url.hostname);

const normalizeYouTube = (url: URL): string => {
  if (url.hostname === 'youtu.be') {
    const videoId = url.pathname.slice(1);
    return `https://youtube.com/watch?v=${videoId}`;
  }

  const videoId = url.searchParams.get('v');
  if (!videoId)
    throw new Error(`Could not extract YouTube video ID from: ${url.href}`);

  return `https://youtube.com/watch?v=${videoId}`;
};

const normalizeInstagram = (url: URL): string => {
  const path = url.pathname.replace(/\/$/, '');
  return `https://instagram.com${path}`;
};
