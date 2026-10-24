// The programs in src/snippets/ and what the real compilers printed for them
// (scripts/capture.mjs), for the components that show them.

const sources = import.meta.glob('../snippets/*/main.{dz,cpp}', {
	query: '?raw',
	import: 'default',
	eager: true,
});
const captures = import.meta.glob('../snippets/*/capture.json', { import: 'default', eager: true });

/**
 * @param {string} name a folder in src/snippets/
 * @returns {{ dz: string, cpp?: string, capture: any }}
 */
export function snippet(name) {
	const capture = captures[`../snippets/${name}/capture.json`];
	const dz = sources[`../snippets/${name}/main.dz`];
	if (!capture || !dz) {
		throw new Error(`no snippet "${name}" in src/snippets/ (or no capture: run npm run capture)`);
	}
	return { dz, cpp: sources[`../snippets/${name}/main.cpp`], capture };
}

/** "g++ (GCC) 16.2.1 20260810" -> "g++ 16", "clang version 23.1.3" -> "clang 23" */
export function shortCompiler(cxx, version) {
	const major = version.match(/(\d+)\.\d+/)?.[1];
	return `${cxx === 'clang++' ? 'clang' : 'g++'} ${major ?? ''}`.trim();
}
