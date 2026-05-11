import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import chalk from 'chalk';
import { chromium } from 'playwright';
import { profileDir } from '../utils/registry';
import { instagramCookiesPath, browserStatePath } from '../providers/instagram';

type PlaywrightCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  secure: boolean;
};

const toCookiesTxt = (cookies: PlaywrightCookie[]): string => {
  const lines = ['# Netscape HTTP Cookie File', ''];
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expiry = c.expires > 0 ? Math.floor(c.expires) : 0;
    lines.push(
      `${domain}\tTRUE\t${c.path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`,
    );
  }
  return lines.join('\n');
};

export const runInstagramAuth = async (): Promise<void> => {
  console.log(chalk.cyan('Opening Instagram login page...'));
  console.log(
    chalk.yellow(
      'Log in to Instagram in the browser window. It will close automatically once you are logged in.\n',
    ),
  );

  const statePath = browserStatePath();
  await mkdir(statePath, { recursive: true });

  // Persistent context: browser state is saved between runs so login is remembered
  const context = await chromium.launchPersistentContext(statePath, {
    headless: false,
  });

  const page = await context.newPage();
  await page.goto('https://www.instagram.com/accounts/login/');
  await page.bringToFront();

  await page.waitForURL(
    url => {
      const u = url.toString();
      return (
        !u.includes('/accounts/login') &&
        !u.includes('/accounts/onetap') &&
        !u.includes('/challenge')
      );
    },
    { timeout: 180_000 },
  );

  await page.waitForTimeout(2000);

  // Export session cookies to Netscape format for yt-dlp
  const cookies = await context.cookies(['https://www.instagram.com']);
  await context.close();

  const cookiesTxt = toCookiesTxt(cookies as PlaywrightCookie[]);
  await writeFile(instagramCookiesPath(), cookiesTxt, 'utf-8');

  console.log(chalk.green('✓ Instagram session saved.\n'));
  console.log(chalk.dim(`  Stored in: ${profileDir}`));
};

const instagramCommand = new Command('instagram')
  .description('Log in to Instagram and save session for ingestion')
  .action(async () => {
    await runInstagramAuth();
    console.log(chalk.green('You can now ingest Instagram links.'));
  });

export const authCommand = new Command('auth')
  .description('Authenticate with external providers')
  .addCommand(instagramCommand);
