import { Browser, detectBrowserPlatform, install } from '@puppeteer/browsers';
import { PUPPETEER_REVISIONS } from 'puppeteer-core/internal/revisions.js';
import path from 'node:path';

const platform = detectBrowserPlatform();
if (!platform) throw new Error('Chrome Headless Shell is unavailable for this platform.');

await install({
  browser: Browser.CHROMEHEADLESSSHELL,
  buildId: PUPPETEER_REVISIONS['chrome-headless-shell'],
  cacheDir: path.resolve('dist/pdf-browser'),
  platform,
});
console.log('Chrome Headless Shell is available for quotation PDF generation.');
