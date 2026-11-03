---
title: Ownership and RAII
description: Dazzle's ownership model. RAII with three special members (constructor, drop, copy), own pointers, moves that reset the source, references checked by ties, and memory placed by the compiler. How it lowers to C++.
---

A Dazzle struct has at most three special members, and that is the whole list:

- a **constructor**, named after the struct;
- **`drop`**, the destructor;
- **`copy`**, the copy constructor.

There is no move constructor, no move assignment, no copy assignment and no default constructor to write: the compiler derives them. Nothing here names an allocator either: the compiler decides where each `String` and `List` keeps its memory ([below](#where-memory-comes-from)).

```dz
struct Level {
    pub name:    String
    pub enemies: List<i32>

    Level(name: &str) {                // the constructor
        self.name = String::from(name)
    }
}

impl Drop for Level {                  // runs exactly once, when its owner's scope ends
    fn drop(&mut self) {
        println!("unload '{}', {} enemies", name, enemies.len())
    }
}

impl Copy for Level {                  // opt-in: without it, a Level is move-only
    fn copy(&mut self, other: &Self) {
        name = other.name              // a String copies its text
        enemies = other.enemies        // a List copies its elements
    }
}

fn main() {
    let mut a = Level("forest")
    a.enemies.push(10)
    let b = a                          // a copy: runs `copy`
    let c = move(a)                    // a move: `a` is reset to its defaults
    println!("{} and {}", b.name, c.name)
}                                      // c, b, then a: a's drop runs on an empty Level
```

```text
forest and forest
unload 'forest', 1 enemies
unload 'forest', 1 enemies
unload '', 0 enemies
```

The `drop` here only prints, to show when it runs: a `String` and a `List` free their own memory, so a struct made of them needs no `drop` and no `copy` at all, and is freed, copied and moved with no code.

**`own` is for what Dazzle does not manage itself:** a surface, a file, a window or a GPU buffer that a C library handed over. A field marked `own` is a pointer the struct is responsible for releasing, so its `drop` gives it back to the library:

```dz
struct Image {
    pub width:  i32
    pub height: i32
    m_surface:  own ^mut sdl::SDL_Surface   // Image frees this; private, like every unmarked field

    Image(width: i32, height: i32) {
        self.width = width
        self.height = height
        m_surface = sdl::SDL_CreateSurface(width, height, .SDL_PIXELFORMAT_RGBA8888)
    }
}

impl Drop for Image {
    fn drop(&mut self) {
        sdl::SDL_DestroySurface(m_surface)
    }
}
```

## The rules

**`own` or `drop` makes a struct move-only.** A struct with an `own` field, or a `drop`, can only be moved (`move(x)`) unless it implements `Copy`. A plain struct of copyable fields is copyable with no code at all.

**An `own` field with no `drop` is a compile error**, so a resource cannot be acquired and forgotten:

```text
error[DZ0412]: `Surface` owns a resource but never releases it
  ┌─ src/main.dz:3:5
  │
3 │     m_pixels:  own ^mut u8          // memory a C library handed over
  │     ^^^^^^^^ this field is marked `own`
  │
  = help: add a `drop()` that releases `m_pixels`, or remove `own` if Surface does not own this pointer (spec §6.5)
```

**A moved-from value is reset to its defaults**, not left in C++'s "valid but unspecified" state. Its `drop` still runs, once, and finds nothing to release: that is the last line of the output above. Reading it again is an error:

```text
error[DZ0401]: `a` was moved and cannot be used again
   ┌─ src/main.dz:30:26
   │
29 │     let c = move(a)                    // a move: `a` is reset to its defaults
   │             ------- moved here
30 │     println!("{} {} {}", a.name, b.name, c.name)
   │                          ^^^^^^ used here after the move
   │
   = help: a moved-from value is left at its defaults, and reading it back would almost never be what was meant (spec §6.4)
```

**Every value is initialised.** `let level: Level` is an empty level, never garbage memory, and `copy` always runs on a value already at its defaults, so returning early from it leaves something valid.

## References, pointers and handles

- `&T` and `&mut T` are references, never null. A reference lives only where references live: a local, a parameter, a result, or a *view struct* such as an iterator. It never sits in an ordinary field or a container, so no struct carries a lifetime parameter.
- `^T` and `^mut T` are C pointers. Reading or writing through one happens inside `unsafe`, so every unchecked access is marked.
- `own ^mut T` is a pointer this struct frees.
- The standard library has `Rc`, `Weak` and `Box` for everything in between.

What the compiler checks about references is the bug C++ code actually has: a reference used after a call grew, shrank or freed the memory it points into. A type names its memory with **ties**, and every function says in its signature which ties it may end, with a **`kills`** clause. A call ends every reference into what it kills:

```dz
// in std's List: each signature says what a call may end
pub fn push(&mut self, v: T) kills self@items      // may move the array
pub fn len(&self) -> usize                         // no clause: kills nothing

// in your code
let n = counts.get_or_insert(word, 0)              // a reference into the table
counts.insert(other, 1)                            // may grow the table
n += 1        // error[DZ0413]: `insert` kills `counts@items`, and `n` points into it
```

The compiler checks each clause against its function's body, both ways, and `dz fix` writes the clause a body needs. Aliasing stays legal: a `&mut` and a `&` to one value are fine, as long as nothing in between can move the memory.

So use after move, double free, and a reference used after a call moved or freed what it points into are all compile-time errors. Closing the holes that remain, so that safe code has no undefined behaviour on one thread, is an open decision ([D-0094](/decisions/d-0094-safe-code-has-no-undefined-behaviour/)). [Dazzle compared with Rust](/compare/rust/) says how this differs from a borrow checker.

## Why it works this way

**Why three members?** In C++, a type that owns a resource needs a destructor, then a copy constructor, copy assignment, move constructor and move assignment to make copies and moves correct, and getting any one of them wrong is a silent bug. Four of those five follow mechanically from the other three, so Dazzle writes them. You write only what is specific to your type: how to build it, how to release it, and, if it can be copied, how.

**Why reset a moved-from value?** C++ leaves a moved-from object "valid but unspecified", so whether its destructor or a later use is safe depends on each type's author. Resetting it to its defaults makes the answer the same for every type: its `drop` runs and does nothing, because it now holds nothing. It costs a few stores per move and removes a whole category of bug, and reading it again is still a compile error.

**Why ties rather than lifetimes?** The most common dangling reference is one kept in an object that outlives what it points at, and keeping references out of ordinary fields rules that out with no analysis. What is left is the reference that a call invalidates, and a `kills` clause says that in the one place a reader looks: the signature. No struct carries a lifetime parameter, and the C++ shape of code, a pointer into an array you also change, stays legal as long as nothing in between can move the array.

**Why does the compiler place memory?** Passing an allocator to every container makes code that cares about memory say so, but every other line pays for it, and choosing wrong, a scratch arena for something that outlives the frame, is a dangling pointer. The compiler can see what outlives what, through the same ties, so it chooses: the fastest place it can prove safe, the heap otherwise.

## What it becomes in C++

The three members map onto C++ special members, and the rest of the rule of five is synthesised, so C++ itself enforces destruction order, temporaries, and the deleted copy of a move-only type. Abridged from `dz cpp`'s output for `Level`:

```cpp
struct Level {
    ::dz::std_::String name{};
    ::dz::std_::List__i32 enemies{};

    Level(::dz::str name);                    // the constructor
    Level() = default;                        // every field at its default
    ~Level();                                 // drop
    Level(const Level& other);                // copy
    Level& operator=(const Level& other);     // synthesised: drop, reset, copy
    Level(Level&& other);                     // synthesised: steal, reset the source
    Level& operator=(Level&& other);          // synthesised: drop, steal, reset the source
};

Level::Level(Level&& other) {
    name = static_cast<decltype(name)&&>(other.name);
    enemies = static_cast<decltype(enemies)&&>(other.enemies);
    other.reset_to_defaults__();              // the moved-from Level is empty, not unspecified
}
```

| Dazzle | C++ |
|---|---|
| `Level(name)` | `Level(::dz::str name)` |
| `impl Drop`'s `drop` | `~Level()` |
| `impl Copy`'s `copy` | `Level(const Level&)`, run on a defaults-initialised `*this` |
| move | `Level(Level&&)`: memberwise steal, then reset the source to its defaults |
| copy and move assignment | destroy, reset, then copy or steal, with a self-assignment guard |
| a move-only type | its copy constructor and copy assignment `= delete`d |

The last row is a second line of defence: even if Dazzle's own move checking had a hole, the C++ compiler would refuse the copy.

## Where memory comes from

Ordinary code names no allocator. `List<Enemy>()` and `String::from(name)` get their memory where the compiler can prove it safe: the region of the scope that owns them, released in one step when the scope ends; wherever the caller keeps a result; or else the heap. The same ties check every placement, the editor shows where each allocation went, and `dz placements` lists them with the reason for each:

```dz
fn update(&mut self, camera: &Camera) {
    let visible = self.cull(camera)      // built in update's region, released when it returns
    for e in visible {
        e.draw(&mut self.batch)
    }
}
```

Every build places memory this way; `DZ_REGIONS=0` builds the same program with every value on the heap, to compare against. `dz run --track-memory` records every allocation and reports leaks with the line that allocated them, plus double frees and mismatched frees. It costs nothing when it is off.

## In the specification

[§6 Value semantics](/spec/06-value-semantics-ownership-copy/) has the full ownership rules and [§6.7](/spec/06-value-semantics-ownership-copy/#67-ties-and-kills-clauses) ties, and [§14.6](/spec/14-memory-and-allocators/#146-placement-by-the-compiler) where the compiler places memory. The [ownership example](https://github.com/dazzle-lang/Dazzle/tree/master/examples/ownership) builds a growable array with `own`.
