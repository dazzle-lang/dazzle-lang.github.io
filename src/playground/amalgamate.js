// One translation unit from the files `dz cpp` generates, for a compiler service that takes
// a single source.
//
// Every `.cpp` is concatenated, with each quoted `#include` of a generated header replaced
// by the header itself the first time it is seen. The headers carry include guards, so
// skipping a repeat is what the preprocessor would do anyway. File-local names in the
// runtime's two `.cpp` files do not collide, which is what makes one unit possible.

/**
 * @param {Map<string, string>} files generated file name -> contents
 * @returns {string}
 */
export function amalgamate(files) {
	const seen = new Set();
	const out = [];
	const expand = (name) => {
		seen.add(name);
		out.push(`// ---- ${name} ----`);
		for (const line of files.get(name).split('\n')) {
			const include = line.match(/^\s*#include "([^"]+)"/);
			if (include && files.has(include[1])) {
				if (!seen.has(include[1])) expand(include[1]);
			} else {
				out.push(line);
			}
		}
	};
	// The modules first, then the runtime's own units: those include the platform's headers,
	// and `<windows.h>` defines `near` and `far` as macros that would break any module code
	// after it. The entry point last.
	const cpp = [...files.keys()].filter((n) => n.endsWith('.cpp')).sort();
	const runtime = (n) => n.startsWith('dz_');
	const units = [
		...cpp.filter((n) => !runtime(n)),
		...cpp.filter((n) => runtime(n) && n !== 'dz_main.cpp'),
		...cpp.filter((n) => n === 'dz_main.cpp'),
	];
	for (const unit of units) expand(unit);
	return out.join('\n');
}
