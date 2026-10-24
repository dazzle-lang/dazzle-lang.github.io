---
title: Dazzle vs Odin
description: Dazzle compared with Odin. Dazzle started from Odin's clarity and adds back what large codebases need, RAII, private fields, traits and methods, with explicit allocators instead of an implicit context.
---

Dazzle's design started from a complaint about two languages: C++ gives you control and abstraction but buries them under syntax and undefined behaviour, and **Odin gives you clarity but takes away encapsulation, RAII and the layered abstractions that hold up in a large codebase**. The first Dazzle compiler was even prototyped in Odin. So Dazzle shares much of Odin's taste, and differs exactly where that complaint points.

## What they share

- Plain, readable syntax and a dislike of hidden behaviour.
- `defer`.
- Tagged unions and a `switch` without fallthrough.
- Errors as values, handled at the call: Odin's multiple returns and `or_return`, Dazzle's `!->` and `or return`.
- First-class use of C libraries, and game development as a primary audience.

## Where they differ

| | Odin | Dazzle |
|---|---|---|
| Allocators | Implicit, through `context.allocator` | **Explicit**, with a default argument: `List<i32>(8)`, or `List<i32>(8, &frame_arena)` |
| Destruction | Manual, with `defer` | **RAII**: `drop` runs automatically; `own` fields with no `drop` are a compile error |
| Encapsulation | No private struct fields | Fields and methods **private by default**, enforced |
| Methods | Procedures, called with the value as an argument | Methods on structs, `&self` and `&mut self` |
| Interfaces | None built in | **Traits**, static or dynamic dispatch |
| Generics | Parametric polymorphism, checked at each use | Checked **at the definition** against bounds |
| Overloading | Explicit procedure groups | None: one name, one symbol |
| C++ libraries | C only | C and **C++**, built from source |
| Output | Machine code through LLVM | C++17 |
| Size | Small, by design | Larger, by design |

## The allocator question

Odin's implicit `context.allocator` removes the allocator parameter from every signature, and the price is that you cannot tell from a call whether it allocates, or from where. Dazzle's first principle is that you can always see the machine, so the parameter stays, and a default argument gives back almost all the ergonomics.

```dz
fn update(&mut self, dt: f32) {
    defer Allocators::Temp.reset()

    let visible = self.cull(&camera, Allocators::Temp)   // freed at frame end, no bookkeeping
    for &e in visible { e.draw(&mut self.batch) }
}
```

## Choose Odin if

- you want a small, stable language you can hold in your head completely;
- you prefer data and procedures to types with methods and private state;
- you want its vendored libraries and mature tooling today.

## Choose Dazzle if

- you want RAII and encapsulation in a codebase large enough to have layers;
- you want traits and generics checked where they are written;
- you need C++ libraries as well as C.

## Read next

[Why Dazzle](/start/why-dazzle/) · [Ownership and RAII](/tour/ownership/) · [Dazzle vs Zig](/compare/zig/)
