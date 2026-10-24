---
title: Modules and imports
description: How Dazzle organises code, and why. A module is a folder with a dazzle.toml manifest, its dependencies are declared once there for every file, and folders are organisation only.
---

Dazzle has no import line at the top of each file. **A module is a project**: a folder with a `dazzle.toml` that lists its source files, and **what the module can name is declared once, in that manifest**, for every one of its files.

This is the part of Dazzle that surprises people most, so the reasons come first.

## Why it works this way

Look at the top of the files in any large C++ or Rust project and you see the same list over and over: the engine, the math library, the containers, the logging. Every file restates what the whole project depends on, and every file can spell it differently. Dazzle states it once.

- **One list per module, not one per file.** In a game, the same engine, math and container types are used in nearly every file. Declaring them in the manifest means no file starts with twenty lines of imports, and adding a file needs no boilerplate.
- **A library has one name everywhere.** The manifest key is the name. With per-file aliases, one file can call a library `rl` and the next `raylib`; here every file writes the same thing, and swapping a library for another is a one-line change.
- **Moving a file never breaks anything.** Folders are organisation only, and declaration order never matters, so reorganising a project changes no code.
- **No silent surprises.** If two dependencies export the same name, using it bare is an error at the line that uses it, not a guess resolved by order. Reordering the manifest or upgrading a library can never quietly change which declaration a name means.
- **No leaking.** A library's own dependencies stay private unless it re-exports them, so you never end up depending on something you did not list, and a public API cannot mention a type its users cannot name. Those two failures, names leaking transitively and clashes settled silently, are what made C++'s `using namespace` a bad idea; Dazzle rules both out.

**The cost:** a bare name's origin is not written in the file that uses it. The editor shows it on hover, and go to definition takes you there.

There is precedent: C# projects declare global usings once per project, and Rust puts every Cargo dependency in scope under its manifest name. Dazzle takes the idea one step further and makes the manifest the only place.

```
game/
  dazzle.toml               module "game"
  src/
    main.dz
    gameplay/player.dz      just a folder: it means nothing to the compiler
  libs/
    engine/dazzle.toml      module "engine"
    physics/dazzle.toml     module "physics"
```

```toml
[module]
name    = "game"
sources = ["src/**/*.dz"]

[dependencies]
std    = { open = true }                        # String, List, Vec2: written bare
engine = { path = "libs/engine", open = true }  # Transform, and also engine::Transform
phys   = { path = "libs/physics" }              # always qualified: phys::Body
rl     = { cpp = "raylib" }                     # a C library: rl::DrawText
```

## The rules

**Folders are organisation only.** Every file in `src/**` sees every other file's declarations without importing anything, and declaration order never matters. Moving `player.dz` to another folder changes nothing anywhere.

**The key is the name, and you choose it.** `rl = { cpp = "raylib" }` means every file writes `rl::`. No file can call the library `rl` while the next calls it `raylib`, and swapping one library for another is a one-line change.

**`open = true` puts a dependency's exports at the root**, so they are written bare. A game opens what it uses on every line, like the standard library or its engine, and keeps a C API or a platform backend behind a name. `std` is a dependency like any other: it must be listed, and a module that does not open it writes `std::String`.

**No silent precedence.** If two opened dependencies both export `Vec2`, a bare `Vec2` is an error (`DZ0310`) on the line that writes it, not a guess. Write `std::Vec2`, or choose once for the whole module:

```toml
[names]
Vec2 = "std"
```

**Dependencies are private.** A library's own dependencies are invisible to the modules that use it, unless it marks one `pub = true`. Users then reach it one level down (`engine::math::Vec3`) and can rename or open it with `via`: `math = { via = "engine::math", open = true }`. A private dependency cannot leak through a `pub` signature (`DZ0311`), and a dependency nothing uses is a warning (`DZ0313`).

## `import`, as the exception

When one file wants something the manifest does not give it, it can bring in names or shorten a path, for that file only. It can never reach a module the manifest does not list:

```dz
import phys::{ Vec3, Body }     // a bare Vec3 is phys's in this file
import engine::render as gfx    // gfx::draw(...) in this file
```

## `::` and `.`

`::` is resolved at compile time and `.` at run time. `rl::shapes::Rectangle`, `Color::Red` and `List<f32>::with_capacity(8)` all use `::`. `.` is always a field or a method on a value, and it reaches through pointers on its own: there is no `->`.

## Visibility

Private is the default, and the compiler enforces it. A top-level declaration is visible in its own module, and outside it only when marked `pub`: the module is the boundary, and there is no file-level privacy. On a struct's fields and methods, private means only the struct's own methods:

```dz
pub struct SpriteBatch {
    m_verts:                 List<Vertex>    // private: only SpriteBatch's own methods
    pub(module) m_gl_handle: u32             // the rest of the engine may poke this
    pub         count:       u32             // anyone may read

    pub fn draw(&mut self, s: &Sprite) { ... }
    fn flush(&mut self) { ... }              // private helper
}
```

`protected` opens a member to the structs that inherit from this one, wherever they are written.

**Why private by default:** the compiler, not a naming convention, is what stops one layer of a codebase reaching into another's internals. And there is no file-level privacy on purpose: it would make every helper think about two boundaries instead of one, and the module is already the boundary. Keep modules small instead.

This is closer to C# projects or CMake targets than to Go or Rust, where the directory tree is the module tree.

## In the specification

[§3 Projects, modules and imports](/spec/03-projects-modules-and-imports/) and [§4 Visibility](/spec/04-visibility/), including build flags and how a library is built.
