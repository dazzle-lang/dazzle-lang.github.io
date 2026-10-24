---
title: Where Dazzle stands
description: The status of the Dazzle programming language. What is done, what is in progress, the roadmap to 0.1, supported platforms and compilers, and how Dazzle is made.
---

:::caution[Pre-release]
The language is **0.1, unreleased**, and **expected to change**. Every change to it is a revision row in the [changelog](/spec/21-changelog/).
:::

Dazzle compiles and runs programs, checks ownership, calls C and C++, and has a language server; it already carries a small raylib game. It is not finished: 0.1 is declared once the editor support, the standard library and C++ interop are all complete. Until then the version number stays at 0.1, and the specification is revised rather than versioned.

## Status

| | |
|---|---|
| **Done** | lexer, parser, formatter · modules and visibility · type checker · C++ code generation · ownership · generics and traits · C and C++ interop from source · tagged unions and `switch` · macros · reflection · `dz test` · `dz bench` and the C++ comparison suite · `dz fix` and `dz explain` · CI on three platforms |
| **Mostly done** | the language server and VS Code extension: incremental analysis and the remaining quick fixes are still to come |
| **Now** | the standard library. Its criterion, a raylib game written without any C++, is met: [`examples/breakout`](https://github.com/dazzle-lang/Dazzle/tree/master/examples/breakout) |
| **Later** | dependencies fetched from git, Dazzle packages and C libraries alike, pinned by a lockfile; hot reload; freestanding targets for microcontrollers; the web through Emscripten; an installer that bundles libclang |

The milestones are in [spec §19](/spec/19-roadmap/), and the open work, task by task, is the [backlog](https://github.com/dazzle-lang/Dazzle/blob/master/docs/tasks.md).

## Compatibility

- **Platforms:** Windows, Linux and macOS. CI builds and tests on all three for every change.
- **C++ compilers:** clang++ and g++. The generated code is C++17, compiled with `-fno-exceptions -fno-rtti` and warning-clean under `-Wall -Wextra` on both; clang++ 21 and g++ 13 are verified. MSVC's `cl.exe` is not supported.
- **C and C++ libraries:** C, and C++ through namespaces, classes, methods, overloaded methods, references and named template instances. Overloaded free functions, variadic C functions and inheritance between imported C++ classes are not imported yet.
- **The output is plain C++**, so anything that links with C++ links with Dazzle.

## Follow along

- [The repository](https://github.com/dazzle-lang/Dazzle): star it to follow releases.
- [Design decisions](/decisions/): every question settled, and the ones still open.
- [The changelog](/spec/21-changelog/): every change to the language.
- [Contributing](https://github.com/dazzle-lang/Dazzle/blob/master/CONTRIBUTING.md): how to report a problem, propose a change, and build and test the compiler.

## How Dazzle is made

Dazzle is built with AI. The language's design is its author's: its syntax and semantics, and every decision recorded in the [design decisions](/decisions/). The compiler, its tests and much of the documentation are written by Claude, Anthropic's AI model, working from that design and the [specification](/spec/).

## License

[MIT](https://github.com/dazzle-lang/Dazzle/blob/master/LICENSE).
