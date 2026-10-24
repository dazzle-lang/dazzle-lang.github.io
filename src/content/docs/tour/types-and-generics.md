---
title: Types, generics and traits
description: Dazzle's type system. Generics checked at the definition and monomorphized by Dazzle, traits with static or dynamic dispatch, tagged unions with exhaustive switch, inheritance and reflection.
---

## Generics checked where they are written

A generic function's body is checked **once, against its bounds**, not at every instantiation. Then Dazzle monomorphizes it itself, rather than handing a template to the C++ compiler.

```dz
fn largest<T: Ord>(a: T, b: T) -> T {
    if a > b {
        return move(a)
    }
    return move(b)
}

fn main() {
    println!("{} {}", largest(3, 7), largest(2.5, 1.5))
}
```

`a > b` is legal only because `Ord` provides it. Ask `T` for something its bounds do not promise, and the error is reported at that line, once, naming the missing bound:

```text
error[DZ0531]: `T` has no method `frobnicate`
  ┌─ src/main.dz:2:7
  │
2 │     a.frobnicate()
  │       ^^^^^^^^^^ not provided by `Ord`
  │
  = help: `T` is bounded by `Ord`, and that is the whole of what it can do here — add `frobnicate` to one of those traits, or add a bound to `T` (spec §8.1)
```

That is the reason for the design: no 400-line instantiation trace, and **the editor can complete inside a generic body**, because it knows exactly what `T` can do.

A condition made only of compile-time type queries is folded away during monomorphization, so the dead branch is never emitted:

```dz
if T::is_trivially_copyable {
    memcpy(m_data, other.m_data, other.m_len * sizeof(T))
} else {
    for i in 0..other.m_len { construct(m_data[i], other.m_data[i]) }
}
```

Both branches are still checked for every `T`, so a generic's errors stay at its definition.

### Why not just emit C++ templates?

Dazzle compiles to C++, so handing generics to C++ templates would be the obvious move, and less work for the compiler. Dazzle lets C++ do every job C++ does **once per construct**: destructors, copy constructors, temporaries, struct layout. Templates are the opposite: C++ does that work **once per instantiation, slowly, and with poor diagnostics**. So this one job Dazzle keeps:

1. **Errors stay in your code.** If C++ re-checked a template at each instantiation, any gap between Dazzle's type system and C++'s would surface as a template error inside generated code.
2. **Compile time.** Template instantiation is among the slowest things a C++ compiler does. Plain monomorphized structs cost it almost nothing.
3. **C++17 has no trait bounds.** Concepts are C++20, and Dazzle targets C++17 for the widest compiler support, so bounds would simply be lost.
4. **Dead branches stay dead.** A folded compile-time branch is not emitted at all, instead of relying on `if constexpr`, whose discarded branch must still be valid C++.

**The cost** is a monomorphization pass in the compiler, and more generated C++ text.

## Traits: static or dynamic dispatch

A trait is an interface. A bound (`<T: Shape>`) dispatches statically; `&Shape` or `^Shape` is a fat pointer, the object plus its implementation's table, so the object itself carries no extra bytes.

```dz
trait Shape {
    fn area(&self) -> f32

    fn twice(&self) -> f32 {         // a default method
        return self.area() * 2
    }
}

struct Square {
    pub side: f32 = 1
}

impl Shape for Square {
    fn area(&self) -> f32 {
        return side * side
    }
}

impl Shape for f32 {                 // built-in types implement traits too
    fn area(&self) -> f32 {
        return self
    }
}

fn total<T: Shape>(a: &T, b: &T) -> f32 {    // static dispatch: one instance per T
    return a.area() + b.area()
}

fn measure(s: &Shape) -> f32 {               // dynamic dispatch: any implementer
    return s.twice()
}

fn main() {
    let sq = Square{ side: 3 }
    let n: f32 = 4
    println!("{} {} {}", total(&sq, &sq), measure(&sq), measure(&n))
}
```

An `impl` lives with the trait or with the type, so a module can add a trait to a type it did not write.

## Tagged unions and exhaustive `switch`

A `union` is a tagged sum type. `switch` has no fallthrough and must cover every variant: a missing case is a compile error, and the editor can write the missing arms for you.

```dz
union Command {
    Say { text: str }
    Move { x: f32, y: f32 }
    Quit {}
}

fn describe(c: &Command) -> str {
    return switch c {
        case Say(&s) { s.text }
        case Move { "move" }
        case Quit { "quit" }
    }
}

fn main() {
    let c = Command::Move{ x: 1, y: 2 }
    println!("{} {}", describe(&c), describe(&Command::Say{ text: "hello" }))
}
```

A union owns its active payload: it drops it when it dies, and drops the old one before another variant is assigned.

## Single inheritance, when you want a hierarchy

`struct Panel : Widget` puts the base first in memory, so `&Panel` converts to `&Widget` for free. Dispatch is static unless you ask: `virtual fn` opts a method in and `override fn` replaces it, both checked in both directions. A by-value `Panel` where a `Widget` is wanted is an error, because it would slice off what `Panel` adds.

```dz
pub struct Widget {
    pub left: i32 = 1
    pub top: i32 = 2
}

pub struct Panel : Widget {
    pub title: str = "panel"

    pub fn area(&self) -> i32 {
        return left * top            // the base's fields, unqualified
    }
}
```

## Reflection with no per-object cost

`typeinfo_of<T>()` reads one static table that describes every type: names, fields, offsets, enum values, union variants, and field tags. Structs carry zero extra bytes. The repository's [`reflect` test](https://github.com/dazzle-lang/Dazzle/tree/master/tests/run/reflect) is a JSON serializer of about 50 lines written against it, honouring tags like these:

```dz
struct Stats {
    pub strength: i32 = 0
    pub agility:  f32 = 0 `json:"agi"`
}
```

## Fewer ways to do the same thing

- **No implicit numeric conversions.** `i32` to `f32` is an `as` cast you can see.
- **No function overloading, for now.** One name is one symbol, which keeps errors and the editor simple. Default arguments and constructors cover most of what overloading is used for; overloading is deferred, not ruled out. Imported C++ overload sets are still called, resolved by argument type.
- **Every value is initialised.** Fields have defaults; there is no uninitialised memory.

## In the specification

[§5 Types](/spec/05-types/), [§7 Declarations](/spec/07-declarations/) (structs, enums, unions, traits), [§8 Generics](/spec/08-generics/), [§10 Statements and control flow](/spec/10-statements-and-control-flow/), and [§13 Reflection](/spec/13-reflection/).
