import {Opcode, AddressingMode, Instruction} from "./types"

const fs = require('fs')
const ohm = require('ohm-js')
const grammarText = fs.readFileSync('redcode.ohm')

export const grammar = ohm.grammar(grammarText)
export const semantics = grammar.createSemantics()

export function parse(text:string): Instruction[] {
    const parsed = grammar.match(text)
    return semantics(parsed).asMarsJSObject()
}

semantics.addOperation('asMarsJSObject', {
    Program: (instructions: any[]) => {
        return instructions.children.map((i) => i.asMarsJSObject() )
    },

    Instruction_label: (label: string, opcode: string, a: string, _, b: string, comment: string) => {
        const aResult = a.asMarsJSObject()
        const bResult = b.asMarsJSObject()[0] || { addressingMode: AddressingMode.Direct, field: 0}

        let result = {
            label: label.asMarsJSObject(),
            opcode: opcode.asMarsJSObject(),
            aMode: aResult.addressingMode,
            aField: aResult.field,
            bMode: bResult.addressingMode,
            bField: bResult.field
        }
        const c = comment.asMarsJSObject()[0]
        if (c) {
            result["comment"] = c
        }
        return result
    },

    Instruction_nolabel: (opcode: string, a: string, _, b: string, comment: string) => {      
        const aResult = a.asMarsJSObject()
        const bResult = b.asMarsJSObject()[0] || { addressingMode: AddressingMode.Direct, field: 0}
        let result = {
            opcode: opcode.asMarsJSObject(),
            aMode: aResult.addressingMode,
            aField: aResult.field,
            bMode: bResult.addressingMode,
            bField: bResult.field
        }
        const c = comment.asMarsJSObject()[0]
        if (c) {
            result["comment"] = c
        }
        return result
    },   

    operand: (addressingMode: string, operandValue: string | number) => {
        let map = {
            "$": AddressingMode.Direct,
            "#": AddressingMode.Immediate,
            "@": AddressingMode.Indirect,
            ">": AddressingMode.Autodecrement,
            "": AddressingMode.Direct
        }

        return {
            addressingMode: map[addressingMode.sourceString],
            field: operandValue.asMarsJSObject()
        }
    },   

    opcode: (opcode: string) => {
        return Opcode[opcode.sourceString.toUpperCase()]
    },

    number: function(_, num: string) {
        return parseInt(this.sourceString)
    },

    label: function(label: string) {
        return label.sourceString
    },

    comment: function(_, comment: string) {
        return comment.sourceString
    }
})

