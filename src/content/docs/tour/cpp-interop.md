---
title: C and C++ interop
description: How Dazzle uses C and C++ libraries straight from their source, and why. dz builds the library from a short manifest recipe and libclang turns its header into a Dazzle module, with no bindings.
---

A C or C++ library compiled from **source** is built by `dz` from a few lines of manifest, and its header is read by libclang. Its functions, structs, enums, macros, constants, namespaces and classes then become an ordinary Dazzle module. There is no binding generator to run, no wrapper to maintain, and no CMake.

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

## A bigger example

The repository's examples use [raylib](https://github.com/dazzle-lang/Dazzle/tree/master/examples/raylib) the same way. The recipe names its source folder, its `.c` files, its defines and the system libraries it links on each platform, and `dz` builds it before the program, with no prebuilt raylib and no CMake.

## Why it works this way

**Why from source?** A prebuilt library has to match your compiler, its flags and your platform, and a binding layer has to be regenerated and kept in step with every release of the library. Building from source with the program's own compiler removes both problems, and it works the same on a desktop, a console SDK or an embedded toolchain.

**Why libclang?** A header can only be understood by a C++ compiler: macros, `#if` branches, namespaces, templates. So Dazzle asks one. libclang reads the header with exactly the flags, include paths and defines the generated C++ is compiled with, so what Dazzle checks against is what the C++ compiler will compile against.

**Why name template instances?** A C++ template is checked only when it is instantiated, which is the opposite of Dazzle's generics. Asking for the instances you use (`shapes::Pair<int>`) turns each into an ordinary concrete type, with a clean signature and real error messages.

**The cost:** `dz` needs libclang to read headers, and a library is compiled from source the first time it is built.

## The other direction

What Dazzle produces is standard C++17, so anything that links with C++ links with Dazzle. `dz cpp` writes it out, which is how Dazzle can be adopted one module at a time inside an existing C++ codebase. The output is not meant to be read; it carries `#line` directives so gdb, the Visual Studio debugger and profilers show your `.dz` source instead.

## Requirements

`dz` needs libclang to read headers; see [Install](/start/install/). The C++ compiler that builds your program also builds the libraries.

## In the specification

[§15 C++ interoperability](/spec/15-c-interoperability/): what maps and how, overloads, templates, and exporting Dazzle to C++.
