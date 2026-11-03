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

`own` is for memory and resources Dazzle does not manage itself: here raw bytes from the heap, elsewhere a surface, a file, a window or a GPU buffer from a C library. Dazzle's own data needs none of the three members: a struct of `List` and `String` fields is freed, copied and moved with no code at all, and ordinary code never names an allocator ([below](#where-memory-comes-from)). An allocator is told the size and alignment it handed out, so it never has to store them. Run this with `dz run --track-memory` and it reports no leaks.

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

[§6 Value semantics](/spec/06-value-semantics-ownership-copy/) has the full ownership rules and [§6.7](/spec/06-value-semantics-ownership-copy/) ties, and [§14.6](/spec/14-memory-and-allocators/#146-placement-by-the-compiler) where the compiler places memory. The [ownership example](https://github.com/dazzle-lang/Dazzle/tree/master/examples/ownership) builds a growable array with `own`.
