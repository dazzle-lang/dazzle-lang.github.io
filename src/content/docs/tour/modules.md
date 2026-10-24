---
title: Modules and imports
description: How Dazzle organises code. A module is a folder with a dazzle.toml manifest, dependencies are declared once there for every file, and folders are organisation only.
---

Dazzle has no import line at the top of each file. **A module is a project**: a folder with a `dazzle.toml` that lists its source files, and **what the module can name is declared once, in that manifest**, for every one of its files.

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

This is closer to C# projects or CMake targets than to Go, Rust or Odin, where the directory tree is the module tree.

## In the specification

[§3 Projects, modules and imports](/spec/03-projects-modules-and-imports/) and [§4 Visibility](/spec/04-visibility/), including build flags and how a library is built.
