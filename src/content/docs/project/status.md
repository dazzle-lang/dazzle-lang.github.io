---
title: Where Dazzle stands
description: The status of the Dazzle programming language. What 0.2 brought, what comes next, supported platforms and compilers, and how Dazzle is made.
---

:::note[0.2 is out]
**Dazzle 0.2** was released on 17 November 2026, two weeks after 0.1. The language is young and **still changes**. Every change to it is a revision row in the [changelog](/spec/21-changelog/). [The release](https://github.com/dazzle-lang/Dazzle/releases/tag/v0.2.0) has its notes and the downloads.
:::

Dazzle specifies defined behaviour for safe code on one thread. The compiler places allocations, uses C and C++ libraries built from source or fetched with git, and has a language server. The examples include a complete game and a real-time 3D scene. It is young: the standard library is still growing, and the editor still lacks some code actions and incremental analysis. The specification is revised rather than versioned, and each compiler release (`v0.1.0`, `v0.2.0`, …) says which revision it carries.

## What you can build today

The [examples](https://github.com/dazzle-lang/Dazzle/tree/master/examples) include a complete game on raylib, a real-time 3D scene on SDL3 with a Dear ImGui panel, rigid-body physics on Box2D and a synthesizer on miniaudio. Each is a project you can copy, and each builds its library from source.

## What 0.2 brought

Ownership transfers with `sends`, so the compiler places memory across calls. Values move by default, and a copy is written `a.clone()`. Builds keep what they compiled: a debug build of a small program from clean is as fast as its C++, and an edit to a 100-module program rebuilds faster than `make` does the same program in C++. The standard library has `BinaryHeap`, `Deque` and `BitSet`, and traits may have generic methods.

The SDL3 example's Dear ImGui panel is written as C++ writes it, `ImGui::Begin` and `ImGui::Text`, and its ImGui is fetched with git and pinned by a lockfile, as any dependency may now be. [The road to 0.2](/project/roadmap/) has every part, with its tasks and measurements.

## Later

A game of ten thousand lines to test the safety rules at scale, hot reload, microcontrollers, the web and threads. [After 0.2](/project/roadmap/#after-02) says a line about each, the milestones are in [spec §19](/spec/19-roadmap/), and the open work, task by task, is the [backlog](https://github.com/dazzle-lang/Dazzle/blob/master/docs/tasks.md).

**How fast it is today:** seven whole programs, each written idiomatically in both languages and built by the same compiler, take 0.70 to 1.06 times as long in Dazzle as in C++. Only the ray tracer with clang, by 6%, and the JSON reader and writer with g++, by 1%, are behind. The [benchmarks](/project/benchmarks/) have every run, and what is left.

## Compatibility

- **Platforms:** Windows, Linux and macOS. CI builds and tests on all three for every change.
- **C++ compilers:** clang++ and g++. The generated code is C++17, compiled with `-fno-exceptions -fno-rtti` and warning-clean under `-Wall -Wextra` on both; clang++ 19 and 21 and g++ 13 and 14 are verified. MSVC's `cl.exe` is not supported.
- **C and C++ libraries:** C, and C++ through namespaces, classes, methods, overloaded functions and methods, default arguments, references and named template instances. Variadic C functions and inheritance between imported C++ classes are not imported yet.
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
