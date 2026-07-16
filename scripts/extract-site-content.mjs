#!/usr/bin/env node
// Regenerates app/src/lib/site-manifest.json from the data-screen-label blocks
// in site/*.html. Run after editing a page's default copy so the admin panel's
// "reset to default" preview stays in sync. No dependencies — plain Node fs.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(__dirname, '..', 'site');
const outFile = path.join(__dirname, '..', 'app', 'src', 'lib', 'site-manifest.json');

const pages = [
  { file: 'index.html', page: 'index', title: 'Home' },
  { file: 'about.html', page: 'about', title: 'About' },
  { file: 'read.html', page: 'read', title: 'How It Works' },
  { file: 'series.html', page: 'series', title: 'Where to Start' },
  { file: 'subscribe.html', page: 'subscribe', title: 'Subscribe' },
];

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const blockRe = /<(section|header|footer)\b([^>]*data-screen-label="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g;

const blocks = [];
const seen = new Set();

for (const { file, page, title } of pages) {
  const html = readFileSync(path.join(siteDir, file), 'utf-8');
  let m;
  blockRe.lastIndex = 0;
  while ((m = blockRe.exec(html))) {
    const [, , , label, inner] = m;
    const key = slugify(label);
    if (seen.has(key)) continue; // global blocks (footer) repeat per page — first wins
    seen.add(key);
    blocks.push({
      key,
      label,
      page: label.startsWith('Global') ? 'global' : page,
      pageTitle: label.startsWith('Global') ? 'Global (all pages)' : title,
      defaultHtml: inner.trim(),
    });
  }
}

// Fixed injection points, one pair per page, plus a sitewide pair.
for (const { page, title } of pages) {
  blocks.push({ key: `${page}-head-extra`, label: `${title} — extra <head> code`, page, pageTitle: title, defaultHtml: '', injection: 'head' });
  blocks.push({ key: `${page}-body-end`, label: `${title} — extra code before </body>`, page, pageTitle: title, defaultHtml: '', injection: 'body' });
}

writeFileSync(outFile, JSON.stringify(blocks, null, 2) + '\n');
console.log(`Wrote ${blocks.length} blocks to ${path.relative(process.cwd(), outFile)}`);
