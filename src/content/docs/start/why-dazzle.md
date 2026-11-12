---
title: Why Dazzle
description: How Dazzle combines checked reference validity, automatic memory placement, and direct use of C and C++ libraries.
---

Dazzle is a systems language for code where you care when memory is allocated and released. It checks when references can become invalid and places allocations in scope regions when it can prove they will stay valid there. The region’s storage is reclaimed at scope exit, so ordinary code can use it without passing an allocator or waiting for a garbage collector. [See how two calls put strings in different regions](/tour/memory-placement/).

The same model works across calls. A helper can push a string into a caller’s list and build its text directly in that list’s region. When a function hands ownership to somewhere longer-lived, its signature tells the compiler what it must account for at the allocation site. Moves preserve the existing allocation. [Follow a receipt after checkout](/tour/memory-placement/#when-the-receipt-leaves-checkout).

## Why compile to C++?

Dazzle emits standard C++17. The C++ compiler does optimization and code generation. Debuggers and profilers can map generated code back to the `.dz` source, and Dazzle code can use existing C and C++ libraries through their headers. Library recipes can build the sources or use the library’s own CMake project. [C and C++ interop](/tour/cpp-interop/)

## Safe, without refusing aliasing

Dazzle specifies defined behavior for safe code on one thread. A reference to an order number stays valid while you update that order’s total. Adding an order can move the queue’s backing array. Its `push` method tells the compiler which references that operation can invalidate. [Reference safety](/tour/safety/)

## The principles

- **Make costs visible.** The compiler reports where allocations go and why. Destruction follows scope and ownership.
- **Make code straightforward.** RAII uses a constructor, `copy`, and `drop`. One `or` clause handles failure or absence. Generic errors point to the generic definition.
- **Keep native libraries available.** Dazzle can use existing C and C++ APIs, including C++ classes and overloads, directly.

<span id="what-it-is-not"></span>

## Current boundaries

The safety guarantee applies to single-threaded Dazzle code outside `unsafe`. Foreign code runs under its own language’s rules. Dazzle has its own source syntax and targets Windows, Linux, and macOS today. [Release status and roadmap](/project/status/)

## Who it is for

- **Game and engine developers** can explore [Breakout](https://github.com/dazzle-lang/Dazzle/tree/master/examples/breakout) on raylib or the [SDL3 scene](https://github.com/dazzle-lang/Dazzle/tree/master/examples/sdl3).
- **Native tool authors** can use deterministic destruction, use existing libraries, and inspect allocation decisions in source.
- **Teams with existing C++ code** can use the same C++ compiler and libraries while evaluating Dazzle for a module.
- **Embedded developers** can follow [the roadmap](/project/roadmap/) for freestanding targets.

## Designed to be learned from the compiler

A diagnostic has a stable code and can carry a concrete edit. Use `dz explain` for the rule and a corrected example. Use `dz fix` to apply the compiler’s available edits. `dz check --format=json` exposes the same diagnostics and edits to scripts and coding agents. [Try a diagnostic and its fix](/tour/tooling/#fix-a-missing-transfer-clause).

## Next

[Start the tour](/tour/overview/) · [Install Dazzle](/start/install/) · [Explore the benchmarks](/project/benchmarks/)
