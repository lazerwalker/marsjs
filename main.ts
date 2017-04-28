import {Opcode, AddressingMode} from "./types"
import {parse} from "./parser"
import {VM} from "./mars"

const imp = "MOV 0, 1"
const bomb = `
start ADD #4, 3 
MOV 2, @2
JMP -2
DAT #0, #0
`
const parsed = [bomb].map(parse)
const vm = new VM(parsed)

while(vm.tick()) {
    console.log(vm.print())
}