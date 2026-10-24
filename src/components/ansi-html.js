// Terminal colour codes into HTML, at build time: the server-side twin of
// src/playground/ansi.js, which builds DOM nodes in the browser. Both understand only what
// `dz` writes (reset, bold, the sixteen colours plain or as 256-colour indices below 16)
// and drop any other escape rather than show it.

const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * @param {string} text with ANSI escapes
 * @returns {string} HTML, with spans classed `ansi-bold` and `ansi-<colour>`
 */
export function ansiToHtml(text) {
	let html = '';
	let bold = false;
	let colour = null;
	let last = 0;
	const flush = (end) => {
		if (end <= last) return;
		const piece = escape(text.slice(last, end));
		const classes = [bold && 'ansi-bold', colour && `ansi-${colour}`].filter(Boolean);
		html += classes.length ? `<span class="${classes.join(' ')}">${piece}</span>` : piece;
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
	return html;
}
