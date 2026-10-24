---
title: Why Dazzle
description: Why Dazzle exists, the six principles that shape it, and what it deliberately does not try to be. A systems language between C++ and Odin.
---

C++ gives you control and abstraction, but buries them under undefined behaviour and syntax nobody can hold in their head. Odin gives you clarity, but takes away encapsulation, RAII, and the layered abstractions that hold up in a large codebase. **Dazzle aims at the space between the two**: a systems language with C++'s control, a much smaller surface, and a compiler that teaches you the rules rather than punishing you for them.

It compiles to readable C++17, so it runs everywhere C++ does, links with everything C++ links with, and uses C and C++ libraries directly from their source.

## The principles

In priority order. When two conflict, the earlier one wins.

1. **You can always see the machine.** No hidden allocations, no hidden control flow, no garbage collector, no runtime you did not ask for. If a line of Dazzle allocates, it says so.
2. **Destruction is deterministic and automatic.** RAII, with exactly three special members instead of C++'s five and a half: a constructor, `copy` and `drop`. [More on ownership](/tour/ownership/).
3. **Encapsulation is enforced, not conventional.** Private is the default. The compiler, not a naming convention, stops one layer reaching into another's internals.
4. **Errors point at your code.** Generics are checked where they are written and monomorphized by Dazzle, and the output carries `#line` directives, so a mistake in a generic function is reported in *that function*, not in a 400-line template instantiation trace.
5. **The escape hatch is a door, not a hole.** C++ interop is a first-class feature with a real header importer, not an `extern "C"` afterthought. raylib already works with no bindings. [More on interop](/tour/cpp-interop/).
6. **Compile fast.** Someone working in a large native codebase recompiles hundreds of times a day. A design that trades compile time for cleverness loses.

## What it is not

- **Not memory-safe in Rust's sense.** Dazzle prevents use-after-move and double-free, but it has no borrow checker and no lifetimes, so it does not prevent every dangling reference. What it does instead is *mark* the places a dangling pointer can bite: every read or write through a raw pointer sits inside `unsafe`, where a reader, or `grep`, can find it. References (`&T`) can never be stored in a field, which removes most of the cases that would need lifetimes.
- **No garbage collector, green threads or implicit runtime.**
- **Not source-compatible with C++.** Dazzle *calls* C++; it is not a superset of it.
- **Not small.** Odin is small, and that is part of the problem Dazzle is solving. Dazzle has traits, generics, single inheritance, tagged unions, macros and reflection, because large codebases need them.

## Who it is for

Anyone who writes C++ today because nothing else gives them the control, and would rather not:

- **Game and engine programmers.** This is the furthest along: raylib builds from source with no bindings, and the repository's [Breakout example](https://github.com/dazzle-lang/Dazzle/tree/master/examples/breakout) is a game with no C++ of its own.
- **Embedded and firmware developers.** No runtime, no garbage collector, deterministic destruction, and output compiled with `-fno-exceptions -fno-rtti` that any vendor toolchain accepts. Freestanding targets (no heap, no operating system) are on the [roadmap](/project/status/).
- **Tool and application authors**, where startup time and memory use matter.
- **Teams with an existing C++ codebase.** The output is plain C++, so Dazzle can be adopted one module at a time.

## Designed to be learned from the compiler

No model has Dazzle in its training data, and no new programmer has it in their head, so the compiler has to teach. Every diagnostic has a stable code, points at your code, and nearly always ends with a `help:` line that says what to write instead and which section of the [specification](/spec/) explains why. `dz explain DZ0510` prints the rule with a wrong and a right program. See [Tooling](/tour/tooling/).

## Next

- [Install `dz`](/start/install/) and run a program.
- Read how Dazzle compares with [C++](/compare/cpp/), [Rust](/compare/rust/), [Zig](/compare/zig/) or [Odin](/compare/odin/).
