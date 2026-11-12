// Re-run the displayed diagnostics, placements, and fixes with the WASI compiler from
// this site's build. Re-record them with capture.mjs if the compiler output changes.
// Program output (a dz run) is recorded by capture.mjs with a native C++ compiler.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { WASI } from 'node:wasi';
import { RECEIPT_SEND, MANIFEST_TEXT, SNIPPET_MODULE_NAME } from './manifest.mjs';

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
const temp = fs.realpathSync(os.tmpdir());
let failed = 0;
let checked = 0;

async function verify(name, command, source, expected) {
	const work = fs.mkdtempSync(path.join(temp, `dz-check-${name}-`));
	try {
		fs.mkdirSync(path.join(work, 'src'));
		fs.writeFileSync(path.join(work, 'src/main.dz'), source);
		fs.writeFileSync(path.join(work, 'dazzle.toml'), MANIFEST_TEXT(name));
		const outPath = path.join(work, 'stdout.txt');
		const errPath = path.join(work, 'stderr.txt');
		const out = fs.openSync(outPath, 'w');
		const err = fs.openSync(errPath, 'w');
		let code;
		try {
			const wasi = new WASI({
				version: 'preview1',
				args: ['dz', command, '/project', ...(command === 'cpp' ? ['--no-line-directives'] : [])],
				env: { TERM: 'xterm-256color' },
				preopens: { '/project': work },
				stdout: out,
				stderr: err,
				returnOnExit: true,
			});
			const instance = await WebAssembly.instantiate(module, wasi.getImportObject());
			code = wasi.start(instance);
		} finally {
			fs.closeSync(out);
			fs.closeSync(err);
		}
		// The native capture ran in the project folder. WASI mounts it at /project.
		const text = (fs.readFileSync(outPath, 'utf8') + fs.readFileSync(errPath, 'utf8')).replaceAll('/project/', '');
		checked++;
		if (command === 'cpp') {
			const generated = path.join(work, 'build/cpp', `${SNIPPET_MODULE_NAME(name)}.cpp`);
			if (code !== 0 || !fs.existsSync(generated)) {
				failed++;
				console.error(`check-captures: ${name}: WASI compiler did not generate C++ (exit ${code})\n${text}`);
			}
			return;
		}
		// Native and WASI builds can use different terminal colour support.
		if (code !== expected.exit || stripVTControlCharacters(text) !== stripVTControlCharacters(expected.output)) {
			failed++;
			console.error(`check-captures: ${name}: dz ${command} now prints something else. Re-run scripts/capture.mjs.`);
			console.error(`--- recorded (exit ${expected.exit})\n${expected.output}--- now (exit ${code})\n${text}`);
		}
	} finally {
		if (path.dirname(fs.realpathSync(work)) === temp) fs.rmSync(work, { recursive: true, force: true });
	}
}

for (const name of fs.readdirSync(SNIPPETS).sort()) {
	const dir = path.join(SNIPPETS, name);
	const file = path.join(dir, 'capture.json');
	if (!fs.existsSync(file)) continue;
	const capture = JSON.parse(fs.readFileSync(file, 'utf8'));
	const source = fs.readFileSync(path.join(dir, 'main.dz'), 'utf8');
	if (capture.dazzle.command === 'dz check .') await verify(name, 'check', source, capture.dazzle);
	if (capture.placements) {
		await verify(name, 'placements', source, capture.placements);
		await verify(name, 'cpp', source);
	}
	if (capture.missingSend) {
		const broken = source.replace(RECEIPT_SEND, '');
		await verify(name, 'check', broken, capture.missingSend);
		await verify(name, 'fix', broken, capture.fixedSend);
	}
}

if (failed) process.exit(1);
console.log(`check-captures: ${checked} compiler checks passed`);
