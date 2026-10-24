---
title: Tooling and error messages
description: Dazzle's compiler is built to teach. Stable diagnostic codes with help lines, dz explain, dz fix, JSON output, a language server and VS Code extension, a formatter, and built-in tests and benchmarks.
---

Dazzle is designed to be learned from the compiler. No model has Dazzle in its training data, and neither does a new programmer, so the compiler has to teach.

## Diagnostics that say what to do

- **Every diagnostic has a stable code**, like `DZ0510`. Codes are never reused, so you can search for one.
- **It points at your code**, never at generated C++.
- **It nearly always ends with `help:`**, saying what to write instead and which section of the [specification](/spec/) explains why.
- **One mistake, one error.** The parser suppresses cascades, so a typo does not produce four restatements of itself.

```text
error[DZ0510]: fallible call not consumed
  ┌─ src/main.dz:9:17
  │
9 │     let level = load("level1.dat")
  │                 ^^^^^^^^^^^^^^^^^^ a failure cannot be stored, only handled
  │
  = help: add an `or` clause: `let v = f() or return`, or `let v = f() or <fallback>` (spec §9.7)
```

## `dz explain`

```bash
dz explain DZ0510
```

prints the rule behind a diagnostic, why the rule exists, and a wrong and a corrected program.

## Errors you can apply

A diagnostic can carry the exact edit that fixes it. In the editor it is a quick fix: fill a `switch`'s missing arms, or implement a trait method an `impl` left out. On the command line, `dz fix` applies every fix the compiler is certain of (`--dry-run` lists them), and `dz check --format=json` gives every diagnostic, with its fixes, as JSON for scripts and AI agents.

## The language server and VS Code

`dz lsp` is a language server with diagnostics as you type, hover, go to definition, find references, rename, completion (including inside macro invocations and generic bodies), signature help, inlay hints and the outline. It keeps answering around syntax errors, because the lexer and parser never give up on half-typed code.

The VS Code extension adds highlighting, run and debug buttons, and debugger visualisers for Dazzle's types. See [Install](/start/install/#the-vs-code-extension).

## One format

`dz fmt` is the single canonical format. It only ever changes layout, and it refuses to touch a file with syntax errors rather than silently dropping the broken parts.

## Tests and benchmarks in the language

```dz
#[test]
fn clamp_keeps_values_in_range() {
    assert(clamp01(2) == 1)
    assert(clamp01(-3) == 0, "negative values clamp to zero")
}
```

`dz test` runs each test in its own process, so one crash does not hide the rest, and prints each failing test's own panic message. `#[bench]` functions are timed by `dz bench`, which builds in release mode and reports the fastest of five calibrated batches. The repository compares Dazzle against hand-written C++ this way: bounds-checked indexing, `drop` against a destructor, and `virtual` dispatch against C++'s own.

## Debugging the output

The generated C++ carries `#line` directives back to your `.dz` files, so gdb, LLDB, the Visual Studio debugger and profilers show your source. `--track-memory` records every allocation and reports leaks, double frees and mismatched frees with the line that caused them. `dz expand` shows exactly what a macro wrote.

## Planned

Tracked in the [backlog](https://github.com/dazzle-lang/Dazzle/blob/master/docs/tasks.md):

- diagnostics that recognise **habits from Rust and C++** (`Result<T, E>`, `x?`, `nullptr`, `p->x`, `Foo::new()`) and give the Dazzle spelling;
- `dz api <module>`, which prints a module's public surface, an imported C++ library's included, as Dazzle signatures;
- editor queries from the command line, machine-readable test output, and `dz run --frames N`, so a game can be checked without anyone watching its window.

## In the specification

[§17 Compiler architecture and toolchain](/spec/17-compiler-architecture-and-toolchain/).
