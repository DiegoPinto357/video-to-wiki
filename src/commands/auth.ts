import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import chalk from 'chalk';
import { chromium } from 'playwright';
import { instagramCookiesPath } from '../providers/instagram';

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

export const runInstagramAuth = async (vaultPath: string): Promise<void> => {
  console.log(chalk.cyan('Opening Instagram login page...'));
  console.log(
    chalk.yellow(
      'Log in to Instagram in the browser window. The window will close automatically.\n',
    ),
  );

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.instagram.com/accounts/login/');
  await page.bringToFront();

  // Wait until fully past login — home feed or explore, not an interstitial
  await page.waitForURL(
    url => {
      const u = url.toString();
      return !u.includes('/accounts/login') && !u.includes('/accounts/onetap');
    },
    { timeout: 180_000 },
  );

  // Let the session settle so all auth cookies are written
  await page.waitForTimeout(2000);

  const cookies = await context.cookies(['https://www.instagram.com']);
  await browser.close();

  const cookiesTxt = toCookiesTxt(cookies as PlaywrightCookie[]);
  await writeFile(instagramCookiesPath(vaultPath), cookiesTxt, 'utf-8');

  console.log(chalk.green('✓ Instagram cookies saved.\n'));
};

const instagramCommand = new Command('instagram')
  .description('Log in to Instagram and save cookies for ingestion')
  .action(async () => {
    const { config } = await import('../config');
    await runInstagramAuth(config.vaultPath);
    console.log(chalk.green('You can now ingest Instagram links.'));
  });

export const authCommand = new Command('auth')
  .description('Authenticate with external providers')
  .addCommand(instagramCommand);
