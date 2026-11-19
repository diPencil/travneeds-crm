import { isUploadedBrandAsset, readBrandAsset } from '../settings/brand-assets.service.js';
import { readFile, realpath, access } from 'node:fs/promises';
import path from 'node:path';
import { Browser, computeExecutablePath, detectBrowserPlatform } from '@puppeteer/browsers';
import puppeteer, { type LaunchOptions } from 'puppeteer-core';
import { PUPPETEER_REVISIONS } from 'puppeteer-core/internal/revisions.js';
import type { QuotationDocument } from '../../../../shared/quotations/quotation.contracts.js';
import { quotationDocumentHtml } from '../../../../shared/quotations/quotation-document-html.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../http/errors.js';
import {
  quotationMediaIds,
  sanitizeQuotationContent,
  publicQuotationContent,
} from './quotation-content.js';
import { readQuotationImage } from './quotation-media.service.js';

let fonts: Promise<string> | undefined;
function quotationFonts(): Promise<string> {
  fonts ??= Promise.all(
    ['arabic', 'latin'].flatMap((script) =>
      [400, 700].map(async (weight) => {
        const bytes = await readFile(
          path.join(
            'node_modules',
            '@fontsource',
            'tajawal',
            'files',
            `tajawal-${script}-${weight}-normal.woff2`,
          ),
        );
        const range =
          script === 'arabic'
            ? 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF'
            : 'U+0000-00FF,U+2000-206F';
        return `@font-face{font-family:QuotationFont;font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');unicode-range:${range};}`;
      }),
    ),
  ).then((values) => values.join(''));
  return fonts;
}
async function brandLogo(asset: string): Promise<string> {
  if (isUploadedBrandAsset(asset)) {
    const logo = await readBrandAsset(asset, 'logo');
    return `data:${logo.mime};base64,${logo.content.toString('base64')}`;
  }
  const root = await realpath('public');
  const filename = await realpath(path.join(root, asset.replace(/^\//, ''))).catch(() => null);
  if (!filename || !filename.startsWith(root + path.sep)) return '';
  const mime: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const type = mime[path.extname(filename).toLowerCase()];
  if (!type) return '';
  const bytes = await readFile(filename);
  if (bytes.length > 2 * 1024 * 1024) return '';
  return `data:${type};base64,${bytes.toString('base64')}`;
}
export async function renderQuotationHtml(document: QuotationDocument, locale: 'en' | 'ar') {
  const images: Record<string, string> = {};
  let size = 0;
  for (const id of quotationMediaIds(document.content)) {
    const media = await readQuotationImage(id);
    size += media.content.length;
    if (size > 24 * 1024 * 1024) throw new HttpError(422, 'QUOTATION_IMAGES_TOO_LARGE');
    images[id] = `data:${media.mime_type};base64,${media.content.toString('base64')}`;
  }
  return quotationDocumentHtml(
    { ...document, content: sanitizeQuotationContent(publicQuotationContent(document.content)) },
    locale,
    images,
    await quotationFonts(),
    await brandLogo(document.branding.logoUrl),
  );
}
async function chromiumLaunchOptions(): Promise<LaunchOptions> {
  const candidates = env.PDF_CHROMIUM_PATH
    ? [env.PDF_CHROMIUM_PATH]
    : process.platform === 'win32'
      ? [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        ]
      : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  const platform = detectBrowserPlatform();
  const bundled =
    platform &&
    computeExecutablePath({
      browser: Browser.CHROMEHEADLESSSHELL,
      buildId: PUPPETEER_REVISIONS['chrome-headless-shell'],
      cacheDir: path.resolve('dist/pdf-browser'),
      platform,
    });
  const installed = !env.PDF_CHROMIUM_PATH && bundled ? [bundled, ...candidates] : candidates;
  for (const candidate of installed) {
    try {
      await access(candidate);
      return {
        executablePath: candidate,
        headless: candidate === bundled ? 'shell' : true,
        timeout: 15000,
        args: ['--disable-dev-shm-usage'],
      };
    } catch {
      /* Try the next explicitly supported installation path. */
    }
  }
  throw new HttpError(503, 'PDF_ENGINE_UNAVAILABLE');
}
let activeRenders = 0;
export async function renderQuotationPdf(
  document: QuotationDocument,
  locale: 'en' | 'ar',
): Promise<Buffer> {
  if (activeRenders >= 2) throw new HttpError(429, 'PDF_RENDER_BUSY');
  activeRenders++;
  try {
    const html = await renderQuotationHtml(document, locale);
    const options = await chromiumLaunchOptions();
    const browser = await puppeteer.launch(options).catch(() => {
      throw new HttpError(503, 'PDF_ENGINE_UNAVAILABLE');
    });
    try {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().startsWith('data:') || request.url() === 'about:blank')
          void request.continue();
        else void request.abort();
      });
      await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
      const bytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        waitForFonts: true,
        timeout: 25000,
      });
      return Buffer.from(bytes);
    } finally {
      await browser.close();
    }
  } finally {
    activeRenders--;
  }
}
