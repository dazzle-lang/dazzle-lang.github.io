// Copies the language spec and the design decisions out of the Dazzle repository and turns
// them into Starlight pages, so the site is never a second copy anyone has to keep in sync.
//
//   DAZZLE_REPO=../Dazzle node scripts/sync.mjs
//
// What it changes on the way:
// - the `# N. Title` heading becomes the page's frontmatter title;
// - links between spec files point at the site's pages, and links to anything else in the
//   repository point at GitHub;
// - every `§N.M` and `D-NNNN` in prose becomes a link to that section or decision;
// - the VS Code extension's grammar is copied so `dz` code blocks are highlighted;
// - `dz` is built for WASI and copied, for the playground to run in the browser.
//
// Everything it writes is generated and ignored by git.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';

const REPO = path.resolve(process.env.DAZZLE_REPO ?? '../Dazzle');
const GITHUB = 'https://github.com/dazzle-lang/Dazzle';
const BRANCH = 'master';
const SITE = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(SITE, 'src/content/docs');
const OUT_SPEC = path.join(DOCS, 'spec');
const OUT_DECISIONS = path.join(DOCS, 'decisions');
const OUT_GENERATED = path.join(SITE, 'generated');

if (!fs.existsSync(path.join(REPO, 'docs/spec/README.md'))) {
	console.error(`sync: no Dazzle checkout at ${REPO}; set DAZZLE_REPO to one.`);
	process.exit(1);
}

// ---------------------------------------------------------------------------------------
// Read everything first: the § and D-NNNN maps need every page before any page is written.

const specFiles = fs
	.readdirSync(path.join(REPO, 'docs/spec'))
	.filter((f) => /^\d\d-.*\.md$/.test(f))
	.sort();

/** "6.4" -> { page: "/spec/06-…/", anchor: "64-move-semantics" } */
const sections = new Map();
const specPages = specFiles.map((file) => {
	const text = read(`docs/spec/${file}`);
	const slug = file.replace(/\.md$/, '');
	const url = `/spec/${slug}/`;
	const h1 = text.match(/^# (\d+)\. (.+)$/m);
	if (!h1) throw new Error(`sync: ${file} does not start with "# N. Title"`);
	const number = Number(h1[1]);
	sections.set(String(number), { page: url, anchor: '' });

	// Starlight gives every heading an id the way GitHub does, counting repeats per page,
	// so every heading goes through the slugger in order, numbered or not.
	const slugger = new GithubSlugger();
	for (const heading of headings(text)) {
		const anchor = slugger.slug(plainText(heading.text));
		const numbered = heading.text.match(/^(\d+(?:\.\d+)+)\s/);
		if (numbered && heading.level >= 2) sections.set(numbered[1], { page: url, anchor });
	}
	return { file, slug, url, number, title: `${h1[1]}. ${h1[2]}`, text };
});

const decisionFiles = fs
	.readdirSync(path.join(REPO, 'docs/decisions'))
	.filter((f) => /^D-\d{4}-.*\.md$/.test(f))
	.sort();

/** "D-0032" -> { url, title, status } */
const decisions = new Map();
const decisionPages = decisionFiles.map((file) => {
	const raw = read(`docs/decisions/${file}`);
	const { meta, body } = frontmatter(raw, file);
	const slug = file.replace(/\.md$/, '').toLowerCase();
	const page = { file, slug, url: `/decisions/${slug}/`, ...meta, body };
	decisions.set(meta.id, page);
	return page;
});

// ---------------------------------------------------------------------------------------
// Write.

for (const dir of [OUT_SPEC, OUT_DECISIONS, OUT_GENERATED]) {
	fs.rmSync(dir, { recursive: true, force: true });
	fs.mkdirSync(dir, { recursive: true });
}

{
	const text = read('docs/spec/README.md');
	const body = text.replace(/^# .*\n+/, '');
	write(path.join(OUT_SPEC, 'index.md'), {
		title: 'The Dazzle language specification',
		description:
			'The specification of the Dazzle programming language: its syntax, types, ownership rules, generics, errors, C++ interop and code generation.',
		sidebar: { label: 'Overview', order: 0 },
		editUrl: `${GITHUB}/edit/${BRANCH}/docs/spec/README.md`,
	}, transform(body, 'docs/spec'));
}

for (const page of specPages) {
	let body = page.text.replace(/^# .*\n+/, '');
	if (page.number === 18) body = withDecisionLists(body);
	write(path.join(OUT_SPEC, `${page.slug}.md`), {
		title: page.title,
		description: describe(body),
		sidebar: { order: page.number + 1 },
		editUrl: `${GITHUB}/edit/${BRANCH}/docs/spec/${page.file}`,
	}, transform(body, 'docs/spec'));
}

for (const page of decisionPages) {
	const open = page.status === 'open';
	const status = open
		? `:::caution[Open question]\n**${page.id}** is not decided yet: it is one of the design questions the language's author has still to settle. See [all decisions](/decisions/).\n:::`
		: `:::note[Decided]\n**${page.id}**, settled by the language's author: part of [spec §18](/spec/18-decisions-log/).${citation(page.id)}\n:::`;
	write(path.join(OUT_DECISIONS, `${page.slug}.md`), {
		title: page.title,
		description: describe(page.body),
		sidebar: {
			label: `${page.id.slice(2)} ${page.title}`,
			...(open ? { badge: { text: 'open', variant: 'caution' } } : {}),
		},
		editUrl: `${GITHUB}/edit/${BRANCH}/docs/decisions/${page.file}`,
	}, `${status}\n\n${transform(page.body, 'docs/decisions')}`);
}

{
	const list = (status) =>
		decisionPages
			.filter((d) => d.status === status)
			.map((d) => `| [${d.id}](${d.url}) | ${d.title} |`)
			.join('\n');
	const body = `Every design question about Dazzle that its author has settled, and every one still open, with the reasons and the alternatives that were turned down. Together they are spec [§18](/spec/18-decisions-log/).

Older text cites a decision as \`18.NN\`: \`§18.32\` and \`D-0032\` are the same decision.

## Still open

| | |
|---|---|
${list('open')}

## Decided

| | |
|---|---|
${list('decided')}
`;
	write(path.join(OUT_DECISIONS, 'index.md'), {
		title: 'Design decisions',
		description:
			'Every design decision behind the Dazzle programming language, with the reasons and the rejected alternatives, and the questions still open.',
		sidebar: { label: 'All decisions', order: 0 },
		editUrl: false,
	}, body);
}

fs.copyFileSync(
	path.join(REPO, 'editors/vscode/syntaxes/dazzle.tmLanguage.json'),
	path.join(OUT_GENERATED, 'dazzle.tmLanguage.json'),
);

// The playground runs the compiler itself in the browser: `dz` built for WASI, from the same
// checkout as the pages. `DAZZLE_WASM` names one already built, to skip cargo.
let wasm = process.env.DAZZLE_WASM;
if (!wasm) {
	const args = ['build', '--release', '-p', 'dz', '--target', 'wasm32-wasip1'];
	const built = spawnSync('cargo', args, { cwd: REPO, stdio: 'inherit' });
	if (built.status !== 0) {
		console.error(
			`sync: \`cargo ${args.join(' ')}\` failed in ${REPO}; the playground needs it ` +
				'(rustup target add wasm32-wasip1), or set DAZZLE_WASM to a built dz.wasm.',
		);
		process.exit(1);
	}
	wasm = path.join(REPO, 'target/wasm32-wasip1/release/dz.wasm');
}
fs.copyFileSync(wasm, path.join(OUT_GENERATED, 'dz.wasm'));

console.log(
	`sync: ${specPages.length + 1} spec pages and ${decisionPages.length + 1} decision pages from ${REPO}, and the compiler for the playground`,
);

// ---------------------------------------------------------------------------------------

function read(rel) {
	// The repository may be checked out with CRLF line endings on Windows.
	return fs.readFileSync(path.join(REPO, rel), 'utf8').replace(/\r\n?/g, '\n');
}

function write(file, meta, body) {
	const yaml = Object.entries(meta)
		.map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
		.join('\n');
	fs.writeFileSync(file, `---\n${yaml}\n---\n\n${body.trim()}\n`);
}

function frontmatter(text, file) {
	const m = text.match(/^---\n([\s\S]*?)\n---\n+/);
	if (!m) throw new Error(`sync: ${file} has no frontmatter`);
	const meta = {};
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (kv) meta[kv[1]] = kv[2].trim();
	}
	return { meta, body: text.slice(m[0].length) };
}

/** Headings outside fenced code, as { level, text }. */
function headings(text) {
	const out = [];
	let fence = null;
	for (const line of text.split('\n')) {
		const f = line.match(/^\s*(`{3,}|~{3,})/);
		if (f) {
			if (!fence) fence = f[1];
			else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
			continue;
		}
		if (fence) continue;
		const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
		if (h) out.push({ level: h[1].length, text: h[2] });
	}
	return out;
}

/** Markdown inline syntax reduced to the text a reader sees. */
function plainText(md) {
	return md
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`+([^`]*)`+/g, '$1')
		.replace(/\*\*|__/g, '')
		.replace(/(^|\W)[*_]([^*_]+)[*_](?=\W|$)/g, '$1$2');
}

/** A meta description: the first paragraph of prose, cut to about 155 characters. */
function describe(body) {
	// Prose paragraphs only, and more than one when the first is too short to say much.
	const paragraphs = body
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter((p) => p && !/^(#|\||```|~~~|:::|>|[-*+]\s|\d+\.\s)/.test(p));
	let text = '';
	for (const p of paragraphs) {
		text = `${text} ${plainText(p)}`.replace(/\s+/g, ' ').trim();
		if (text.length >= 100) break;
	}
	text = text.replace(/:$/, '.');
	if (text.length <= 155) return text;
	return `${text.slice(0, 154).replace(/\s+\S*$/, '')}…`;
}

/** D-0001 to D-0080 kept the numbers they had in §18's old table, where D-0032 was 18.32. */
function citation(id) {
	const n = Number(id.slice(2));
	return n <= 80 ? ` Older text cites it as \`18.${n}\`.` : '';
}

function withDecisionLists(body) {
	const list = (status) =>
		decisionPages
			.filter((d) => d.status === status)
			.map((d) => `- ${d.id}: ${d.title}`)
			.join('\n');
	return body
		.replace(/^The decisions with `status: decided`.*$/m, list('decided'))
		.replace(/^The decisions with `status: open`.*$/m, list('open'));
}

/**
 * Rewrites a page's links and adds § and D-NNNN links, leaving fenced code, code spans,
 * existing links and headings alone. `dir` is the page's folder in the repository, which
 * relative links are resolved against.
 */
function transform(text, dir) {
	const out = [];
	let fence = null;
	let prose = [];
	const flush = () => {
		if (prose.length) out.push(inline(prose.join('\n'), dir));
		prose = [];
	};
	for (const line of text.split('\n')) {
		const f = line.match(/^\s*(`{3,}|~{3,})/);
		if (fence) {
			out.push(line);
			if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
		} else if (f) {
			flush();
			fence = f[1];
			out.push(line);
		} else {
			prose.push(line);
		}
	}
	flush();
	return out.join('\n');
}

function inline(text, dir) {
	let out = '';
	let i = 0;
	let plain = '';
	let headingLine = /^#/.test(text);
	const emitPlain = () => {
		// Link only what is not on a heading line: a link inside a heading is noise.
		out += plain
			.split('\n')
			.map((part, k) => {
				if (k > 0) headingLine = /^#/.test(part);
				return headingLine ? part : crossReference(part);
			})
			.join('\n');
		plain = '';
	};
	const track = (s) => {
		const nl = s.lastIndexOf('\n');
		if (nl >= 0) headingLine = /^#/.test(s.slice(nl + 1));
	};
	while (i < text.length) {
		const ch = text[i];
		if (ch === '`') {
			const run = text.slice(i).match(/^`+/)[0];
			// A code span closes on a run of exactly as many backticks, within its paragraph.
			const rest = text.slice(i + run.length);
			const close = new RegExp(`(?<!\`)${run}(?!\`)`).exec(rest);
			const blank = rest.search(/\n\s*\n/);
			if (close && (blank < 0 || close.index < blank)) {
				const span = run + rest.slice(0, close.index + run.length);
				emitPlain();
				// A status marker, `[DECIDED — §18.53]`, links to the decision it cites.
				const marker = !headingLine && span.match(/^`\[(?:DECIDED|PROPOSED|OPEN)\b[^`]*?(§[\d.]+|D-\d{4})/);
				const target = marker && (marker[1].startsWith('§')
					? section(marker[1].slice(1))
					: decisions.get(marker[1])?.url);
				out += target ? `[${span}](${target})` : span;
				track(span);
				i += span.length;
				continue;
			}
			plain += run;
			i += run.length;
			continue;
		}
		if (ch === '[' || (ch === '!' && text[i + 1] === '[')) {
			const m = text
				.slice(i)
				.match(/^!?\[((?:[^[\]]|\[[^\]]*\])*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/);
			if (m) {
				emitPlain();
				const link = `${m[0].startsWith('!') ? '!' : ''}[${m[1]}](${rewriteUrl(m[2], dir)}${m[3]})`;
				out += link;
				track(link);
				i += m[0].length;
				continue;
			}
		}
		plain += ch;
		i += 1;
	}
	emitPlain();
	return out;
}

function crossReference(s) {
	return s
		.replace(/§(\d+(?:\.\d+)*)/g, (whole, num) => {
			const target = section(num);
			return target ? `[${whole}](${target})` : whole;
		})
		.replace(/\bD-(\d{4})\b/g, (whole) => {
			const d = decisions.get(whole);
			return d ? `[${whole}](${d.url})` : whole;
		});
}

/** The URL for a section number, falling back to the nearest enclosing section. */
function section(num) {
	const m = num.match(/^18\.(\d+)$/);
	if (m) {
		const d = decisions.get(`D-${m[1].padStart(4, '0')}`);
		if (d) return d.url;
	}
	let key = num;
	while (key) {
		const s = sections.get(key);
		if (s) return s.anchor ? `${s.page}#${s.anchor}` : s.page;
		key = key.includes('.') ? key.slice(0, key.lastIndexOf('.')) : '';
	}
	return null;
}

function rewriteUrl(url, dir) {
	if (/^[a-z]+:|^#|^\//i.test(url)) return url;
	const [target, hash = ''] = url.split('#');
	const anchor = hash ? `#${hash}` : '';
	const resolved = path.posix.normalize(path.posix.join(dir, target));
	const spec = resolved.match(/^docs\/spec\/(\d\d-[^/]+)\.md$/);
	if (spec) return `/spec/${spec[1]}/${anchor}`;
	if (resolved === 'docs/spec/README.md') return `/spec/${anchor}`;
	const decision = resolved.match(/^docs\/decisions\/(D-\d{4}-[^/]+)\.md$/);
	if (decision) return `/decisions/${decision[1].toLowerCase()}/${anchor}`;
	if (resolved === 'docs/decisions/README.md') return `/decisions/${anchor}`;
	const kind = fs.existsSync(path.join(REPO, resolved)) &&
		fs.statSync(path.join(REPO, resolved)).isDirectory() ? 'tree' : 'blob';
	return `${GITHUB}/${kind}/${BRANCH}/${resolved}${anchor}`;
}
