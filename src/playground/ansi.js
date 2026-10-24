// Terminal colour codes into styled text: `dz` colours its diagnostics as it would in a
// terminal, and this turns the escapes into spans the page's theme colours.
//
// Only what `dz` writes is understood — SGR codes for reset, bold, and the sixteen colours,
// plain (`31`, `91`) or as 256-colour indices below 16 (`38;5;9`). Anything else is dropped,
// never shown as raw escape bytes.

const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

/**
 * @param {string} text with ANSI escapes
 * @returns {DocumentFragment} spans with classes `ansi-bold` and `ansi-<colour>`
 */
export function ansiToFragment(text) {
	const out = document.createDocumentFragment();
	let bold = false;
	let colour = null;
	let last = 0;
	const flush = (end) => {
		if (end <= last) return;
		const piece = text.slice(last, end);
		if (!bold && !colour) {
			out.append(piece);
			return;
		}
		const span = document.createElement('span');
		span.textContent = piece;
		if (bold) span.classList.add('ansi-bold');
		if (colour) span.classList.add(`ansi-${colour}`);
		out.append(span);
	};
	for (const m of text.matchAll(/\x1b\[([\d;]*)([A-Za-z])/g)) {
		flush(m.index);
		last = m.index + m[0].length;
		if (m[2] !== 'm') continue;
		const codes = (m[1] || '0').split(';').map(Number);
		for (let i = 0; i < codes.length; i++) {
			const c = codes[i];
			if (c === 0) [bold, colour] = [false, null];
			else if (c === 1) bold = true;
			else if (c === 22) bold = false;
			else if (c >= 30 && c <= 37) colour = NAMES[c - 30];
			else if (c >= 90 && c <= 97) colour = `bright-${NAMES[c - 90]}`;
			else if (c === 39) colour = null;
			else if (c === 38 && codes[i + 1] === 5) {
				const n = codes[i + 2];
				colour = n < 8 ? NAMES[n] : n < 16 ? `bright-${NAMES[n - 8]}` : null;
				i += 2;
			}
		}
	}
	flush(text.length);
	return out;
}
