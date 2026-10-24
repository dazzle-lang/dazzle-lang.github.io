---
title: C and C++ interop
description: How Dazzle uses C and C++ libraries straight from their source. dz builds the library from a short manifest recipe and libclang turns its header into a Dazzle module, with no bindings.
---

A C or C++ library compiled from **source** is built by `dz` from a few lines of manifest, and its header is read by libclang. Its functions, structs, enums, macros and constants then become an ordinary Dazzle module. There is no binding generator to run, no wrapper to maintain, and no CMake.

## A recipe

This is everything it takes to use raylib:

```toml
[dependencies]
rl = { cpp = "raylib" }

[cpp.libs.raylib]
root         = "vendor/raylib/src"
sources      = ["*.c"]
include_dirs = [".", "external/glfw/include"]
defines      = ["PLATFORM_DESKTOP", "GRAPHICS_API_OPENGL_33"]
import       = ["raylib.h"]

[cpp.libs.raylib.target.windows]
link_libs = ["opengl32", "gdi32", "winmm", "user32", "shell32"]
```

And then:

```dz
fn main() {
    rl::InitWindow(800, 450, "Dazzle")
    defer rl::CloseWindow()

    while !rl::WindowShouldClose() {
        rl::BeginDrawing()
        rl::ClearBackground(rl::RAYWHITE)
        rl::DrawCircleV(rl::GetMousePosition(), 8, rl::MAROON)
        rl::EndDrawing()
    }
}
```

`dz` compiled raylib from its own seven `.c` files. The module key, `rl`, is the name every file uses for it.

## C++, not just C

The importer covers C++ too: namespaces, classes, constructors, `const` and mutating methods, overloaded methods chosen by argument type, references, classes that C++ destroys itself, and named template instances. From the repository's [`cppinterop` test](https://github.com/dazzle-lang/Dazzle/tree/master/tests/run/cppinterop), which builds a small C++ library from source:

```dz
let mut counter = shp::shapes::Counter(10)    // a C++ class and its constructor
counter.add(5)                                // an overload set, resolved by argument type
counter.add(a)                                //   …the other `add`
shp::shapes::translate(&mut moving, 1, 1)     // `Point&` is a `&mut Point`
let pair = shp::IntPair(3, 9)                 // `[cpp.instantiate] "shapes::Pair<int>"`
```

A template is imported as the named instances you ask for, under `[cpp.instantiate]`. Dazzle has no function overloading of its own, but it calls C++ overload sets, resolving them by argument type.

Not imported yet: overloaded *free* functions, variadic C functions, and inheritance between imported C++ classes. These are open tasks.

## The other direction

The generated code is plain C++17, so anything that links with C++ links with Dazzle. `dz cpp` writes the output out, which is how Dazzle can be adopted one module at a time inside an existing C++ codebase. The output carries `#line` directives pointing back at your `.dz` files, so gdb, the Visual Studio debugger and profilers all show your source.

## Requirements

`dz` needs libclang to read headers; see [Install](/start/install/). The C++ compiler that builds your program, clang++ or g++, also builds the libraries.

## In the specification

[§15 C++ interoperability](/spec/15-c-interoperability/): what maps and how, overloads, templates, and exporting Dazzle to C++.
