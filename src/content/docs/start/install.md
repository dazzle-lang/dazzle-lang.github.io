---
title: Install Dazzle
description: Install dz, the Dazzle compiler, with one command on Linux, macOS and Windows, or build it from source; the C++ compiler it needs; and the VS Code extension.
---

## Install

On **Linux** or **macOS**:

```bash
curl -fsSL https://dazzle-lang.github.io/install.sh | sh
```

On **Windows**, in PowerShell:

```powershell
irm https://dazzle-lang.github.io/install.ps1 | iex
```

The installer downloads the latest [release](https://github.com/dazzle-lang/Dazzle/releases), checks it against its checksum, unpacks it into `~/.dazzle` (`%USERPROFILE%\.dazzle` on Windows), and adds `~/.dazzle/bin` to your `PATH`. Run it again to update. Then:

```bash
dz new hello
cd hello
dz run
```

A release holds `dz` and, on Linux and Windows, the libclang it reads C and C++ headers with, so nothing else from LLVM needs to be installed. Releases are built for Linux on x86-64 and ARM64 (glibc 2.34 or newer: Ubuntu 22.04, Debian 12, Fedora 35 and later), macOS on Apple silicon, and Windows on x86-64. On anything else, [build from source](#build-from-source).

The installer reads three settings from the environment: `DAZZLE_HOME`, where to install; `DAZZLE_VERSION`, a release tag such as `v0.1.0` rather than the latest; and `DAZZLE_NO_MODIFY_PATH=1`, to leave your shell's startup files or your Windows `PATH` alone.

## A C++ compiler

`dz` writes C++17 and compiles it with your C++ compiler, which is the one thing it needs from the machine:

- **Linux:** g++ or clang++ from your distribution: `sudo apt install g++`, `sudo dnf install gcc-c++` or `sudo pacman -S gcc`.
- **macOS:** Xcode's command line tools, `xcode-select --install`. They also hold the libclang `dz` uses there.
- **Windows:** LLVM's clang++, `winget install LLVM.LLVM`, with the Visual Studio Build Tools for its C++ libraries; or MinGW's g++. MSVC's `cl.exe` is not supported, because `dz` passes GCC-style flags.

`dz` uses the first of `clang++`, `g++` and `c++` it finds. Choose another with `--cxx`, the `DZ_CXX` environment variable, or `cxx` under `[build]` in the manifest. clang++ 19 and 21 and g++ 13 and 14 are verified.

Some C libraries are built by their own CMake project, such as SDL3 in the `sdl3` example. Those need **CMake** too.

## The VS Code extension

The extension gives you highlighting, the language server, and run and debug buttons. Download `dazzle.vsix` from the [latest release](https://github.com/dazzle-lang/Dazzle/releases/latest) and install it:

```bash
code --install-extension dazzle.vsix
```

It runs the `dz` on your `PATH`.

## Build from source

You need a current stable **Rust** toolchain, a C++ compiler as above, and **libclang** from any recent LLVM: LLVM's installer on Windows, the `libclang-dev` package on Ubuntu and Debian, Xcode's command line tools or Homebrew's `llvm` on macOS.

```bash
git clone --recursive https://github.com/dazzle-lang/Dazzle.git
cd Dazzle
cargo build --release
```

`--recursive` fetches the C libraries the examples build from source, which are git submodules: raylib, SDL3, RGFW, sokol, stb, miniaudio and Box2D. In a checkout made without it, run `git submodule update --init`. Nothing outside `examples/` needs them.

The compiler is then `target/release/dz` (`dz.exe` on Windows). Put it on your `PATH`. `dz` finds libclang beside its own executable, in a `lib/` folder next to it, through the `LIBCLANG_PATH` environment variable, or in an installed LLVM.

To build the VS Code extension from the checkout instead (it needs Node.js):

```bash
cd editors/vscode
npm install
npm run deploy
```

## Troubleshooting

If `dz` cannot find libclang, set `LIBCLANG_PATH` to the folder that holds it. For anything else, [open an issue](https://github.com/dazzle-lang/Dazzle/issues).

## Next

[Write your first program](/start/first-program/).
