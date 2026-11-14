---
title: Where Dazzle stands
description: The status of the Dazzle programming language. What is done, what is in progress, the plan for 0.2, supported platforms and compilers, and how Dazzle is made.
---

:::note[0.1 is out]
**Dazzle 0.1** was released on 4 November 2026. The language is young and **still changes**. Every change to it is a revision row in the [changelog](/spec/21-changelog/). Next is **0.2**: [the road to 0.2](/project/roadmap/) has the plan and how far along it is.
:::

Dazzle specifies defined behaviour for safe code on one thread. The compiler places allocations, uses C and C++ libraries built from source, and has a language server. The examples include a complete game and a real-time 3D scene. It is young: the standard library is still growing, and the editor still lacks some code actions and incremental analysis. The specification is revised rather than versioned, and each compiler release (`v0.1.0`, `v0.1.1`, …) says which revision it carries.

## What you can build today

The [examples](https://github.com/dazzle-lang/Dazzle/tree/master/examples) include a complete game on raylib, a real-time 3D scene on SDL3 with a Dear ImGui panel, rigid-body physics on Box2D and a synthesizer on miniaudio. Each is a project you can copy, and each builds its library from source.

## Next: 0.2

The development compiler has ownership transfers with `sends`, incremental builds, and direct Dear ImGui calls in the SDL3 example. Remaining work includes code generation and tooling fixes, `BinaryHeap`, `Deque` and `BitSet`, more C++ imports, and new benchmarks. [The road to 0.2](/project/roadmap/) tracks the work.

## Later

Packages fetched from git, a game of ten thousand lines to test the safety rules at scale, hot reload, microcontrollers, the web and threads. [After 0.2](/project/roadmap/#after-02) says a line about each, the milestones are in [spec §19](/spec/19-roadmap/), and the open work, task by task, is the [backlog](https://github.com/dazzle-lang/Dazzle/blob/master/docs/tasks.md).

**How fast it is today:** three whole programs, each written idiomatically in both languages and built by the same compiler, take 0.80 to 1.05 times as long in Dazzle as in C++: A\* search and the word count are faster than C++, A\* search mostly through its hash map, and the parser and evaluator is behind only with clang, by 5%. The [benchmarks](/project/benchmarks/) have every run, and what is left.

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
