---
title: Dazzle vs Rust
description: Dazzle compared with Rust. Both have traits, generics, moves and no exceptions, but Dazzle has no borrow checker or lifetimes, compiles to C++, and uses C++ libraries from source.
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
| Memory safety | Guaranteed in safe code, by the borrow checker | Not guaranteed. Use-after-move and double-free are prevented; dangling references are not. |
| References | Lifetimes, which can be stored in structs | `&T` can **never be stored in a field**, so there are no lifetimes |
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

Rust's borrow checker buys a guarantee: no data races and no dangling references in safe code. Dazzle deliberately does not make that trade. It keeps the C++ mental model, where you can hold a pointer into a structure you also mutate, and instead **marks** the risky places: every read or write through a raw pointer is inside `unsafe`, so a reader or `grep` can find them, and references cannot be stored, which removes most of the cases lifetimes exist for.

What it buys back is the C++ shape of code, game-engine patterns with parents, handles and pointers into arrays, without fighting the borrow checker, and direct use of C++ libraries with no binding layer.

## Choose Rust if

- memory safety must be guaranteed, not just made visible;
- you want a stable language and crates.io's ecosystem today;
- you do not need to call C++ classes directly.

## Choose Dazzle if

- you write C++ today and want deterministic destruction, encapsulation and errors as values without the borrow checker;
- you depend on C++ libraries and want to use them from source with no bindings;
- you want the output to be C++ that any C++ toolchain, including a vendor's, can compile.

## Read next

[Ownership and RAII](/tour/ownership/) · [Errors as values](/tour/errors/) · [Dazzle vs Zig](/compare/zig/)
