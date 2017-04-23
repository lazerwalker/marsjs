# MARSjs

This is a JavaScript implementation of the game [Core Wars](https://en.wikipedia.org/wiki/Core_War). It consists of:

1. A parser for the Redcode assembly language, written in [Ohm](https://ohmlang.github.io).

2. A MARS virtual machine, written in TypeScript and exposed as a JS module runnable either in the browser or on the server.

Only the latter currently exists. In its current form, it implements the [ICWS-88 standard](https://kot.rogacz.com/Science/Teaching/2014-15%20(1)/3LO_inf_2c/listy/redcode-icws-88-2.pdf), although optional support for ICWS-94 is on the roadmap.

This is a work-in-progress. More documentation is coming soon.