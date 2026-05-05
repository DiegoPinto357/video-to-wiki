import { readFile, access } from 'fs/promises';

export const extractSummary = async (filePath: string): Promise<string> => {
  try {
    await access(filePath);
  } catch {
    return '';
  }

  const content = await readFile(filePath, 'utf-8');

  // Strip frontmatter
  let body = content;
  if (body.startsWith('---')) {
    const end = body.indexOf('---', 3);
    if (end !== -1) body = body.slice(end + 3).trimStart();
  }

  // Skip H1 title line
  const lines = body.split('\n');
  let start = 0;
  if (lines[0]?.startsWith('#')) start = 1;

  // Collect first 2-3 non-empty, non-heading lines
  const summary: string[] = [];
  for (let i = start; i < lines.length && summary.length < 3; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      summary.push(line);
    }
  }

  return summary.join(' ').slice(0, 300);
};
