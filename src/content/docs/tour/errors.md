---
title: Errors as values
description: How Dazzle handles errors without exceptions or Result types. Fallible functions are marked with !->, and one postfix or clause handles failures, optionals and null pointers.
---

Dazzle has no exceptions, no `try`/`catch`, and no `Result<T, E>`. A function that can fail says so on its signature with `!->`, and the caller handles the failure with **one postfix `or` clause**. The same clause handles an optional value (`T?`) and a nullable pointer (`^T`).

```dz
enum ErrorCode : u32 {
    Empty = 1
    TooLong
}

fn parse_name(text: str) !-> str {
    if text.len == 0 {
        return error(ErrorCode::Empty as u32, "a name cannot be empty")
    }
    if text.len > 16 {
        return error(ErrorCode::TooLong as u32, "name too long: {} bytes", text.len)
    }
    return text
}

fn greet(text: str) !-> i32 {
    let name = parse_name(text) or return          // propagate
    println!("hello, {}", name)
    return 0
}

fn main() {
    let name = parse_name("") or "stranger"        // fall back
    println!("hello, {}", name)
    greet("Ada") or ignore                         // deliberately drop the failure
    greet("a name that is far too long") or { e -> // handle it
        println!("failed at {}:{}: {}", e.location.file, e.location.line, e.message)
        0
    }
}
```

```text
hello, stranger
hello, Ada
failed at src/main.dz:11: name too long: 27 bytes
```

## The one rule

**An `or` clause must either produce a value of the right type or leave the block.** Every form is an instance of that rule:

| Form | Meaning |
|---|---|
| `f() or value` | use this value instead |
| `f() or { … }` | a block whose last expression is the value, or which leaves |
| `f() or { e -> … }` | the same, with the `Error` bound to `e` |
| `f() or return` | pass the failure to the caller, if the enclosing function can fail |
| `f() or return x`, `or break`, `or continue` | ordinary control flow |
| `f() or panic!("…")` | abort |
| `f() or unreachable` | assert it cannot fail: checked in debug builds, free in release |
| `f() or ignore` | statement position only: discard it |

`or` is deliberately non-associative: `a() or b() or c` is a syntax error. A fallback that can itself fail gets its own clause, so the nesting is visible:

```dz
let tex = load(path) or { load(fallback_path) or Textures::Missing }
```

## A failure cannot be stored, only handled

There is no `T!` type to put in a variable, a field or a list. A fallible call has to be handled where it is made, so forgetting one is a compile error:

```text
error[DZ0510]: fallible call not consumed
  ┌─ src/main.dz:9:17
  │
9 │     let level = load("level1.dat")
  │                 ^^^^^^^^^^^^^^^^^^ a failure cannot be stored, only handled
  │
  = help: add an `or` clause: `let v = f() or return`, or `let v = f() or <fallback>` (spec §9.7)
```

## The `Error` type

An `Error` is **32 bytes and never allocates**. It carries a code, a message, and the source location where it was created, which is most of what a stack trace tells you, at no runtime cost. `error(code, "format {}", args)` builds one, with the format string checked against its arguments at compile time.

## Optionals and pointers use the same clause

`T?` is a value that may be absent, written `none`. A `^T` pointer may be null. Both are unwrapped with `or`, exactly like a failure, except that there is no `Error` to bind:

```dz
fn heal(amount: i32?) -> i32 {
    return amount or 0
}

fn main() {
    let alive = true
    let hp = if alive { 100 } else { none }      // an i32?
    println!("{} {}", hp or -1, heal(none))
}
```

## Panics are not errors

Most things that go wrong in a game are not recoverable and should not be modelled as errors. `panic!("…")` aborts with a message, the source location and, in debug builds, a stack trace.

- **Panics are for:** out-of-bounds indexing, failed assertions, exhausted fixed-size pools, violated invariants.
- **Errors are for:** I/O, parsing, user-supplied data, and anything crossing a boundary you do not control.

Allocation failure is a panic by default, so ordinary code does not carry `or return` on every line; code that does need to handle running out of memory calls `try_alloc`. Neither a panic nor an error ever becomes a C++ exception: the output is compiled with `-fno-exceptions`.

## Why it works this way

**Why not exceptions?** An exception is control flow you cannot see: any call might leave the function, and nothing at the call site says which. Most game, console and embedded projects turn exceptions off for their cost and unpredictability, which is why the C++ Dazzle writes is compiled with `-fno-exceptions`. With `!->`, every call that can fail is marked where it is declared, and handled where it is made.

**Why not `Result<T, E>`?** A result type makes a failure a value you can store and pass around, which is how failures end up ignored or handled far from where they happened. In Dazzle a failure is control flow, not data: there is no `T!` type to put in a variable, so it has to be dealt with at the call. That asymmetry is the point. An optional (`T?`) *is* a type, because absence is a data shape: a field may be empty.

**Why one clause for three things?** A failed call, an empty optional and a null pointer are all "no value here", and in each case you either supply one or leave. One construct with one rule means one thing to learn, and the same `or return` or fallback works for all three.

**Why one `Error` type?** Every fallible function returns the same 32-byte `Error`, so propagating it needs no conversions between error types, and it never touches the heap, which matters where allocation is not allowed. Its source location gives you most of what a stack trace would, at no runtime cost.

**The costs:**

- **No typed errors.** You cannot match exhaustively on a function's own error kinds; an `Error` carries a numeric code (your own enum `as u32`) and a message. A syntax for typed errors is reserved, should a real need appear.
- **Explicit at every call.** Each fallible call needs its own `or`, which is more to write than an exception that flies past. That visibility is what the design is for.

## In the specification

[§9 Errors and absence](/spec/09-errors-and-absence/) has the full rules, including [the `or` clause](/spec/09-errors-and-absence/#94-the-or-clause) and [panics](/spec/09-errors-and-absence/#98-what-is-not-an-error-panics). The design choice is [D-0008](/decisions/d-0008-error-propagation-style/).
