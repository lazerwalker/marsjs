import {Opcode, AddressingMode} from "./types"

const fs = require('fs')
const ohm = require('ohm-js')
const grammarText = fs.readFileSync('redcode.ohm')
const grammar = ohm.grammar(grammarText)

const bomb = `
ADD #4, 3 
MOV 2, @2
JMP -2
DAT #0, #0
`

const semantics = grammar.createSemantics()
const match = grammar.match(bomb)
const result = semantics(match)

semantics.addAttribute('asMarsJSObject', {
    Program: (instructions: any[]) => {
        return instructions
    },

    Instruction: (label: string, opcode: string, a: string, b: string, comment: string) => {
        const aResult = a.asMarsJSObject
        const bResult = b.asMarsJSObject

        return {
            label: label,
            opcode: opcode,
            aMode: aResult.addressingMode,
            aField: aResult.field,
            bMode: bResult.addressingMode,
            bField: bResult.field,
            comment: comment
        }
    },

    Opcode: (opcode: string) => {
        return Opcode[opcode]
    },

    Operand: (addressingMode: string, value: string | number) => {
        let map = {
            "#": AddressingMode.Immediate,
            "$": AddressingMode.Direct,
            "@": AddressingMode.Indirect,
            ">": AddressingMode.Autodecrement
        }

        return {
            addressingMode: map[addressingMode],
            field: value
        }
    },

     _nonterminal: () => {
        throw new Error("Uh-oh, missing semantic action for " + this.constructor);
    }
})

console.log(result.asMarsJSObject)