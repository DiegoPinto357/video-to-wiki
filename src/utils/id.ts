import { createHash } from 'crypto';

export const generateId = (normalizedUrl: string): string =>
  createHash('sha1').update(normalizedUrl).digest('hex');
