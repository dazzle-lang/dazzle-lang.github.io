---
title: Dazzle vs Zig
description: Dazzle compared with Zig. Both avoid hidden control flow, treat errors as values and build C from source, but Dazzle has RAII, traits, private fields, compiler-placed memory and C++ class interop.
---

Zig and Dazzle agree on a lot of principles: no hidden control flow, no exceptions, no garbage collector, and building C libraries from source instead of shipping binaries. They disagree on who chooses where memory comes from, and on how much abstraction a systems language should have.

## What they share

- **No garbage collector and no hidden control flow.**
- **Errors are values**, marked on the signature: Zig's `!T` and `try`, Dazzle's `!->` and `or`.
- **`defer`.**
- **C libraries from source.** Zig builds C with its own toolchain; `dz` builds C and C++ from a manifest recipe with clang++ or g++.
- **Compile-time branching on types**, with the dead branch removed.

## Where they differ

| | Zig | Dazzle |
|---|---|---|
| Allocation | **Explicit**: a function that allocates takes an `Allocator` | **Placed by the compiler**: a scope's region when it can prove that safe, otherwise the heap; ordinary code names no allocator, and `dz placements` lists where each allocation went and why |
| Safety | Checks for illegal behaviour in Debug and ReleaseSafe builds, none in ReleaseFast; a dangling pointer is not a compile error | **No undefined behaviour in code without `unsafe`**, in every build: a reference a call invalidated is a compile error, every index is checked |
| Destruction | Manual, with `defer` and `errdefer` | **RAII**: `drop` runs automatically at the end of scope; `defer` is there for the rest |
| Copies and moves | Plain memory copies | `copy` and checked `move`; a type that owns a resource is move-only unless it implements `Copy` |
| Encapsulation | Struct fields are always public | Fields are **private by default**, enforced |
| Interfaces | Conventions, `anytype`, hand-written vtables | **Traits**, static or dynamic dispatch |
| Generics | `comptime` parameters, checked at each instantiation | Generics **checked at the definition** against bounds |
| Metaprogramming | `comptime`: ordinary Zig run at compile time | Declarative macros, reflection, compile-time type queries |
| Error payloads | An error set: a tag, with no message | An `Error`: code, message and source location, 32 bytes |
| Operator overloading | None | Through traits (`Add`, `Mul`, …) |
| Inheritance | None | Single struct inheritance, opt-in |
| C++ libraries | C only; C++ needs a C wrapper | **C++ classes, methods, overloads and template instances** imported directly |
| Output | Machine code, its own backends and LLVM | C++17 |
| Maturity | Pre-1.0, widely used | 0.1, released 2026 |

## The difference in one sentence

Zig removes abstractions so that nothing is hidden. Dazzle keeps the abstractions that large codebases rely on, RAII, encapsulation, traits and inheritance, and makes each one visible at the place it happens.

## Choose Zig if

- you want a small language with `comptime` as its one metaprogramming tool;
- you want to choose every allocator yourself, at every call;
- you want direct machine-code output and Zig's cross-compilation;
- you do not need C++ libraries.

## Choose Dazzle if

- you want destructors and enforced encapsulation, not just `defer` and conventions;
- you depend on C++ libraries, not only C;
- you want generic code checked once, where it is written.

## Read next

[Ownership and RAII](/tour/ownership/) · [Types, generics and traits](/tour/types-and-generics/) · [Dazzle vs Carbon and cpp2](/compare/carbon-cpp2/)
