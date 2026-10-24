---
title: Why Dazzle
description: Why Dazzle exists, why it compiles to C++ instead of bringing its own toolchain, the principles that shape it, and what it deliberately does not try to be.
---

C++ is chosen for control: predictable performance, deterministic destruction, no garbage collector, and every C and C++ library ever written. What it costs is forty years of accumulated syntax, undefined behaviour, the rule of five, headers, exceptions most projects turn off, and template errors that point into code nobody wrote.

**Dazzle is an upgrade of C++.** Like Carbon, it is meant to replace C++ in the projects that use it, keeping the control and dropping the cost. Unlike Carbon, it does not bring a toolchain of its own: it compiles to standard C++17.

## Why compile to C++?

A successor to C++ has to work where C++ works: on every desktop, console and embedded target, with the vendor's compiler, inside build systems and codebases that already exist. Building a new LLVM-based toolchain means re-earning all of that, target by target. Compiling to C++ gets it on the first day.

- **Any C++17 compiler builds it**: clang++, g++, or a console SDK's or chip vendor's compiler. The output needs no exceptions and no RTTI, because console and embedded targets routinely turn both off.
- **Nothing underneath changes.** The C++ compiler's optimiser, debugger, profiler, sanitizers and build flags all still apply. `#line` directives map the output back to your `.dz` files, so the debugger steps through Dazzle, not through generated code.
- **It drops into an existing C++ project.** A Dazzle module is C++ to the code around it, so a codebase can adopt it one module at a time without changing its compiler or its build.
- **C++ does the jobs it already does well**, once per construct: destructors and their order, copy constructors, temporaries, struct layout, overload resolution in imported headers. Dazzle does the jobs C++ does badly, such as checking generics, itself.

The generated C++ is not meant to be read, any more than an object file is. It is full of `#line` directives, temporaries and helper functions. What you read and debug is the Dazzle source.

## The principles

In priority order. When two conflict, the earlier one wins.

1. **You can always see the machine.** No hidden allocations, no hidden control flow, no garbage collector, no runtime you did not ask for. If a line of Dazzle allocates, it says so.
2. **Destruction is deterministic and automatic.** RAII, with exactly three special members instead of C++'s five and a half: a constructor, `copy` and `drop`. [More on ownership](/tour/ownership/).
3. **Encapsulation is enforced, not conventional.** Private is the default. The compiler, not a naming convention, stops one layer reaching into another's internals.
4. **Errors point at your code.** Generics are checked where they are written and monomorphized by Dazzle, so a mistake in a generic function is reported in *that function*, not in a 400-line template instantiation trace.
5. **The escape hatch is a door, not a hole.** C++ interop is a first-class feature with a real header importer, not an `extern "C"` afterthought. [More on interop](/tour/cpp-interop/).
6. **Compile fast.** Someone working in a large native codebase recompiles hundreds of times a day. A design that trades compile time for cleverness loses.

## What it is not

- **Not memory-safe in Rust's sense.** Dazzle prevents use-after-move and double-free, but it has no borrow checker and no lifetimes, so it does not prevent every dangling reference. What it does instead is *mark* the places a dangling pointer can bite: every read or write through a raw pointer sits inside `unsafe`, where a reader, or `grep`, can find it. References (`&T`) can never be stored in a field, which removes the most common dangling case without any analysis.
- **No garbage collector, green threads or implicit runtime.**
- **Not source-compatible with C++.** Dazzle *calls* C++ and compiles *to* it; it is not a superset of it.
- **Not a minimal language.** Large codebases need abstraction, so Dazzle has traits, generics, single inheritance, tagged unions, macros and reflection. It keeps each of them visible at the place it acts.

## Who it is for

Anyone who writes C++ today because nothing else gives them the control:

- **Game and engine programmers.** This is the furthest along: the repository's [Breakout example](https://github.com/dazzle-lang/Dazzle/tree/master/examples/breakout) is a game with no C++ of its own, drawing through a C library built from source.
- **Embedded and firmware developers.** No runtime, no garbage collector, deterministic destruction, and output that a vendor's toolchain accepts. Freestanding targets (no heap, no operating system) are on the [roadmap](/project/status/).
- **Tool and application authors**, where startup time and memory use matter.
- **Teams with an existing C++ codebase**, who can adopt Dazzle one module at a time.

## Designed to be learned from the compiler

No model has Dazzle in its training data, and no new programmer has it in their head, so the compiler has to teach. Every diagnostic has a stable code, points at your code, and nearly always ends with a `help:` line that says what to write instead and which section of the [specification](/spec/) explains why. `dz explain DZ0510` prints the rule with a wrong and a right program. See [Tooling](/tour/tooling/).

## Next

- [Install `dz`](/start/install/) and run a program.
- See how Dazzle compares with [Carbon and cpp2](/compare/carbon-cpp2/), [C++](/compare/cpp/), [Rust](/compare/rust/) and [Zig](/compare/zig/).
