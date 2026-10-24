---
title: Your first Dazzle program
description: Create a Dazzle project with a dazzle.toml manifest, write hello world, and build, run, test and format it with the dz command.
---

A Dazzle project is a folder with a `dazzle.toml` manifest. One manifest is one module.

```
hello/
  dazzle.toml
  src/
    main.dz
```

## The manifest

```toml
[module]
name    = "hello"
sources = ["src/**/*.dz"]

[dependencies]
std = { open = true }

[build]
output = "executable"
```

`sources` lists the module's files. Folders under `src/` are organisation only: every file sees every other file's declarations without an import, and declaration order never matters. `std = { open = true }` makes the standard library's names, like `String` and `List`, usable without a `std::` prefix. [Modules](/tour/modules/) has the rest.

## The program

`src/main.dz`:

```dz
fn main() {
    println!("Hello, world!")
}
```

Run it from the project folder:

```bash
dz run .
```

`dz` checks the program, writes C++17, compiles it with your C++ compiler, and runs it. To see the C++ it wrote, run `dz cpp .` and look in `build/cpp/`.

## The `dz` command

| Command | Does |
|---|---|
| `dz run [dir]` | build and run |
| `dz build [dir]` | build an executable into `build/bin/` |
| `dz check [dir]` | analyse only: every diagnostic, no C++ compiler needed (`--format=json` for JSON) |
| `dz fix [dir]` | apply the fixes the compiler is certain of (`--dry-run` to list them) |
| `dz explain <code>` | what a diagnostic means, with a wrong and a right program |
| `dz test [dir] [filter]` | run the `#[test]` functions, each in its own process |
| `dz bench [dir]` | time the `#[bench]` functions (release mode by default) |
| `dz fmt <file>` | format in place (`--stdout` to print instead, `--check` to only report) |
| `dz expand <file>` | the file with every macro invocation expanded |
| `dz cpp [dir]` | write the generated C++ to `build/cpp/` |
| `dz lsp` | the language server, on stdio |

`dir` defaults to the current directory. `run`, `build`, `cpp`, `test` and `bench` take `--debug` (the default), `--release` or `--shipping`. `--track-memory` records every allocation and reports leaks and bad frees when the program exits.

## A test, beside the code

Tests are part of the language. Put a `#[test]` function next to what it covers:

```dz
fn clamp01(x: f32) -> f32 {
    if x < 0 {
        return 0
    }
    if x > 1 {
        return 1
    }
    return x
}

#[test]
fn clamp_keeps_values_in_range() {
    assert(clamp01(2) == 1)
    assert(clamp01(-3) == 0, "negative values clamp to zero")
}
```

`dz test` runs each test in its own process, so one crash does not hide the others. A normal build leaves every test out.

## Examples to start from

| | |
|---|---|
| [`ownership`](https://github.com/dazzle-lang/Dazzle/tree/master/examples/ownership) | a growable array from scratch: `own`, the three special members, copies and moves; no C++ needed |
| [`raylib`](https://github.com/dazzle-lang/Dazzle/tree/master/examples/raylib) | a raylib window, with raylib compiled from source by `dz` |
| [`rgfw`](https://github.com/dazzle-lang/Dazzle/tree/master/examples/rgfw) | a window from RGFW, a single-header C library |
| [`breakout`](https://github.com/dazzle-lang/Dazzle/tree/master/examples/breakout) | a small game: the rules are plain Dazzle, drawn with raylib |

## Next

Take the tour, starting with [errors](/tour/errors/).
