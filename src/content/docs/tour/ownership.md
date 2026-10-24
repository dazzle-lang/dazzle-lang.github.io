---
title: Ownership and RAII
description: Dazzle's ownership model. RAII with three special members (constructor, drop, copy), own pointers, moves that reset the source, and no rule of five. How it lowers to C++.
---

A Dazzle struct has at most three special members, and that is the whole list:

- a **constructor**, named after the struct;
- **`drop`**, the destructor;
- **`copy`**, the copy constructor.

There is no move constructor, no move assignment, no copy assignment and no default constructor to write: the compiler derives them. A field marked **`own`** is a pointer the struct is responsible for releasing.

```dz
struct Image {
    pub width:  u32
    pub height: u32
    m_pixels:   own ^mut u8          // Image frees this; private, like every unmarked field

    Image(width: u32, height: u32) { // the constructor
        self.width = width
        self.height = height
        m_pixels = Allocators::Global.alloc(self.bytes(), 4)
    }

    fn bytes(&self) -> usize {
        return width as usize * height as usize * 4
    }
}

impl Drop for Image {                // runs exactly once, at the end of the owner's scope
    fn drop(&mut self) {
        Allocators::Global.free(m_pixels, self.bytes(), 4)
    }
}

impl Copy for Image {                // opt-in: without it, Image is move-only
    fn copy(&mut self, other: &Self) {
        width = other.width
        height = other.height
        m_pixels = Allocators::Global.alloc(self.bytes(), 4)
        unsafe {
            memcpy(m_pixels, other.m_pixels, self.bytes())
        }
    }
}

fn main() {
    let a = Image(64, 64)
    let b = a                        // a copy: runs `copy`
    let c = move(a)                  // a move: `a` is reset to its defaults
    println!("{} {}", b.width, c.width)
}                                    // c, b and a are dropped, in that order
```

An allocator is told the size and alignment it handed out, so it never has to store them. Run this with `dz run --track-memory` and it reports no leaks.

## The rules

**`own` makes a struct move-only.** A struct with an `own` field, or a `drop`, can only be moved (`move(x)`) unless it implements `Copy`. A plain struct of copyable fields is copyable with no code at all.

**An `own` field with no `drop` is a compile error**, so a resource cannot be acquired and forgotten:

```text
error[DZ0412]: `Image` owns a resource but never releases it
  ┌─ src/main.dz:4:5
  │
4 │     m_pixels:   own ^mut u8          // Image frees this; private, like every unmarked field
  │     ^^^^^^^^ this field is marked `own`
  │
  = help: add a `drop()` that releases `m_pixels`, or remove `own` if Image does not own this pointer (spec §6.5)
```

**A moved-from value is reset to its defaults**, not left in C++'s "valid but unspecified" state. Its `drop` still runs and does nothing, because `m_pixels` is now null. Reading it again is an error:

```text
error[DZ0401]: `a` was moved and cannot be used again
   ┌─ src/main.dz:38:26
   │
37 │     let c = move(a)                  // a move: `a` is reset to its defaults
   │             ------- moved here
38 │     println!("{} {} {}", a.width, b.width, c.width)
   │                          ^^^^^^^ used here after the move
   │
   = help: a moved-from value is left at its defaults, and reading it back would almost never be what was meant (spec §6.4)
```

**Every value is initialised.** `let img: Image` is an empty image, never garbage memory, and `copy` always runs on a value already at its defaults, so returning early from it leaves something valid.

## References, pointers and handles

- `&T` and `&mut T` are references. They are never null and **can never be stored in a field**, which is why Dazzle needs no lifetimes.
- `^T` and `^mut T` are C pointers. Reading or writing through one happens inside `unsafe`, so every place a dangling pointer can bite is marked.
- `own ^mut T` is a pointer this struct frees.
- The standard library has `Rc`, `Weak` and `Box` for everything in between.

Dazzle prevents use-after-move and double-free. It is not memory-safe in Rust's sense: see [Dazzle compared with Rust](/compare/rust/).

## Why it works this way

**Why three members?** In C++, a type that owns a resource needs a destructor, then a copy constructor, copy assignment, move constructor and move assignment to make copies and moves correct, and getting any one of them wrong is a silent bug. Four of those five follow mechanically from the other three, so Dazzle writes them. You write only what is specific to your type: how to build it, how to release it, and, if it can be copied, how.

**Why reset a moved-from value?** C++ leaves a moved-from object "valid but unspecified", so whether its destructor or a later use is safe depends on each type's author. Resetting it to its defaults makes the answer the same for every type: its `drop` runs and does nothing, because it now holds nothing. It costs a few stores per move and removes a whole category of bug, and reading it again is still a compile error.

**Why can't a reference be stored?** The most common dangling reference is one kept in an object that outlives what it points at. Banning references in fields makes that impossible, with no analysis at all, so Dazzle needs no lifetimes and no borrow checker. The cost is that a struct holding a context keeps a `^T` pointer instead, and a pointer that dangles is still your problem, but every use of it is marked `unsafe`.

**Why explicit allocators?** An implicit allocator removes the parameter from every signature, and with it the ability to tell from a call whether it allocates, or from where. Dazzle keeps the parameter and gives it a default, so ordinary code reads cleanly and code that cares, a frame arena in a game loop, says so at the call.

## What it becomes in C++

The three members map onto C++ special members, and the rest of the rule of five is synthesised, so C++ itself enforces destruction order, temporaries, and the deleted copy of a move-only type. Abridged from `dz cpp`'s output for `Image`:

```cpp
struct Image {
    uint32_t width{};
    uint32_t height{};
    uint8_t* m_pixels{};

    Image(uint32_t width, uint32_t height);   // the constructor
    size_t bytes() const;                     // a `&self` method is `const`
    Image() = default;                        // every field at its default
    ~Image();                                 // drop
    Image(const Image& other);                // copy
    Image& operator=(const Image& other);     // synthesised: drop, reset, copy
    Image(Image&& other);                     // synthesised: steal, reset the source
    Image& operator=(Image&& other);          // synthesised: drop, steal, reset the source
};

Image::Image(Image&& other) {
    width = other.width;
    height = other.height;
    m_pixels = other.m_pixels;
    other.reset_to_defaults__();              // the moved-from Image is empty, not unspecified
}
```

| Dazzle | C++ |
|---|---|
| `Image(w, h)` | `Image(uint32_t w, uint32_t h)` |
| `impl Drop`'s `drop` | `~Image()` |
| `impl Copy`'s `copy` | `Image(const Image&)`, run on a defaults-initialised `*this` |
| move | `Image(Image&&)`: memberwise steal, then reset the source to its defaults |
| copy and move assignment | destroy, reset, then copy or steal, with a self-assignment guard |
| a move-only type | its copy constructor and copy assignment `= delete`d |

The last row is a second line of defence: even if Dazzle's own move checking had a hole, the C++ compiler would refuse the copy.

## Allocators are explicit

If a line allocates, it says so. Containers take an allocator, defaulting to the C heap, so `List<i32>(8)` reads cleanly and `List<i32>(8, Allocators::Temp)` puts the list in this thread's scratch arena, freed in one go at the end of the frame:

```dz
fn update(&mut self, dt: f32) {
    defer Allocators::Temp.reset()

    let visible = self.cull(&camera, Allocators::Temp)   // freed at frame end, no bookkeeping
    for &e in visible { e.draw(&mut self.batch) }
}
```

`dz run --track-memory` records every allocation and reports leaks with the line that allocated them, plus double frees and mismatched frees. It costs nothing when it is off.

## In the specification

[§6 Value semantics](/spec/06-value-semantics-ownership-copy/) has the full ownership rules, and [§14](/spec/14-memory-and-allocators/) the allocators. The [ownership example](https://github.com/dazzle-lang/Dazzle/tree/master/examples/ownership) builds a growable array this way.
