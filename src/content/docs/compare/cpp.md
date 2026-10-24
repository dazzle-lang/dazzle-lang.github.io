---
title: Dazzle vs C++
description: Dazzle compared with C++ for C++ programmers. What changes (three special members, no exceptions, definition-checked generics, manifests instead of headers) and what stays, since Dazzle compiles to C++17.
---

Dazzle is meant as a replacement for C++ wherever it is used, and it compiles *to* C++17. So it keeps what C++ is chosen for, control, zero-cost abstraction, deterministic destruction and every C and C++ library, and changes how you write it.

## What stays

- **The machine model.** Values, pointers, stack and heap, structs laid out as C++ lays them out. No garbage collector and no runtime beyond a small shim.
- **RAII.** Destructors run deterministically at the end of scope, in reverse order.
- **Your libraries.** Dazzle calls C and C++ directly, classes, overloaded methods and template instances included, and builds them from source. See [C++ interop](/tour/cpp-interop/).
- **Your toolchain.** clang++ or g++ compiles the output; gdb, Visual Studio and profilers show your `.dz` source through `#line` directives.

## What changes

| C++ | Dazzle |
|---|---|
| The rule of five: destructor, copy and move constructors, copy and move assignment | **Three members**: a constructor, `drop` and `copy`. Moves and assignments are generated. |
| A moved-from object is "valid but unspecified" | A moved-from value is **reset to its defaults**, and using it again is a compile error |
| Uninitialised variables are allowed | **Every value is initialised**: fields have defaults |
| Exceptions, or error codes nobody checks | **Errors as values**: `!->` on the signature, one `or` clause to handle it, and an unhandled failure is a compile error |
| Templates checked at instantiation, with long error traces | **Generics checked at the definition**, against their bounds, then monomorphized by Dazzle |
| Headers, include order, the preprocessor | **Modules**: a `dazzle.toml` per module, no headers, declaration order irrelevant |
| `public` by convention, `struct` members public by default | **Private by default**, enforced by the compiler |
| Implicit numeric conversions | **None**: `as` casts you can see |
| Function overloading and ADL | **One name, one symbol** |
| Implicit constructors and conversion operators, anywhere | A type opts in with `impl ImplicitAs<T>`, and it converts **only when passed as an argument**, at most once |
| `->` and `.` | `.` reaches through pointers on its own |
| Raw pointer use anywhere | Reading or writing through a raw pointer happens in **`unsafe`** |
| CMake, or another build system | `dz build`, and C and C++ libraries built from a manifest recipe |

## The same idea, side by side

A resource-owning type in C++ needs a destructor, and then the rule of five to make copies and moves correct:

```cpp
struct Image {
    uint32_t width = 0, height = 0;
    uint8_t* pixels = nullptr;

    Image(uint32_t w, uint32_t h);
    ~Image();
    Image(const Image&);
    Image& operator=(const Image&);
    Image(Image&&) noexcept;
    Image& operator=(Image&&) noexcept;
};
```

In Dazzle the struct says it owns the pointer, and writes only what is specific to it:

```dz
struct Image {
    pub width:  u32
    pub height: u32
    m_pixels:   own ^mut u8

    Image(width: u32, height: u32) { ... }
}

impl Drop for Image { fn drop(&mut self) { ... } }
impl Copy for Image { fn copy(&mut self, other: &Self) { ... } }   // or leave it move-only
```

Forget the `drop` and it is a compile error (`DZ0412`). The [ownership tour](/tour/ownership/) has the whole example, and the C++ it generates.

## Adopting it in a C++ codebase

The output is plain C++17, built with `-fno-exceptions -fno-rtti` and warning-clean under `-Wall -Wextra` on clang++ and g++, so anything that links with C++ links with Dazzle. `dz cpp` writes the C++ out, which lets a codebase adopt Dazzle one module at a time. Building a module straight to a static or shared library is declared in the manifest but not built yet.

## When to stay with C++

- You need a mature, stable language today: Dazzle is [pre-release](/project/status/) and still changing.
- You rely on MSVC's `cl.exe`, which Dazzle does not support yet.
- You depend on C++ features Dazzle does not import yet: overloaded free functions, variadic C functions, and inheritance between imported C++ classes.
- You rely on exceptions crossing your code.

## Read next

[Why Dazzle](/start/why-dazzle/) · [Errors as values](/tour/errors/) · [Dazzle vs Carbon and cpp2](/compare/carbon-cpp2/)
