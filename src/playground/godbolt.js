// Compiler Explorer (godbolt.org) builds and runs the generated C++: Dazzle itself runs in
// the browser, but a C++ compiler and somewhere to execute the program do not. Its API
// allows requests from any origin, and nothing is sent until the visitor asks.
//
// https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md

const API = 'https://godbolt.org/api';

/** The C++ compilers offered, newest of each. Compiler Explorer keeps old ids working. */
export const COMPILERS = [
	{ id: 'g162', name: 'GCC 16.2' },
	{ id: 'clang2310', name: 'Clang 23.1' },
];

/** What `dz build` compiles with (spec §16.5), at `-O1` to keep the compile quick. */
export const FLAGS = '-std=c++17 -fno-exceptions -fno-rtti -O1';

const lines = (output) => (output ?? []).map((l) => l.text).join('\n');

/**
 * Compile `source` as one translation unit and run it.
 * @returns {Promise<{ built: boolean, compiler: string, ran: boolean, code: number, stdout: string, stderr: string, timedOut: boolean }>}
 */
export async function compileAndRun(source, compiler, signal) {
	const response = await fetch(`${API}/compiler/${encodeURIComponent(compiler)}/compile`, {
		method: 'POST',
		signal,
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({
			source,
			options: {
				userArguments: FLAGS,
				executeParameters: { args: [], stdin: '' },
				compilerOptions: { executorRequest: true },
				filters: { execute: true },
				tools: [],
				libraries: [],
			},
			lang: 'c++',
			allowStoreCodeDebug: false,
		}),
	});
	if (!response.ok) {
		throw new Error(`Compiler Explorer answered ${response.status} ${response.statusText}`);
	}
	const result = await response.json();
	// An executor request answers with the run, and the build inside it.
	const run = result.execResult ?? result;
	const build = run.buildResult ?? result;
	return {
		built: build.code === 0,
		compiler: [lines(build.stdout), lines(build.stderr)].filter(Boolean).join('\n'),
		ran: !!run.didExecute,
		code: run.code,
		stdout: lines(run.stdout),
		stderr: lines(run.stderr),
		timedOut: !!run.timedOut,
	};
}

/** A short link that opens `source` in Compiler Explorer, compiled by `compiler`. */
export async function shortLink(source, compiler) {
	const response = await fetch(`${API}/shortener`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({
			sessions: [
				{
					id: 1,
					language: 'c++',
					source,
					compilers: [{ id: compiler, options: FLAGS }],
					executors: [{ compiler: { id: compiler, options: FLAGS } }],
				},
			],
		}),
	});
	if (!response.ok) {
		throw new Error(`Compiler Explorer answered ${response.status} ${response.statusText}`);
	}
	return (await response.json()).url;
}
