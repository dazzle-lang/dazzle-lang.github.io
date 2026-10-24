---
title: Dazzle vs Carbon and cpp2
description: Dazzle compared with the C++ successor languages Carbon and cpp2 (cppfront). Three ways to replace C++ while keeping its libraries, and what Dazzle offers that the others do not.
---

Carbon, cpp2 and Dazzle start from the same place: C++ is chosen for control and for its libraries, and its syntax and defaults are the price. All three want to keep the first and drop the second. They take different routes.

## Three routes

| | cpp2 (cppfront) | Carbon | Dazzle |
|---|---|---|---|
| What it is | A new syntax for C++, with C++'s semantics | A new language with its own toolchain | A new language that compiles to C++17 |
| Toolchain | Translates to C++ | Its own, built on LLVM | Your C++ compiler: clang++, g++, a vendor's |
| Semantics | C++'s | Its own | Its own |
| Mixing with C++ | In the same file | Bidirectional, deep interop | Calls C and C++ headers; its output is C++ that links with yours |
| Status | Experimental | Experimental | Pre-release: compiles, runs, checks ownership, has a language server |

## cpp2 (cppfront)

cpp2 is Herb Sutter's experimental alternative syntax for C++, translated to C++ by `cppfront`. Its aim is to make C++ simpler and safer by default **while keeping C++'s semantics**: a cpp2 type is a C++ type, and cpp2 and ordinary C++ mix in one file.

That is also its limit. Keeping C++'s semantics keeps what comes with them: exceptions, the rule of five, "valid but unspecified" moved-from objects, templates checked only at instantiation, headers and include order. Dazzle compiles to C++ too, but it is a different language, and it changes exactly those things:

- **errors as values** instead of exceptions, with the output built `-fno-exceptions`;
- **three special members**, with moves and assignments derived, and moved-from values reset to their defaults;
- **generics checked at the definition** and monomorphized by Dazzle, so a mistake is reported once, in your code;
- **modules declared in a manifest**, with no headers and no include order;
- **private by default**, enforced.

## Carbon

Carbon is an experimental successor language started at Google, aimed at very large C++ codebases. Its centrepiece is deep, **bidirectional interoperability with C++**, down to templates and inheritance, so a codebase can migrate file by file. It brings its own toolchain built on LLVM, and plans a memory-safe subset.

Dazzle shares Carbon's goal, an upgrade of C++ for the projects that use it, and takes the other route on the toolchain question.

### Where Dazzle's route pays off

- **It runs wherever C++17 runs, today.** Carbon has to bring its toolchain to each platform. Dazzle hands standard C++17, needing no exceptions and no RTTI, to the compiler the platform already has, including a console SDK's or an embedded vendor's.
- **Nothing underneath changes.** The C++ compiler's optimiser, debuggers, profilers and sanitizers apply as they are, with `#line` directives mapping everything back to your `.dz` source.
- **Adoption is a module at a time.** A Dazzle module is C++ to the code around it, so a project adopts it without changing its compiler or its build.
- **C and C++ libraries come from source.** `dz` builds a library from a few lines of manifest and imports its header with the same flags the output is compiled with: namespaces, classes, constructors, overloaded methods, references and template instances.
- **It is usable now.** Dazzle compiles and runs programs, checks ownership, has a language server and VS Code extension, a formatter, built-in tests and benchmarks, and a small game written in it.
- **A smaller language to learn**, built to be learned from the compiler: stable diagnostic codes, a `help:` line on nearly every error, and `dz explain`.

### Where Carbon's route pays off

- **Deeper interop.** Carbon aims to call C++ templates generically and to inherit from C++ classes. Dazzle imports the template instances you name, and inheritance between imported C++ classes is not supported yet.
- **Memory safety is on Carbon's roadmap.** Dazzle prevents use-after-move and double-free and marks raw-pointer access with `unsafe`, but a safe subset is not a goal.
- **Scale and backing.** Carbon is designed around migrating very large codebases, with a large team behind it.

## Which to choose

- **cpp2**, to modernise C++ code in place while keeping C++'s semantics.
- **Carbon**, for an incremental migration of a very large C++ codebase with deep two-way interop, once it is ready.
- **Dazzle**, for a language that fixes C++'s defaults instead of re-spelling them, that you can use today, and that works with the compiler, libraries and code you already have.

## Read next

[Why Dazzle compiles to C++](/start/why-dazzle/#why-compile-to-c) · [Dazzle vs C++](/compare/cpp/) · [C and C++ interop](/tour/cpp-interop/)
