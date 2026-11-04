---
title: Dazzle vs Rust
description: Dazzle compared with Rust. Both have traits, generics, checked moves and no exceptions, but Dazzle checks references with ties instead of lifetimes, accepts safe programs the borrow checker refuses, compiles to C++, and uses C++ libraries from source.
---

Dazzle's syntax will look familiar to a Rust programmer: `fn`, `let`, `struct`, `impl Trait for Type`, `<T: Ord>` bounds, `::` paths. Several ideas are shared. The goal is different.

## What they share

- **No exceptions.** Failure is a value the type system tracks.
- **Traits** with static dispatch through bounds and dynamic dispatch through a fat pointer.
- **Generics checked at the definition** against their bounds, then monomorphized.
- **Moves** are checked, and use after a move is a compile error.
- **Tagged unions with exhaustive matching**, `union` and `switch` in Dazzle.
- **Private by default.**
- **Declarative, hygienic macros.**

## Where they differ

| | Rust | Dazzle |
|---|---|---|
| Memory safety | Safe code has no undefined behaviour, threads included, kept by the borrow checker | Safe code has no undefined behaviour on one thread, kept by `kills` clauses, checked moves and defined arithmetic. Dazzle has no threads of its own yet |
| References | Lifetimes, which a struct can carry as parameters; a `&mut` is exclusive | Never in an ordinary field or container, so no struct has a lifetime parameter; each function's **`kills` clause** says which references a call ends. A `&mut` and a `&` may point at the same value |
| Memory | The global allocator; custom allocators per collection are not stable yet | **Placed by the compiler**: a scope's region when it can prove that safe, otherwise the heap. Ordinary code names no allocator |
| Raw pointers | `unsafe` to dereference | The same: `^T` is read or written inside `unsafe` |
| Integer overflow | Panics in debug builds, wraps in release | Wraps in every build; division by zero panics in both |
| Errors | `Result<T, E>`, `?`, and an error type per library | `!->` on the signature and one `or` clause; one `Error` type, 32 bytes, never allocates |
| Absence | `Option<T>` | `T?`, handled by the same `or` clause |
| Moved-from values | Statically inaccessible | Reset to their defaults, and statically inaccessible |
| Copy semantics | `Copy` is bitwise; `Clone` is explicit | `copy` is a copy constructor, run on `let b = a` for types that implement it |
| Inheritance | None | Single struct inheritance with `virtual`/`override`, opt-in |
| Function overloading | None | None for now; default arguments cover most of it |
| Output | Machine code through LLVM | Standard C++17, compiled by clang++, g++ or a vendor's compiler |
| C++ libraries | Bindings through bindgen, cxx or similar | Built from source and imported directly, classes and overloaded methods included |
| Build | Cargo, with crates.io | `dz`, with a `dazzle.toml` per module; fetched dependencies are on the roadmap |
| Maturity | Stable since 2015, large ecosystem | Pre-release |

## The trade

Both languages promise that safe code has no undefined behaviour. Rust's borrow checker keeps that promise, threads and data races included, by making a `&mut` exclusive. Dazzle keeps it on one thread by checking the bug C++ code actually has instead: a reference used after a call grew, shrank or freed the memory it points into. A type names its memory with **ties**, every function says in its signature which ties it may end, and a call ends every reference into what it kills. References stay out of ordinary fields, which removes the case lifetimes exist for, so no struct carries a lifetime parameter. Raw pointers are read and written only inside `unsafe`, where a reader or `grep` can find them.

What it buys back is the C++ shape of code: game-engine patterns with parents, handles and pointers into an array you also change, legal as long as nothing in between can move the array, and direct use of C++ libraries with no binding layer. What it does not cover yet is threads: Dazzle has none of its own, and how they will share memory is [still open](/decisions/d-0011-concurrency/). [Safety](/tour/safety/) lists every rule and where the promise ends.

## What the borrow checker refuses

Each Rust program below is safe, and rustc refuses it: the errors are rustc 1.99's. Each Dazzle program compiles and runs. Rust refuses because a `&mut` must be the only reference to its value while it lives. Dazzle refuses only when a call between taking a reference and using it can move or free the memory it points into, and none of these has one.

### An element beside its neighbour

```rust
fn append_next() {
    let mut strings = vec![String::from("A"), String::from("B"), String::from("C")];
    for i in 0..strings.len() - 1 {
        let s = &mut strings[i];
        let next = &strings[i + 1];
        s.push(next.chars().next().unwrap());
    }
}
```

```
error[E0502]: cannot borrow `strings` as immutable because it is also borrowed as mutable
```

```dz
fn append_next() {
    let mut strings = List<String>()
    strings.push(String::from("A"))
    strings.push(String::from("B"))
    strings.push(String::from("C"))
    for i in 0..strings.len() - 1 {
        let s = &mut strings[i]
        let next = &strings[i + 1]
        s.push(next.chars().get())
    }
    println!("{} {} {}", strings[0], strings[1], strings[2])   // AB BC C
}
```

`s.push` can move the text of `strings[i]`, and nothing else: not the list's array, which `next` points into. Two `&mut` into one list are the same case. Rust refuses this with ``E0499: cannot borrow `xs` as mutable more than once at a time``, and Dazzle accepts it:

```dz
fn add_neighbour() {
    let mut xs = List<i32>()
    xs.push(1)
    xs.push(2)
    let a = &mut xs[0]
    let b = &mut xs[1]
    a += b
    b += 10
    println!("{} {}", xs[0], xs[1])   // 3 12
}
```

In Rust the way out is `split_at_mut`, or indices instead of references.

Appending the whole neighbour, not one character of it, works as well. `push_str` can move the text of `strings[i]`, and the check knows `strings[i + 1]` is another element: two indices are told apart when both are literals that differ, or the same local that is not `mut` plus or minus different literals. A view into `nest[0]` kept while `nest[1]` grows is the same case.

```dz
fn append_next_text() {
    let mut strings = List<String>()
    strings.push(String::from("A"))
    strings.push(String::from("B"))
    strings.push(String::from("C"))
    for i in 0..strings.len() - 1 {
        let s = &mut strings[i]
        s.push_str(strings[i + 1].as_str())
    }
    println!("{} {} {}", strings[0], strings[1], strings[2])   // AB BC C
}
```

`strings[0].push_str(strings[0].as_str())` is refused, since the text it reads moves as it grows.

### A method borrows all of `self`

A Rust method that takes `&self` borrows the whole value for as long as its result lives, and one that takes `&mut self` needs the whole value to itself. So a name read through one method cannot be kept across another that only records a score:

```rust
impl Level {
    fn first_name(&self) -> &str {
        &self.names[0]
    }

    fn record(&mut self, s: i32) {
        self.scores.push(s);
    }
}

fn getter_then_method(level: &mut Level) {
    let name = level.first_name();
    level.record(3);
    println!("{} {}", name, level.scores.len());
}
```

```
error[E0502]: cannot borrow `*level` as mutable because it is also borrowed as immutable
```

A Dazzle signature says which part of the value it touches: the name is `in self.names`, and `record` kills only `self.scores@items`.

```dz
struct Level {
    pub names:  List<String>
    pub scores: List<i32>

    Level() {
        names = List<String>()
        scores = List<i32>()
        names.push(String::from("ada"))
    }

    pub fn first_name(&self) -> &str in self.names {
        return names[0].as_str()
    }

    pub fn record(&mut self, s: i32) kills self.scores@items {
        scores.push(s)
    }
}

fn getter_then_method() {
    let mut level = Level()
    let name = level.first_name()
    level.record(3)
    println!("{} {}", name, level.scores.len())   // ada 1
}
```

The same rule refuses a loop over one field that calls a method changing another. In Rust, `for e in &self.enemies { self.award(*e); }` is ``E0502: cannot borrow `*self` as mutable because it is also borrowed as immutable``. In Dazzle `award` kills nothing, since adding to a score moves no memory:

```dz
struct Game {
    pub enemies: List<i32>
    pub score:   i32 = 0

    Game() {
        enemies = List<i32>()
        enemies.push(3)
        enemies.push(4)
    }

    pub fn award(&mut self, points: i32) {
        score += points
    }

    pub fn tally(&mut self) {
        for &e in &enemies {
            self.award(e)
        }
    }
}
```

### Two values of one map

```rust
fn two_values() {
    let mut teams: HashMap<String, Vec<i32>> = HashMap::new();
    teams.insert("red".into(), vec![]);
    teams.insert("blue".into(), vec![]);
    let red = teams.get("red").unwrap();
    if let Some(blue) = teams.get_mut("blue") {
        blue.push(1);
    }
    println!("{}", red.len());
}
```

```
error[E0502]: cannot borrow `teams` as mutable because it is also borrowed as immutable
```

Pushing onto the blue team's list moves that list's array, not the map's slots, where `red` is:

```dz
fn two_values() {
    let mut teams = HashMap<String, List<i32>>()
    teams.insert(String::from("red"), List<i32>())
    teams.insert(String::from("blue"), List<i32>())
    let red = teams.get(&String::from("red")) or return
    if let &mut blue = teams.get_mut(&String::from("blue")) {
        blue.push(1)
    }
    println!("{}", red.len())   // 0
}
```

### Returning what a lookup found

Return the value if it is there, insert it if not. This is the borrow checker's best-known false refusal, "problem case #3" in the RFC that introduced non-lexical lifetimes, which Polonius, the borrow checker being written to replace it, is meant to accept:

```rust
fn count_of<'m>(map: &'m mut HashMap<String, i32>, key: &str) -> &'m mut i32 {
    if let Some(n) = map.get_mut(key) {
        return n;
    }
    map.insert(key.to_string(), 0);
    map.get_mut(key).unwrap()
}
```

```
error[E0499]: cannot borrow `*map` as mutable more than once at a time
```

```dz
fn count_of(
    map: &mut HashMap<String, i32>,
    key: &str
) -> &mut i32 in map@items kills map@items, map[*] {
    if let &mut n = map.get_mut(&String::from(key)) {
        return n
    }
    map.insert(String::from(key), 0)
    return map.get_or_insert(String::from(key), 0)
}
```

### A global counter

```rust
static mut FRAMES: u64 = 0;

fn tick() {
    FRAMES += 1;
}
```

```
error[E0133]: use of mutable static is unsafe and requires unsafe function or block
```

Rust's safe spelling is an atomic, or a `Cell` in a `thread_local!`. Dazzle has one thread, so a static is checked as a parameter is: writing one is safe, and a function that kills memory a static owns says so in its `kills` clause.

```dz
static FRAMES: u64 = 0

fn tick() {
    FRAMES += 1
}
```

### What Dazzle refuses too

Both languages refuse these, though none of them reads freed memory:

- Two elements indexed by different locals, `strings[i]` beside `strings[j]`, when a call changes one: the check cannot know `i` and `j` differ, and treats them as one element, ``DZ0413: used after the memory it points into was killed: `strings[*]@text` ``.
- One list passed twice to a function that grows both of its arguments, `grow_both(&mut xs, &mut xs)`: Dazzle's `DZ0420`. The function could hold a reference into one argument while it grows the other, and whether it does is in its body, which a call does not read.
- A struct that owns a buffer and holds a reference into it.

### What Rust accepts and Dazzle does not

- **A container of references**: `Vec<&str>` is ordinary Rust. In Dazzle a reference lives only in a local, a parameter or a view struct, so `List<&str>` is `DZ0517`; keep the `String`s, or indices.
- **Two separate shared lists**: Rust's `Rc<RefCell<Vec<String>>>` checks each borrow while the program runs. Dazzle checks `Rc` at compile time and treats every `Rc<List<String>>` as one place, so a reference into one dies when another is pushed to.

## Choose Rust if

- you need memory safety across threads today;
- you want a stable language and crates.io's ecosystem today;
- you do not need to call C++ classes directly.

## Choose Dazzle if

- you write C++ today and want deterministic destruction, encapsulation, errors as values and safe code with no undefined behaviour, without lifetime annotations or an exclusive `&mut`;
- you depend on C++ libraries and want to use them from source with no bindings;
- you want the output to be C++ that any C++ toolchain, including a vendor's, can compile.

## Read next

[Ownership and RAII](/tour/ownership/) · [Errors as values](/tour/errors/) · [Dazzle vs Zig](/compare/zig/)
