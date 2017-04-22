import {Opcode, AddressingMode, VM} from "./mars"

/* MOV 0, 1 */
const imp = [{
    opcode: Opcode.MOV,
    aMode: AddressingMode.Direct,
    aField: 0,
    bMode: AddressingMode.Direct,
    bField: 1
}]

/*
ADD #4, 3 
MOV 2, @2
JMP -2
DAT #0, #0
*/
const bomb = [
    {
        opcode: Opcode.ADD,
        aMode: AddressingMode.Immediate,
        aField: 4,
        bMode: AddressingMode.Direct,
        bField: 3
    },
    {
        opcode: Opcode.MOV,
        aMode: AddressingMode.Direct,
        aField: 2,
        bMode: AddressingMode.Indirect,
        bField: 2
    },
    {
        opcode: Opcode.JMP,
        aMode: AddressingMode.Direct,
        aField: -2,
        bMode: AddressingMode.Immediate,
        bField: 0
    },
    {
        opcode: Opcode.DAT,
        aMode: AddressingMode.Direct,
        aField: 0,
        bMode: AddressingMode.Direct,
        bField: 0
    },            
]

const vm = new VM([imp, bomb])

while(vm.tick()) {
    console.log(vm.print())
}