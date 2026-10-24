---
title: Dazzle vs Carbon and cpp2
description: Dazzle compared with the C++ successor languages Carbon and cpp2 (cppfront). All three aim to replace C++ while keeping its libraries, by different routes.
---

Carbon, cpp2 and Dazzle all start from the same place: C++ is chosen for control and its libraries, and its syntax and defaults are the cost. Each takes a different route out.

## cpp2 (cppfront)

cpp2 is Herb Sutter's experimental alternative syntax for C++, translated to C++ by `cppfront`. Its stated aim is to make C++ simpler and safer by default **while keeping C++'s semantics**: a cpp2 type is a C++ type, and cpp2 and ordinary C++ mix freely in one file.

Dazzle also compiles to C++, but it is **a different language with its own semantics**:

- its own module system (`dazzle.toml` manifests, no headers);
- errors as values instead of exceptions, with the output built `-fno-exceptions`;
- three special members, and moved-from values reset to their defaults;
- generics checked at the definition and monomorphized by Dazzle, not emitted as C++ templates;
- C++ libraries imported through libclang, rather than shared source.

**Choose cpp2** to modernise C++ code in place, keeping C++'s semantics and mixing old and new syntax in one file. **Choose Dazzle** for a language whose rules differ from C++'s on purpose, that calls C++ rather than being C++.

## Carbon

Carbon is an experimental successor language started at Google, aimed at large C++ codebases. Its centrepiece is **bidirectional interoperability with C++**, at the level of templates and inheritance, so a codebase can migrate file by file. It has its own toolchain built on LLVM, and plans a memory-safe subset.

| | Carbon | Dazzle |
|---|---|---|
| Output | Its own toolchain, through LLVM | C++17, compiled by clang++ or g++ |
| C++ interop | Bidirectional, deep, incremental migration as the goal | Calls C and C++ through libclang; Dazzle's output is plain C++ that C++ can link with |
| Memory safety | A safe subset planned | Not a goal; risky operations are marked `unsafe` |
| Generics | Checked generics, alongside templates | Checked at the definition, monomorphized by Dazzle |
| Status | Experimental | Pre-release; compiles and runs programs, with a language server |

**Choose Carbon** if you maintain a very large C++ codebase and plan to migrate it incrementally with deep two-way interop. **Choose Dazzle** if you want a smaller language now, that calls C and C++ libraries directly and whose output any C++17 toolchain, including a vendor's, can compile.

## What makes Dazzle different from all of them

- **It is usable for programs today**: it compiles, runs, checks ownership, calls C and C++, and has a language server and VS Code extension. A small raylib game is written in it.
- **The output is readable C++17**, so the "escape hatch" is the C++ compiler you already have.
- **It is built to be learned from the compiler**, with stable diagnostic codes, `help:` lines and `dz explain`.

## Read next

[Dazzle vs C++](/compare/cpp/) · [C and C++ interop](/tour/cpp-interop/) · [Where Dazzle stands](/project/status/)
