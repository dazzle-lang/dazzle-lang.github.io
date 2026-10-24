// Highlighting for Dazzle in CodeMirror: a small tokenizer over the lexical structure in
// spec §2. It only colours text; every question of meaning is the compiler's.

import { StreamLanguage } from '@codemirror/language';

// The keywords `dz_lex` reserves (spec §2.4), less the literals, which are atoms.
const KEYWORDS = new Set(
	'as break case ignore const continue defer else enum extern fn for if impl import in let macro module move mut own pub return struct switch trait or union while unreachable unsafe virtual override protected static async await where yield comptime'.split(
		' ',
	),
);
const ATOMS = new Set(['true', 'false', 'none', 'null']);
const PRIMITIVES = new Set(
	'i8 i16 i32 i64 isize u8 u16 u32 u64 usize f32 f64 bool char str cstr void'.split(' '),
);

const NUMBER = /^(?:0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:[iuf](?:8|16|32|64|size))?/;

export const dazzle = StreamLanguage.define({
	name: 'dazzle',
	startState: () => ({ comment: 0 }),
	token(stream, state) {
		// Block comments nest.
		if (state.comment > 0) {
			while (!stream.eol()) {
				if (stream.match('/*')) state.comment++;
				else if (stream.match('*/')) {
					if (--state.comment === 0) break;
				} else stream.next();
			}
			return 'comment';
		}
		if (stream.eatSpace()) return null;
		if (stream.match('//')) {
			stream.skipToEnd();
			return 'comment';
		}
		if (stream.match('/*')) {
			state.comment = 1;
			return 'comment';
		}
		if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
		if (stream.match(/^'(?:[^'\\]|\\.[^']*)'/)) return 'string';
		if (stream.match(NUMBER)) return 'number';
		// `#[test]`, and intrinsics such as `#location`.
		if (stream.match(/^#\[[^\]]*\]?/) || stream.match(/^#[A-Za-z_]\w*/)) return 'meta';
		if (stream.match(/^[A-Za-z_]\w*/)) {
			const word = stream.current();
			if (stream.peek() === '!') {
				stream.next();
				return 'macroName';
			}
			if (KEYWORDS.has(word)) return 'keyword';
			if (ATOMS.has(word)) return 'atom';
			if (word === 'self' || word === 'Self') return 'self';
			if (PRIMITIVES.has(word) || /^[A-Z]/.test(word)) return 'typeName';
			return stream.match(/^\s*\(/, false) ? 'variableName.function' : 'variableName';
		}
		if (stream.match(/^(?:!->|->|=>|::|[-+*/%=!<>&|^~?.:,;]+)/)) return 'operator';
		stream.next();
		return null;
	},
	languageData: { commentTokens: { line: '//', block: { open: '/*', close: '*/' } } },
});
