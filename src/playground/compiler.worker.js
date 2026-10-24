// Runs the Dazzle compiler — the real `dz`, built for WASI — on one source file.
//
// Each request is a fresh instance over a fresh in-memory project, `/project` holding a
// manifest and `src/main.dz`, so nothing one run leaves behind can reach the next. The
// module is compiled once; instantiating it again costs a few milliseconds.

import { ConsoleStdout, Directory, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim';

// Named rather than globbed: a literal path needs no directory listing.
const MANIFEST = `[module]
name = "playground"
sources = ["src/main.dz"]

[dependencies]
std = { open = true }

[build]
output = "executable"
`;

/** @type {Promise<WebAssembly.Module> | undefined} */
let compiled;

/**
 * Run `dz` with `args` over a project whose `src/main.dz` is `source`.
 * @returns {{ code: number, stdout: string, stderr: string, project: Directory }}
 */
function dz(module, args, source) {
	const encode = (text) => new File(new TextEncoder().encode(text));
	const root = new PreopenDirectory(
		'/project',
		new Map([
			['dazzle.toml', encode(MANIFEST)],
			['src', new Directory(new Map([['main.dz', encode(source)]]))],
		]),
	);
	const collect = () => {
		const decoder = new TextDecoder();
		const sink = { text: '' };
		sink.fd = new ConsoleStdout((bytes) => (sink.text += decoder.decode(bytes, { stream: true })));
		return sink;
	};
	const stdout = collect();
	const stderr = collect();
	// A terminal, as far as `dz` can tell, so its diagnostics come coloured (`ansi.js`).
	const env = ['TERM=xterm-256color'];
	const wasi = new WASI(['dz', ...args], env, [new OpenFile(new File([])), stdout.fd, stderr.fd, root]);
	const instance = new WebAssembly.Instance(module, { wasi_snapshot_preview1: wasi.wasiImport });
	let code;
	try {
		code = wasi.start(instance);
	} catch (e) {
		// A panic aborts, which reaches here as a trap; its message is already on stderr.
		code = 101;
		stderr.text += `\nThe compiler crashed (${e}). This is a bug in Dazzle: please report it.\n`;
	}
	return { code, stdout: stdout.text, stderr: tidy(stderr.text), project: root.dir };
}

/** Diagnostics name the file as the user knows it, not by its place in the virtual disk. */
function tidy(text) {
	return text.replaceAll('/project/src/main.dz', 'main.dz').replaceAll('/project/', '');
}

/** Every file `dz cpp` wrote, by name. */
function generated(project) {
	const dir = project.contents.get('build')?.contents.get('cpp');
	const files = {};
	if (!dir) return files;
	const decoder = new TextDecoder();
	for (const [name, file] of dir.contents) {
		if (file instanceof File) files[name] = decoder.decode(file.data);
	}
	return files;
}

self.onmessage = async ({ data }) => {
	const { id, kind, source, wasmUrl } = data;
	try {
		compiled ??= WebAssembly.compileStreaming(fetch(wasmUrl));
		const module = await compiled;
		const started = performance.now();
		if (kind === 'format') {
			const run = dz(module, ['fmt', '--stdout', '/project/src/main.dz'], source);
			self.postMessage({ id, ok: run.code === 0, text: run.stdout, diagnostics: run.stderr });
			return;
		}
		const run = dz(module, ['cpp', '/project', '--no-line-directives'], source);
		self.postMessage({
			id,
			ok: run.code === 0,
			diagnostics: run.stderr,
			files: run.code === 0 ? generated(run.project) : {},
			ms: Math.round(performance.now() - started),
		});
	} catch (e) {
		compiled = undefined;
		self.postMessage({ id, ok: false, diagnostics: `The compiler could not be loaded: ${e}\n`, files: {} });
	}
};
