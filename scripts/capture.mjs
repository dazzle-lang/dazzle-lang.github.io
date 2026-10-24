// Runs every program in src/snippets/ through the real compilers and records what they
// print, so the pages show real output and never a transcription of it.
//
//   DZ=../Dazzle/target/release/dz node scripts/capture.mjs
//
// For each src/snippets/<name>/:
// - `main.dz` is checked by `dz`. If it fails, the capture is that check: the diagnostics
//   exactly as a terminal shows them, colour codes included. If it passes, it is built with
//   `--release` and run, and the capture is what it printed and how it exited.
// - `main.cpp`, when there is one, is compiled by g++ and clang++ with `-std=c++17 -O2`,
//   once as it is and once with `-Wall -Wextra`, then run. The capture keeps each
//   compiler's warnings, and the program's output and exit status.
//
// Each result goes to `capture.json` beside the sources, with the compilers' versions. It is
// checked in. `scripts/check-captures.mjs` (part of `npm run check`) re-runs the `dz check`
// captures with the dz.wasm the sync builds, and fails if any no longer match.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MANIFEST_TEXT } from './manifest.mjs';

const SITE = path.resolve(import.meta.dirname, '..');
const SNIPPETS = path.join(SITE, 'src/snippets');
const REPO = path.resolve(process.env.DAZZLE_REPO ?? path.join(SITE, '../Dazzle'));
const DZ = path.resolve(process.env.DZ ?? path.join(REPO, 'target/release/dz'));
const COMPILERS = ['g++', 'clang++'];


if (!fs.existsSync(DZ)) {
	console.error(`capture: no dz at ${DZ}. Build it (cargo build --release -p dz) or set DZ.`);
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts, env: { ...process.env, ...opts.env } });
	if (r.error) throw r.error;
	return { code: r.status ?? 128 + (r.signal ? os.constants.signals[r.signal] : 0), stdout: r.stdout, stderr: r.stderr };
}

const firstLine = (cmd) => run(cmd, ['--version']).stdout.split('\n')[0].trim();

const versions = {
	dz: run(DZ, ['--version']).stdout.trim(),
	dazzle_commit: run('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD']).stdout.trim(),
	...Object.fromEntries(COMPILERS.map((c) => [c, firstLine(c)])),
};

for (const name of fs.readdirSync(SNIPPETS).sort()) {
	const dir = path.join(SNIPPETS, name);
	if (!fs.existsSync(path.join(dir, 'main.dz'))) continue;
	const work = fs.mkdtempSync(path.join(os.tmpdir(), `dz-snippet-${name}-`));
	fs.mkdirSync(path.join(work, 'src'));
	fs.copyFileSync(path.join(dir, 'main.dz'), path.join(work, 'src/main.dz'));
	fs.writeFileSync(path.join(work, 'dazzle.toml'), MANIFEST_TEXT(name));

	// A terminal, as far as dz can tell, so the diagnostics come coloured.
	const env = { TERM: 'xterm-256color' };
	const check = run(DZ, ['check', '.'], { cwd: work, env });
	let dazzle;
	if (check.code !== 0) {
		dazzle = { command: 'dz check .', exit: check.code, output: check.stdout + check.stderr };
	} else {
		const built = run(DZ, ['build', '--release', '.'], { cwd: work, env });
		if (built.code !== 0) throw new Error(`${name}: dz build failed\n${built.stderr}`);
		const exe = path.join(work, 'build/bin', name);
		const ran = run(exe, [], { cwd: work });
		dazzle = { command: 'dz run --release .', exit: ran.code, output: ran.stdout + ran.stderr };
	}

	let cpp;
	if (fs.existsSync(path.join(dir, 'main.cpp'))) {
		cpp = {};
		for (const cxx of COMPILERS) {
			const out = {};
			for (const [key, flags] of [['plain', []], ['wall', ['-Wall', '-Wextra']]]) {
				const exe = path.join(work, `cpp-${cxx}-${key}`);
				const c = run(cxx, ['-std=c++17', '-O2', ...flags, path.join(dir, 'main.cpp'), '-o', exe]);
				if (c.code !== 0) throw new Error(`${name}: ${cxx} failed\n${c.stderr}`);
				const warnings = [...c.stderr.matchAll(/warning: (.*)$/gm)].map((m) => m[1].trim());
				const ran = run(exe, []);
				out[key] = { warnings, exit: ran.code, output: ran.stdout + ran.stderr };
			}
			cpp[cxx] = out;
		}
	}

	const capture = { versions, dazzle, ...(cpp ? { cpp } : {}) };
	fs.writeFileSync(path.join(dir, 'capture.json'), JSON.stringify(capture, null, '\t') + '\n');
	fs.rmSync(work, { recursive: true, force: true });
	console.log(`capture: ${name}: ${dazzle.command} -> exit ${dazzle.exit}`);
}
