// The playground: Dazzle on the left, the C++ it compiles to on the right, regenerated as
// you type. The compiler runs in a worker (`compiler.worker.js`); Run sends the C++ to
// Compiler Explorer (`godbolt.js`), since a browser has no C++ compiler of its own.

import { basicSetup, EditorView } from 'codemirror';
import { indentLess, indentMore } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import wasmUrl from '../../generated/dz.wasm?url';
import { amalgamate } from './amalgamate.js';
import { ansiToFragment } from './ansi.js';
import { dazzle } from './dazzle-mode.js';
import { COMPILERS, compileAndRun, shortLink } from './godbolt.js';

/** Where the program being written is kept between visits, in this browser only. */
const STORED = 'dazzle-playground-source';

const $ = (id) => document.getElementById(id);
const ui = {
	root: $('pg'),
	example: $('pg-example'),
	format: $('pg-format'),
	share: $('pg-share'),
	compiler: $('pg-compiler'),
	run: $('pg-run'),
	explorer: $('pg-explorer'),
	status: $('pg-status'),
	tabs: $('pg-tabs'),
	diagnostics: $('pg-diagnostics'),
	program: $('pg-program'),
};

// ---------------------------------------------------------------------------------------
// The examples, every one a program the site holds to compiling (or, for the mistake, to
// failing as shown).

const examples = Object.entries(
	import.meta.glob('./examples/*.dz', { query: '?raw', import: 'default', eager: true }),
)
	// In the order their numbers give, which the glob does not promise.
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([path, text]) => {
		const slug = path.match(/\/\d+-([\w-]+)\.dz$/)[1];
		// A Windows checkout has them with CRLF; the editor holds `\n` only.
		const label = slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
		return { slug, label, text: text.replace(/\r\n?/g, '\n') };
	});
for (const e of examples) ui.example.append(new Option(e.label, e.slug));
for (const c of COMPILERS) ui.compiler.append(new Option(c.name, c.id));

// ---------------------------------------------------------------------------------------
// Editors

const highlight = HighlightStyle.define([
	{ tag: [t.keyword, t.controlKeyword, t.modifier, t.operatorKeyword], color: 'var(--pg-keyword)' },
	{ tag: [t.typeName, t.className, t.namespace], color: 'var(--pg-type)' },
	{ tag: [t.string, t.character], color: 'var(--pg-string)' },
	{ tag: [t.number, t.atom, t.bool, t.null, t.self], color: 'var(--pg-number)' },
	{ tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--pg-comment)', fontStyle: 'italic' },
	{ tag: [t.meta, t.processingInstruction, t.macroName], color: 'var(--pg-meta)' },
	{ tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--pg-function)' },
]);
const theme = EditorView.theme({
	'&': { height: '100%', fontSize: '0.85rem', backgroundColor: 'var(--pg-bg)', color: 'var(--sl-color-white)' },
	'.cm-scroller': { fontFamily: 'var(--pg-mono)', lineHeight: '1.55' },
	'.cm-gutters': { backgroundColor: 'var(--pg-bg)', color: 'var(--sl-color-gray-3)', border: 'none' },
	'.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--pg-active)' },
	'.cm-cursor': { borderLeftColor: 'var(--sl-color-white)' },
	'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
		backgroundColor: 'var(--pg-selection) !important',
	},
	'&.cm-focused': { outline: 'none' },
});

/** Tab: spaces to the next multiple of four at each cursor, or indent a selection's lines. */
function tab(view) {
	const { state } = view;
	if (state.readOnly) return false;
	if (state.selection.ranges.some((r) => !r.empty)) return indentMore(view);
	view.dispatch(
		state.changeByRange((range) => {
			const line = state.doc.lineAt(range.head);
			const width = 4 - ((range.head - line.from) % 4);
			const spaces = ' '.repeat(width);
			return {
				changes: { from: range.head, insert: spaces },
				range: EditorSelection.cursor(range.head + width),
			};
		}),
		{ scrollIntoView: true, userEvent: 'input' },
	);
	return true;
}

const runKey = keymap.of([{ key: 'Mod-Enter', preventDefault: true, run: () => (run(), true) }]);

const source = new EditorView({
	parent: $('pg-editor'),
	state: EditorState.create({
		doc: initialSource(),
		extensions: [
			runKey,
			basicSetup,
			// Tab types spaces at the cursor up to the next stop, as in any code editor, and
			// indents the lines when there is a selection. Escape then Tab still leaves the
			// editor, so a keyboard user is never trapped in it.
			keymap.of([{ key: 'Tab', run: tab, shift: indentLess }]),
			indentUnit.of('    '),
			dazzle,
			syntaxHighlighting(highlight),
			theme,
			EditorView.updateListener.of((u) => u.docChanged && changed()),
		],
	}),
});

const output = new EditorView({
	parent: $('pg-output'),
	state: EditorState.create({
		extensions: [
			basicSetup,
			cpp(),
			syntaxHighlighting(highlight),
			theme,
			EditorState.readOnly.of(true),
		],
	}),
});

// ---------------------------------------------------------------------------------------
// The compiler

const worker = new Worker(new URL('./compiler.worker.js', import.meta.url), { type: 'module' });
let requests = 0;
const pending = new Map();
worker.onmessage = ({ data }) => {
	pending.get(data.id)?.(data);
	pending.delete(data.id);
};
function ask(kind, text) {
	const id = ++requests;
	return new Promise((resolve) => {
		pending.set(id, resolve);
		worker.postMessage({ id, kind, source: text, wasmUrl });
	});
}

/** The last successful compile's files, and which one is shown. */
let files = {};
let shown = 'playground.cpp';
let compiling = false;
let again = false;
let debounce;

function changed() {
	remember();
	const text = source.state.doc.toString();
	ui.example.value = examples.find((e) => e.text === text)?.slug ?? '';
	// A run's output belongs to the program as it was; once that changes, it is stale.
	if (!running) showProgram(null, RUN_HINT, 'pg-hint');
	clearTimeout(debounce);
	debounce = setTimeout(compile, 300);
}

async function compile() {
	if (compiling) {
		again = true;
		return;
	}
	compiling = true;
	status('Compiling…');
	const result = await ask('cpp', source.state.doc.toString());
	compiling = false;
	showDiagnostics(result.diagnostics);
	ui.root.dataset.failed = String(!result.ok);
	if (result.ok) {
		files = result.files;
		status(`Generated C++ in ${result.ms} ms`);
		showTabs();
	} else {
		status('Does not compile: see the diagnostics');
	}
	if (again) {
		again = false;
		compile();
	}
}

/** The generated files, most interesting first: the program's, then `std`, then the runtime. */
function order(names) {
	const rank = (n) =>
		n === 'playground.cpp' ? 0 : n === 'playground.h' ? 1 : n === 'dz_main.cpp' ? 2 : n.startsWith('std.') ? 3 : 4;
	return names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function showTabs() {
	const names = order(Object.keys(files));
	if (!names.includes(shown)) shown = names[0];
	ui.tabs.replaceChildren(
		...names.map((name) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.role = 'tab';
			b.textContent = name;
			b.setAttribute('aria-selected', String(name === shown));
			b.onclick = () => {
				shown = name;
				showTabs();
			};
			return b;
		}),
	);
	const text = files[shown] ?? '';
	if (output.state.doc.toString() !== text) {
		output.dispatch({ changes: { from: 0, to: output.state.doc.length, insert: text } });
	}
}

// ---------------------------------------------------------------------------------------
// Run, and Compiler Explorer

let running;
async function run() {
	if (ui.root.dataset.failed === 'true' || !files['dz_main.cpp']) {
		showProgram(null, 'Fix the errors above first: only a program that compiles can run.', 'ansi-red');
		return;
	}
	running = new AbortController();
	const name = ui.compiler.selectedOptions[0].text;
	const title = `Program, built with ${name} on Compiler Explorer`;
	ui.run.disabled = true;
	showProgram(title, 'Compiling and running…', 'pg-hint');
	try {
		const r = await compileAndRun(amalgamate(new Map(Object.entries(files))), ui.compiler.value, running.signal);
		if (!r.built) {
			// Generated C++ that does not compile is a compiler bug, never the program's fault.
			showProgram(title, `The generated C++ did not compile. This is a bug in Dazzle: please report it.\n\n${r.compiler}`, 'ansi-red');
		} else if (!r.ran) {
			showProgram(title, `The program was built but not run.\n\n${r.stderr}`, 'ansi-red');
		} else {
			const output = [r.stdout, r.stderr].filter(Boolean).join('\n') || '[no output]';
			const end = r.timedOut ? '[timed out]' : r.code !== 0 ? `[exited with ${r.code}]` : '';
			showProgram(title, output, null, end);
		}
	} catch (e) {
		showProgram(title, `Could not reach Compiler Explorer: ${e.message}`, 'ansi-red');
	} finally {
		running = null;
		ui.run.disabled = false;
	}
}

const RUN_HINT = 'Press Run, or Ctrl+Enter, to build and run the program.';

/** The compiler's part of the output pane: its diagnostics, coloured as in a terminal. */
function showDiagnostics(text) {
	const trimmed = text.trim();
	if (trimmed) ui.diagnostics.replaceChildren(ansiToFragment(trimmed));
	else ui.diagnostics.replaceChildren(quiet('dz: no errors'));
}

/** The program's part, under the compiler's: a title, then `body`, then how it ended. */
function showProgram(title, body, bodyClass, end) {
	const parts = [];
	if (title) parts.push(Object.assign(document.createElement('div'), { className: 'pg-title', textContent: title }));
	const text = document.createElement('span');
	text.textContent = body;
	if (bodyClass) text.className = bodyClass;
	parts.push(text);
	if (end) parts.push('\n', Object.assign(document.createElement('span'), { className: 'ansi-red', textContent: end }));
	ui.program.className = '';
	ui.program.replaceChildren(...parts);
}

function quiet(text) {
	return Object.assign(document.createElement('span'), { className: 'pg-quiet', textContent: text });
}

async function openExplorer() {
	if (!files['dz_main.cpp']) return;
	// Opened now, while the click still counts as the visitor's, and pointed at the link
	// once it exists; a window opened after the request would be blocked as a pop-up.
	const tab = window.open('', '_blank');
	try {
		const url = await shortLink(amalgamate(new Map(Object.entries(files))), ui.compiler.value);
		if (tab) tab.location.href = url;
		else window.location.href = url;
	} catch (e) {
		tab?.close();
		status(`Could not reach Compiler Explorer: ${e.message}`);
	}
}

// ---------------------------------------------------------------------------------------
// Format, share, and remembering what was written

async function format() {
	const result = await ask('format', source.state.doc.toString());
	if (!result.ok) {
		status('Format needs a program that parses');
		showDiagnostics(result.diagnostics);
		return;
	}
	if (result.text !== source.state.doc.toString()) {
		source.dispatch({ changes: { from: 0, to: source.state.doc.length, insert: result.text } });
	}
	status('Formatted');
}

async function share() {
	const code = await pack(source.state.doc.toString());
	const url = `${location.origin}${location.pathname}#code=${code}`;
	history.replaceState(null, '', url);
	try {
		await navigator.clipboard.writeText(url);
		status('Link copied');
	} catch {
		status('Link is in the address bar');
	}
}

/** Deflate and base64url, so a program fits in a link. */
async function pack(text) {
	const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
	const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function unpack(code) {
	const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
	return new Response(stream).text();
}

function remember() {
	try {
		localStorage.setItem(STORED, source.state.doc.toString());
	} catch {}
}
function initialSource() {
	try {
		return localStorage.getItem(STORED) ?? examples[0].text;
	} catch {
		return examples[0].text;
	}
}

function load(text) {
	source.dispatch({ changes: { from: 0, to: source.state.doc.length, insert: text } });
}

function status(text) {
	ui.status.textContent = text;
}

// ---------------------------------------------------------------------------------------

ui.example.onchange = () => {
	const e = examples.find((x) => x.slug === ui.example.value);
	if (e) load(e.text);
};
ui.format.onclick = format;
ui.share.onclick = share;
ui.run.onclick = run;
ui.explorer.onclick = openExplorer;

{
	const shared = location.hash.match(/^#code=([\w-]+)$/);
	if (shared) {
		unpack(shared[1]).then(load, () => status('That link does not hold a program'));
	} else {
		ui.example.value = examples.find((e) => e.text === source.state.doc.toString())?.slug ?? '';
	}
	compile();
}
