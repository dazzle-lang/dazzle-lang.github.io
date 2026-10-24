// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const SITE = 'https://dazzle-lang.github.io';
const DESCRIPTION =
	'Dazzle is a successor to C++ that compiles to standard C++17: RAII with three special members, errors as values, enforced encapsulation, and C and C++ libraries used straight from source.';

// Copied from the Dazzle repository's VS Code extension by `scripts/sync.mjs`, so code
// blocks tagged `dz` are highlighted by the same grammar the editor uses.
const grammar = new URL('./generated/dazzle.tmLanguage.json', import.meta.url);
if (!fs.existsSync(grammar)) {
	throw new Error('generated/ is missing: run `npm run sync` (it needs a Dazzle checkout).');
}
const dazzle = { ...JSON.parse(fs.readFileSync(grammar, 'utf8')), name: 'dazzle', aliases: ['dz'] };

export default defineConfig({
	site: SITE,
	integrations: [
		starlight({
			title: 'Dazzle',
			description: DESCRIPTION,
			logo: { src: './src/assets/wordmark.png', alt: 'Dazzle', replacesTitle: true },
			favicon: '/favicon.png',
			social: [{ icon: 'github', label: 'Dazzle on GitHub', href: 'https://github.com/dazzle-lang/Dazzle' }],
			// Hand-written pages are edited here; the spec and decision pages set their own
			// `editUrl`, pointing at the Dazzle repository they come from.
			editLink: { baseUrl: 'https://github.com/dazzle-lang/dazzle-lang.github.io/edit/master/' },
			customCss: ['./src/styles/custom.css'],
			expressiveCode: { shiki: { langs: [dazzle] } },
			head: [
				// Google Search Console's proof that the site is ours.
				{ tag: 'meta', attrs: { name: 'google-site-verification', content: 'xpROJdr54LXtj4ZU42-KfJrLbymNsMIGi_1tUO_-Ml0' } },
				{ tag: 'meta', attrs: { property: 'og:image', content: `${SITE}/og.png` } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: 'Dazzle: a systems language that compiles to C++' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: `${SITE}/og.png` } },
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						'start/why-dazzle',
						'start/install',
						'start/first-program',
						{ label: 'Playground', link: '/playground/' },
					],
				},
				{
					label: 'Tour',
					items: [
						'tour/errors',
						'tour/ownership',
						'tour/modules',
						'tour/cpp-interop',
						'tour/macros',
						'tour/types-and-generics',
						'tour/tooling',
					],
				},
				{
					label: 'Compared with',
					items: ['compare/carbon-cpp2', 'compare/cpp', 'compare/rust', 'compare/zig'],
				},
				{
					label: 'Specification',
					collapsed: true,
					items: [{ autogenerate: { directory: 'spec' } }],
				},
				{
					label: 'Design decisions',
					collapsed: true,
					items: [{ autogenerate: { directory: 'decisions' } }],
				},
				{
					label: 'Project',
					items: [
						'project/status',
						{ label: 'Contributing', link: 'https://github.com/dazzle-lang/Dazzle/blob/master/CONTRIBUTING.md' },
						{ label: 'Backlog', link: 'https://github.com/dazzle-lang/Dazzle/blob/master/docs/tasks.md' },
					],
				},
			],
		}),
	],
});
