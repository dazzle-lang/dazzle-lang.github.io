// Fails if a compiler message shown on the site is no longer what `dz` prints.
//
// `scripts/capture.mjs` records each snippet's output with a native `dz`. This re-runs every
// capture that is a `dz check` with the dz.wasm `npm run sync` builds from the same Dazzle
// checkout, under Node's WASI, and compares the text colour codes and all. A change to a
// diagnostic's wording or layout then fails the site's build until the captures are
// re-recorded, so a page can never show a message the compiler stopped giving.
//
// Program output (a `dz run`) needs a C++ compiler and is not re-checked here; re-run
// capture.mjs after a change to the Dazzle repository.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WASI } from 'node:wasi';
import { MANIFEST_TEXT } from './manifest.mjs';

const SITE = path.resolve(import.meta.dirname, '..');
const SNIPPETS = path.join(SITE, 'src/snippets');
const WASM = path.join(SITE, 'generated/dz.wasm');

if (!fs.existsSync(WASM)) {
	if (process.env.CI) {
		console.error('check-captures: generated/dz.wasm is missing; `npm run build` should have built it.');
		process.exit(1);
	}
	console.warn('check-captures: no generated/dz.wasm (run `npm run sync`); skipped.');
	process.exit(0);
}

const module = await WebAssembly.compile(fs.readFileSync(WASM));
let failed = 0;
let checked = 0;

for (const name of fs.readdirSync(SNIPPETS).sort()) {
	const file = path.join(SNIPPETS, name, 'capture.json');
	if (!fs.existsSync(file)) continue;
	const capture = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (capture.dazzle.command !== 'dz check .') continue;

	const work = fs.mkdtempSync(path.join(os.tmpdir(), `dz-check-${name}-`));
	fs.mkdirSync(path.join(work, 'src'));
	fs.copyFileSync(path.join(SNIPPETS, name, 'main.dz'), path.join(work, 'src/main.dz'));
	fs.writeFileSync(path.join(work, 'dazzle.toml'), MANIFEST_TEXT(name));
	const outPath = path.join(work, 'stdout.txt');
	const errPath = path.join(work, 'stderr.txt');
	const out = fs.openSync(outPath, 'w');
	const err = fs.openSync(errPath, 'w');
	const wasi = new WASI({
		version: 'preview1',
		args: ['dz', 'check', '/project'],
		env: { TERM: 'xterm-256color' },
		preopens: { '/project': work },
		stdout: out,
		stderr: err,
		returnOnExit: true,
	});
	const instance = await WebAssembly.instantiate(module, wasi.getImportObject());
	const code = wasi.start(instance);
	fs.closeSync(out);
	fs.closeSync(err);
	// The native capture ran in the project folder; here it is mounted at /project.
	const text = (fs.readFileSync(outPath, 'utf8') + fs.readFileSync(errPath, 'utf8')).replaceAll('/project/', '');
	fs.rmSync(work, { recursive: true, force: true });

	checked++;
	if (code !== capture.dazzle.exit || text !== capture.dazzle.output) {
		failed++;
		console.error(`check-captures: ${name}: dz now prints something else. Re-run scripts/capture.mjs.`);
		console.error(`--- recorded (exit ${capture.dazzle.exit})\n${capture.dazzle.output}--- now (exit ${code})\n${text}`);
	}
}

if (failed) process.exit(1);
console.log(`check-captures: ${checked} compiler messages match dz`);
