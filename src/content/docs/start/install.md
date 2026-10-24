---
title: Install Dazzle
description: How to build the Dazzle compiler, dz, from source on Windows, Linux and macOS, with the C++ compiler and libclang it needs, and the VS Code extension.
---

There is no release yet, so Dazzle is built from source. An installer that bundles everything is planned.

## What you need

| | Why |
|---|---|
| A current stable **Rust** toolchain | to build `dz`, the compiler |
| **clang++** or **g++** with C++17 | `dz` compiles the C++ it generates with it |
| **libclang** (any recent LLVM) | to read C and C++ headers: your program's own, and `stdlib.h`, which the standard library's allocator calls `malloc` from |

Getting libclang:

- **Windows:** LLVM's installer.
- **Ubuntu and Debian:** the `libclang-dev` package.
- **macOS:** Xcode's command-line tools, or Homebrew's `llvm`.

## Build the compiler

```bash
git clone --recursive https://github.com/dazzle-lang/Dazzle.git
cd Dazzle
cargo build --release
```

`--recursive` fetches the C libraries the examples build from source, raylib and RGFW, which are git submodules. In a checkout made without it, run `git submodule update --init`. Nothing outside `examples/` needs them.

The compiler is then `target/release/dz` (`dz.exe` on Windows). Put it on your `PATH`.

`dz` finds libclang beside its own executable, in a `lib/` folder next to it, through the `LIBCLANG_PATH` environment variable, or in an installed LLVM.

## Choose a C++ compiler

`dz` uses the first of `clang++`, `g++` and `c++` it finds. Choose another with `--cxx`, the `DZ_CXX` environment variable, or `cxx` under `[build]` in the manifest.

clang++ 21 and g++ 13 are verified. On Windows that means clang++ or MinGW g++; MSVC's `cl.exe` is not supported, because `dz` passes GCC-style flags.

## The VS Code extension

The extension gives you highlighting, the language server, and run and debug buttons. It needs Node.js:

```bash
cd editors/vscode
npm install
npm run deploy
```

## Troubleshooting

If `dz` cannot find libclang, set `LIBCLANG_PATH` to the folder that holds it. For anything else, [open an issue](https://github.com/dazzle-lang/Dazzle/issues).

## Next

[Write your first program](/start/first-program/).
