---
title: The standard library
description: What Dazzle's standard library holds. List, HashMap, HashSet and SlotMap, String and text views, Box, Rc and Weak, vectors, quaternions and matrices, files and paths, time, random numbers and reflection, all written in Dazzle.
---

The standard library is one module, `std`, written in Dazzle and carried by the compiler. A project names it in its manifest like any other dependency, usually opened so its names are written bare (`std = { open = true }`). Only what a program uses is instantiated and emitted, so the parts a program never calls cost it nothing.

```dz
struct Count {
    pub word: String
    pub n:    i32 = 0
}

fn more(a: &Count, b: &Count) -> bool {
    return a.n > b.n || a.n == b.n && a.word < b.word
}

fn main() {
    let text = "the cat and the dog and the bird"
    let mut counts = HashMap<String, i32>()
    for word in text.split_whitespace() {
        let n = counts.get_or_insert(String(word), 0)
        n += 1
    }

    let mut sorted = List<Count>()
    for word, &n in counts {
        sorted.push(Count{ word: word, n: n })
    }
    sorted.sort_by(more)
    for c in sorted {
        println!("{} {}", c.word, c.n)
    }

    let to = Vec2{ x: 3, y: 4 }
    println!("{} away, {:.2} rad", to.length(), to.angle())
}
```

```text
the 3
and 2
bird 1
cat 1
dog 1
5 away, 0.93 rad
```

Nothing here names an allocator. Every container learns from the compiler where it was placed, and allocates there: the region of the scope that owns it, the place the caller keeps a result, or the heap ([Ownership](/tour/ownership/#where-memory-comes-from)).

## Containers

| | |
|---|---|
| **`List<T>`** | A growable array. `push`, `pop`, `insert`, `remove`, `swap_remove`, `retain`, `reverse`, `sort` and `sort_by`, slices with `as_slice`. Indexing is bounds-checked. The sort is an introsort: no allocation, `n log n` at worst, not stable. |
| **`HashMap<K, V>`** | A SwissTable: one control byte per slot, read eight at a time, so a lookup compares keys only where seven bits of the hash already match. `insert`, `get`, `get_mut`, `get_or_insert`, `remove`, `retain`, and iteration over pairs, keys or values. A `HashMap<String, V>` is looked up by a `&str` with no copy: `get_str`, `contains_str`, `remove_str`. |
| **`HashSet<T>`** | A set, on the same table. |
| **`SlotMap<T>`** | Values behind keys that stay valid while the value lives and are refused once it is removed, even if its slot is reused: handles for entities, resources and nodes. Iteration is over a packed array. |

Each container's `kills` clauses say which calls may move its elements, so a reference into one is checked across every call ([Safety](/tour/safety/#ties-and-kills-clauses)).

## Text

- **`String`** owns UTF-8 text. It is 32 bytes, and keeps text of up to 15 bytes inside itself, allocating nothing, as `std::string` does.
- **`&str`** is a view of text that something else owns: a literal, a `String`, or a piece of one. A `String` passed where a `&str` is wanted is borrowed for the call.
- **Reading text**, on a `String` or a `&str` alike: `starts_with`, `find`, `contains`, `trim`, `split`, `split_whitespace`, `lines`, `split_once`, `replace`, `parse_i64`, `parse_f32` and more. Pieces are views of the text they came from, never copies.
- **Characters** are decoded as they are read, with `chars()`. Positions are in bytes, and text is never cut inside a character.
- **Formatting**: `format!`, `println!` and `error(…)` check their format string against their arguments at compile time. A type is formatted by implementing `Format`.
- **C strings**: a `String` keeps a zero after its bytes, so it is passed where a header wants a `const char*` with no copy.

## Handles

- **`Box<T>`** owns one value behind a pointer: for a recursive type, or a value whose type is a base and whose contents are a derived struct. Dropping it drops the whole value.
- **`Rc<T>`** shares one value, with a count. **`Weak<T>`** points at it without keeping it alive, for a parent link or a cache. Both are single-threaded.

## Math

- **Vectors** `Vec2`, `Vec3`, `Vec4` of `f32`, and `Vec2i`, `Vec3i` of `i32`, with the operators and `dot`, `length`, `normalized`, `distance`, `lerp`, `cross`, `reflect`, `angle` and `rotated`. The integer vectors are `Hash`, so a grid position keys a `HashMap`.
- **`Quat`**, a rotation, and **`Mat4`**, column-major as OpenGL, Vulkan, Direct3D, Metal and SDL3's GPU API read it: `perspective`, `orthographic`, `look_at`, `inverse` and the rest.
- **Methods on numbers**: `x.sqrt()`, `angle.sin()`, `t.lerp(to, 0.5)`, `hp.clamp(0, max)`, and, since plain integer arithmetic wraps, `a.checked_add(b)`, `n.saturating_sub(1)` and `seed.wrapping_mul(31)` for when you want something else.

## Files, time and the process

- **`Path`**, **`File`** and **`Directory`**: `Path("saves") / "slot1.txt"`, `File::read_text`, `File::write_text`, `Directory::create`, `Directory::list`. Every call that touches the disk can fail, with an `IoError` code. Paths are UTF-8 on every platform, Windows included.
- **`Duration`**, **`Instant`** and **`Time`**: `Instant::now()`, `start.elapsed().as_secs_f32()`, `Time::sleep(d)`.
- **`Random`**: `Random::range(1, 7)`, `Random::chance(0.25)`, `Random::unit_vec2()`, and `Random::seed(n)` to make a run repeat exactly. It is SplitMix64: fast, and not for cryptography.
- **`Process`**: `Process::args()`, `Process::env(name)` and `Process::exit(code)`.

## Reflection

`typeinfo_of<T>()` reads one static table describing every type: names, fields, offsets, enum values, union variants and field tags. Structs carry no extra bytes for it. See [Types and generics](/tour/types-and-generics/#reflection-with-no-per-object-cost).

## The traits the language uses

`Drop`, `Copy`, `Eq`, `Ord`, `Hash`, the operator traits (`Add`, `Mul`, `Index`, …), `Iterate` for `for` loops, `Format` for `{}`, and `ImplicitAs` for the one conversion a type allows when it is passed as an argument. A program's own types implement them to join in.

## In the specification

[§14.4 The standard library](/spec/14-memory-and-allocators/#144-the-standard-library-std) and [§14.5 Handles](/spec/14-memory-and-allocators/#145-handles-rc-weak-and-box).
