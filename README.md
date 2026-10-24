# dazzle-lang.github.io

The website of the [Dazzle programming language](https://github.com/dazzle-lang/Dazzle), at
**https://dazzle-lang.github.io**. Built with [Starlight](https://starlight.astro.build).

## Where the pages come from

- **Hand-written:** `src/content/docs/` — the landing page, Start here, the Tour, the
  comparisons and the status page.
- **Generated from the Dazzle repository** by `scripts/sync.mjs`: the specification
  (`docs/spec/`) and the design decisions (`docs/decisions/`), plus the VS Code grammar
  that highlights `dz` code blocks. These are ignored by git; edit them in the Dazzle
  repository, and each page's "Edit page" link goes there.

- **The playground:** `src/pages/playground.astro` and `src/playground/`. The compiler in
  it is the real `dz`, built for WASI by the sync and run in a web worker over an in-memory
  project; it generates C++ with `--no-line-directives` as you type. **Run** amalgamates
  the generated files into one translation unit and sends it to
  [Compiler Explorer](https://godbolt.org)'s API to build and execute, since a browser has
  no C++ compiler. Its examples are `src/playground/examples/*.dz`.

The sync turns every `§N.M`, `D-NNNN` and `[DECIDED — §18.N]` into a link, and
`scripts/check-links.mjs` fails the build if any internal link or heading anchor is broken.

## Working on it

It needs Node.js, Rust with the `wasm32-wasip1` target (`rustup target add
wasm32-wasip1`), and a Dazzle checkout, by default beside this one (`../Dazzle`):

```bash
npm install
npm run dev                          # sync, then a dev server at localhost:4321
npm run build && npm run check       # what CI runs
DAZZLE_REPO=/path/to/Dazzle npm run dev
DAZZLE_WASM=/path/to/dz.wasm npm run dev   # use a dz.wasm already built, skipping cargo
```

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to
`master`, once a day (to pick up spec changes in the Dazzle repository), and when run by
hand from the Actions tab.
