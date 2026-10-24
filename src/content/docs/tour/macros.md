---
title: Macros
description: Dazzle's declarative, hygienic macros. Patterns read like parameters, expansions are written in Dazzle, and the editor still completes and hovers inside an invocation.
---

Macros are declarative: a pattern that reads like a function's parameters, and an expansion written in Dazzle. They expand on syntax, before name resolution, they are hygienic for locals, and **the editor keeps completing and hovering inside an invocation**.

## A state machine as a library

A state machine is a user macro rather than a language feature. Trimmed from the repository's [`machine` test](https://github.com/dazzle-lang/Dazzle/tree/master/tests/run/machine):

```dz
#machine ButtonState(ctx: &ButtonCtx, input: &Input, btn: &mut Button) {
    state DefaultState {
        if input.mouse_down && input.over {
            return .TransitionState{}
        }
    }

    state TransitionState(t: f32 = 0) {
        t += ctx.delta_time
        btn.scale = lerp(1, 2, t)
        if t >= 1 {
            return .DefaultState{}
        }
    }
}
```

`#machine` is about sixty lines of Dazzle in the program's own code. It writes a struct for each state, a tagged union over them, and a `step` method.

## Two kinds of invocation

- **`#name …`** invokes a declaration macro, like `#machine` above, which writes types and functions.
- **`name!(…)`** invokes an expression or statement macro, like `println!`.

## See what a macro wrote

`dz expand <file>` prints the file with every invocation expanded, exactly as the compiler sees it.

**A diagnostic points where its code was written.** A mistake in code you passed in, such as a state's body, is reported there, as if no macro were involved. A mistake in code the macro wrote is reported at the invocation, with a note: "in expansion of `#machine`". A macro can also reject an invocation itself, with `#error`, pointed at the tokens it objects to.

## Format strings are checked

Formatting is built from the same machinery. `println!`, `format!`, `error(…)` and `panic!` check their format string against their arguments at compile time, so a missing argument or one that cannot be formatted is a compile error, not a crash.

## Compile-time code without macros

Not everything needs a macro. Generic code can branch on a type at compile time (see [types and generics](/tour/types-and-generics/)), and `#if` keeps code in a build or leaves it out by build flag:

```dz
#if OS_WINDOWS {
    fn open_window() { … }
} #else #if OS_LINUX || OS_MACOS {
    fn open_window() { … }
} #else {
    fn open_window() { panic!("no window on this platform") }
}
```

## Why it works this way

**Why declarative?** A macro that runs arbitrary code at compile time can produce anything, which means the editor cannot know what is inside an invocation until it has run it. A declarative macro is a pattern and an expansion, so the language server knows the shape of every invocation, and completion, hover and go to definition keep working inside it.

**Why make a state machine a macro, not a feature?** Every language feature is something every user has to learn, and every tool has to support. When a library-level macro can express an idea as well, with the same editor support, the language stays smaller and the idea stays changeable.

**The cost:** declarative macros cannot do everything a procedural macro can; there is no running code at compile time. Generic code covers type-driven variation, and `#if` covers build configuration.

## In the specification

[§12 Metaprogramming](/spec/12-metaprogramming/): fragment kinds, repetition, hygiene, attributes, format strings and compile-time conditionals. The notation was settled in [D-0009](/decisions/d-0009-macro-invocation-syntax/).
