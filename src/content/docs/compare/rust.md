---
title: Dazzle vs Rust
description: Dazzle compared with Rust. Both have traits, generics, checked moves and no exceptions, but Dazzle checks references with ties instead of lifetimes, compiles to C++, and uses C++ libraries from source.
---

Dazzle's syntax will look familiar to a Rust programmer: `fn`, `let`, `struct`, `impl Trait for Type`, `<T: Ord>` bounds, `::` paths. Several ideas are shared. The goal is different.

## What they share

- **No exceptions.** Failure is a value the type system tracks.
- **Traits** with static dispatch through bounds and dynamic dispatch through a fat pointer.
- **Generics checked at the definition** against their bounds, then monomorphized.
- **Moves** are checked, and use after a move is a compile error.
- **Tagged unions with exhaustive matching**, `union` and `switch` in Dazzle.
- **Private by default.**
- **Declarative, hygienic macros.**

## Where they differ

| | Rust | Dazzle |
|---|---|---|
| Memory safety | Guaranteed in safe code, by the borrow checker, threads included | Use after move, double free, and a reference used after a call moved or freed its memory are compile errors. Not yet guaranteed: closing the remaining holes in safe code is an open decision, and threads are not in the language yet |
| References | Lifetimes, which a struct can carry as parameters; a `&mut` is exclusive | Never in an ordinary field or container, so no struct has a lifetime parameter; each function's **`kills` clause** says which references a call ends. A `&mut` and a `&` may point at the same value |
| Memory | The global allocator; custom allocators per collection are not stable yet | **Placed by the compiler**: a scope's region when it can prove that safe, otherwise the heap. Ordinary code names no allocator |
| Raw pointers | `unsafe` to dereference | The same: `^T` is read or written inside `unsafe` |
| Errors | `Result<T, E>`, `?`, and an error type per library | `!->` on the signature and one `or` clause; one `Error` type, 32 bytes, never allocates |
| Absence | `Option<T>` | `T?`, handled by the same `or` clause |
| Moved-from values | Statically inaccessible | Reset to their defaults, and statically inaccessible |
| Copy semantics | `Copy` is bitwise; `Clone` is explicit | `copy` is a copy constructor, run on `let b = a` for types that implement it |
| Inheritance | None | Single struct inheritance with `virtual`/`override`, opt-in |
| Function overloading | None | None for now; default arguments cover most of it |
| Output | Machine code through LLVM | Standard C++17, compiled by clang++, g++ or a vendor's compiler |
| C++ libraries | Bindings through bindgen, cxx or similar | Built from source and imported directly, classes and overloaded methods included |
| Build | Cargo, with crates.io | `dz`, with a `dazzle.toml` per module; fetched dependencies are on the roadmap |
| Maturity | Stable since 2015, large ecosystem | Pre-release |

## The trade

Rust's borrow checker buys a guarantee, no data races and no dangling references in safe code, by making a `&mut` exclusive. Dazzle checks the bug C++ code actually has instead: a reference used after a call grew, shrank or freed the memory it points into. A type names its memory with **ties**, every function says in its signature which ties it may end, and a call ends every reference into what it kills. References stay out of ordinary fields, which removes the case lifetimes exist for, so no struct carries a lifetime parameter. Raw pointers are read and written only inside `unsafe`, where a reader or `grep` can find them.

What it buys back is the C++ shape of code: game-engine patterns with parents, handles and pointers into an array you also change, legal as long as nothing in between can move the array, and direct use of C++ libraries with no binding layer. What it does not have yet is Rust's whole guarantee: closing the holes safe code still has, so that it has no undefined behaviour on one thread, is [an open decision](/decisions/d-0094-safe-code-has-no-undefined-behaviour/), and threads come after the first release.

## Choose Rust if

- memory safety must be guaranteed today, threads included;
- you want a stable language and crates.io's ecosystem today;
- you do not need to call C++ classes directly.

## Choose Dazzle if

- you write C++ today and want deterministic destruction, encapsulation, errors as values and checked references, without lifetime annotations or exclusive `&mut`;
- you depend on C++ libraries and want to use them from source with no bindings;
- you want the output to be C++ that any C++ toolchain, including a vendor's, can compile.

## Read next

[Ownership and RAII](/tour/ownership/) · [Errors as values](/tour/errors/) · [Dazzle vs Zig](/compare/zig/)
