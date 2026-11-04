---
title: C and C++ interop
description: How Dazzle uses C and C++ libraries straight from their source, and why. dz builds the library from a short manifest recipe or its own CMake project, and libclang turns its header into a Dazzle module, with no bindings.
---

A C or C++ library compiled from **source** is built by `dz` from a few lines of manifest, and its header is read by libclang. Its functions, structs, enums, macros, constants, namespaces and classes then become an ordinary Dazzle module. There is no binding generator to run, no wrapper to maintain, and no build system to write: a small library is compiled straight from its sources, and a large one with a CMake build of its own is built by its CMake.

## A recipe

A small C++ library, vendored as source:

```
vendor/shapes/
  shapes.cpp
  include/shapes.hpp
```

is named once in the manifest:

```toml
[dependencies]
shp = { cpp = "shapes" }

[cpp.libs.shapes]
root         = "vendor/shapes"
sources      = ["*.cpp"]
include_dirs = ["include"]
import       = ["shapes.hpp"]
keeps        = []                   # no function keeps a pointer past the call

[cpp.instantiate]
"shapes::Pair<int>" = "IntPair"     # a template, imported as the instance you name
```

and then used like any Dazzle module. From the repository's [`cppinterop` test](https://github.com/dazzle-lang/Dazzle/tree/master/tests/run/cppinterop):

```dz
fn main() {
    let a = shp::shapes::Point{ x: 1, y: 2 }
    let mut moving = shp::shapes::Point{ x: 3, y: 4 }
    shp::shapes::translate(&mut moving, 1, 1)     // `Point&` is a `&mut Point`

    let mut counter = shp::shapes::Counter(10)    // a C++ class and its constructor
    counter.add(5)                                // an overload set, resolved by argument type
    counter.add(a)                                //   …the other `add`
    println!("counter {}", counter.value())       // a `const` method

    let mut buf = shp::shapes::Buffer(4)          // a class C++ destroys itself: move-only here
    buf.fill(3)

    let pair = shp::IntPair(3, 9)                 // the named template instance
    println!("pair {} {}", pair.first(), pair.sum())
}
```

`dz` compiled `shapes.cpp` with the same compiler as the program, and the module key, `shp`, is the name every file uses for it.

## What maps

- **C:** functions, structs, unions, enums, array members and bit-fields, callbacks, `#define` constants, and types a header only declares (as opaque handles).
- **C++:** namespaces and nested namespaces, scoped enums, classes with constructors and `const` and mutating methods, overloaded methods chosen by argument type, `const T&` and `T&` as `&T` and `&mut T`, classes with destructors (move-only in Dazzle, destroyed by C++), and named template instances.

Not imported yet: overloaded *free* functions, variadic C functions, and inheritance between imported C++ classes. These are open tasks.

## Which calls are safe

Importing a header only teaches the compiler what exists. Whether a call into it is safe depends on what it can be handed:

- **A function that takes only values is safe to call**: numbers, enums, a C string, a callback, a handle, or a struct with no pointer inside. It cannot be handed a pointer to Dazzle memory to keep. Most of raylib is like this.
- **A function that takes a pointer or a reference, and a C++ method or constructor**, which C++ hands `this`, is `unsafe` to call until the recipe vouches for the library with **`keeps`**. C could keep the pointer after the call, and nothing in Dazzle would notice when what it points at drops.
- **With `keeps`, every such function is safe to call except the ones it lists**, which keep a pointer past the call and stay `unsafe`. `keeps = []` says none do; miniaudio's recipe lists `ma_device_init`, whose audio thread keeps the device it is given.

The claim is made once, in the manifest, where `grep` finds it, rather than with an `unsafe` at every call. [Safety](/tour/safety/) has the rest of what safe code promises.

## Bigger libraries

The repository's examples use larger libraries the same way, each built before the program, with nothing prebuilt:

- [**raylib**](https://github.com/dazzle-lang/Dazzle/tree/master/examples/raylib): the recipe names its source folder, its `.c` files, its defines and the system libraries it links on each platform.
- **A single-header library**, such as stb, RGFW or sokol, needs only `header = "RGFW.h"`: `dz` writes the one translation unit that compiles its implementation.
- [**SDL3**](https://github.com/dazzle-lang/Dazzle/tree/master/examples/sdl3) has a CMake build of its own, so its recipe names that instead. `dz` configures, builds and installs it as a static library with the program's own compilers, and rebuilds it only when something under it changes:

```toml
[cpp.libs.sdl3]
cmake   = "vendor/SDL"                     # a folder with a CMakeLists.txt
options = { SDL_TEST_LIBRARY = false }
import  = ["SDL3/SDL.h"]
```

## Why it works this way

**Why from source?** A prebuilt library has to match your compiler, its flags and your platform, and a binding layer has to be regenerated and kept in step with every release of the library. Building from source with the program's own compiler removes both problems, and it works the same on a desktop, a console SDK or an embedded toolchain.

**Why libclang?** A header can only be understood by a C++ compiler: macros, `#if` branches, namespaces, templates. So Dazzle asks one. libclang reads the header with exactly the flags, include paths and defines the generated C++ is compiled with, so what Dazzle checks against is what the C++ compiler will compile against.

**Why name template instances?** A C++ template is checked only when it is instantiated, which is the opposite of Dazzle's generics. Asking for the instances you use (`shapes::Pair<int>`) turns each into an ordinary concrete type, with a clean signature and real error messages.

**The cost:** `dz` needs libclang to read headers, and a library is compiled from source the first time it is built.

## The other direction

What Dazzle produces is standard C++17, so anything that links with C++ links with Dazzle. `dz cpp` writes it out, which is how Dazzle can be adopted one module at a time inside an existing C++ codebase. The output is not meant to be read; it carries `#line` directives so gdb, the Visual Studio debugger and profilers show your `.dz` source instead.

## Requirements

`dz` needs libclang to read headers, and CMake only for a library whose recipe names its CMake project; see [Install](/start/install/). The C++ compiler that builds your program also builds the libraries.

## In the specification

[§15 C++ interoperability](/spec/15-c-interoperability/): what maps and how, overloads, templates, and exporting Dazzle to C++.
