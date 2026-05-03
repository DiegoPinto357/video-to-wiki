import { VideoSource } from './utils/url';

export type SourceData = {
  id: string;
  url: string;
  source: VideoSource;
  title: string;
  description: string;
  transcript: string;
  createdAt: string;
};
