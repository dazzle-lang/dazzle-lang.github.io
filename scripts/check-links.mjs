// Checks every internal link in the built site: the page must exist and, when the link
// names a heading, the page must have that id. Run after `npm run build`.
//
// The § links in the spec are computed by scripts/sync.mjs from heading text, so this is
// what catches the day Astro's heading ids and the sync script's stop agreeing.

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const pages = new Map(); // "/spec/06-…/" -> Set of ids

for (const file of walk(DIST)) {
	if (!file.endsWith('.html')) continue;
	const rel = '/' + path.relative(DIST, file).split(path.sep).join('/');
	const url = rel.replace(/index\.html$/, '').replace(/\.html$/, '/');
	const ids = new Set([...read(file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
	pages.set(url, ids);
}

const broken = [];
for (const [url] of pages) {
	const html = read(path.join(DIST, url, 'index.html'), true) ?? '';
	for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
		if (!href.startsWith('/') || href.startsWith('//')) continue;
		const [p, hash] = href.split('#');
		const target = p.endsWith('/') ? p : `${p}/`;
		if (/\.[a-z0-9]+\/$/i.test(target) && fs.existsSync(path.join(DIST, p))) continue; // a file
		const ids = pages.get(target);
		if (!ids) broken.push(`${url}: ${href} (no such page)`);
		else if (hash && !ids.has(decodeURIComponent(hash))) broken.push(`${url}: ${href} (no such heading)`);
	}
}

if (broken.length) {
	console.error(`${broken.length} broken internal links:\n  ${[...new Set(broken)].join('\n  ')}`);
	process.exit(1);
}
console.log(`check: every internal link on ${pages.size} pages resolves`);

function* walk(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* walk(p);
		else yield p;
	}
}

function read(file, optional = false) {
	if (optional && !fs.existsSync(file)) return null;
	return fs.readFileSync(file, 'utf8');
}
