# MARSjs

This is a JavaScript implementation of the game [Core Wars](https://en.wikipedia.org/wiki/Core_War). It consists of:

1. A parser for the Redcode assembly language, written in [Ohm](https://ohmlang.github.io).

2. A MARS virtual machine, written in TypeScript and exposed as a JS module runnable either in the browser or on the server.

In its current form, it implements the [ICWS-88 standard](https://kot.rogacz.com/Science/Teaching/2014-15%20(1)/3LO_inf_2c/listy/redcode-icws-88-2.pdf), although optional support for ICWS-94 is on the roadmap.

This is a work-in-progress. More documentation is coming soon.

## Parser

As mentioned, the parser is written in [Ohm](https://ohmlang.github.io). The grammar lives in `redcode.ohm`, and `parser.ts` contains a valid Ohm semantics expression (`toMarsJSObject()`) that targets the JSON format expected by the VM.

`parser.ts` exposes very few objects/functions:

* `grammar`: An Ohm Grammar object, generated using the aforementioned `redcode.ohm`

* `semantics`: An Ohm Semantics object that operates on the previous grammar, defining a single `toMarsJSObject` expression

* `parse(text: string): Instruction[]` takes in a string of valid Redcode, and outputs an array of Instruction objects readable by the `VM`.


## VM

For now, you likely want to just look at `mars.ts` for documentation or `main.ts` as an example. 

Tl;dr, a VM object takes in an array of `Instruction` objects, and optionally a memory size and max number of cycles. 

`tick()` executes a single instruction, exiting early and returning `false` if a player has lost (and returning `true` otherwise (not currently returning any information, other than a console log, about the failure). 

`print()` is a helper function that outputs a pretty debug version of the current state of the game world.