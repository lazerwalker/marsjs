import {
  Opcode,
  AddressingMode,
  Instruction,
  MathOperator,
  MathExpression
} from "./types";

import * as fs from "fs";
import * as ohm from "ohm-js";

const grammarText = fs.readFileSync("redcode.ohm", "utf8");

export const grammar: ohm.Grammar = ohm.grammar(grammarText);
export const semantics = grammar.createSemantics();

export function parse(text: string): Instruction[] {
  const parsed = grammar.match(text);
  return semantics(parsed).asMarsJSObject();
}

semantics.addOperation("asMarsJSObject", {
  Program: (instructions: ohm.Node) => {
    return instructions.children
      .map(i => i.asMarsJSObject())
      .filter(i => i != undefined);
  },

  Instruction_label: (
    label: ohm.Node,
    opcode: ohm.Node,
    a: ohm.Node,
    _,
    b: ohm.Node,
    comment: ohm.Node
  ) => {
    const aResult = a.asMarsJSObject();
    const bResult = b.asMarsJSObject()[0] || {
      addressingMode: AddressingMode.Direct,
      field: 0
    };

    let result = {
      label: label.asMarsJSObject(),
      opcode: opcode.asMarsJSObject(),
      aMode: aResult.addressingMode,
      aField: aResult.field,
      bMode: bResult.addressingMode,
      bField: bResult.field
    };
    const c = comment.asMarsJSObject()[0];
    if (c) {
      result["comment"] = c;
    }
    return result;
  },

  Instruction_nolabel: (
    opcode: ohm.Node,
    a: ohm.Node,
    _,
    b: ohm.Node,
    comment: ohm.Node
  ) => {
    const aResult = a.asMarsJSObject();
    const bResult = b.asMarsJSObject()[0] || {
      addressingMode: AddressingMode.Direct,
      field: 0
    };
    let result = {
      opcode: opcode.asMarsJSObject(),
      aMode: aResult.addressingMode,
      aField: aResult.field,
      bMode: bResult.addressingMode,
      bField: bResult.field
    };
    const c = comment.asMarsJSObject()[0];
    if (c) {
      result["comment"] = c;
    }
    return result;
  },

  Instruction_commentonly: (_: ohm.Node) => {
    return undefined;
  },

  Operand: (addressingMode: ohm.Node, operandValue: ohm.Node) => {
    let map = {
      $: AddressingMode.Direct,
      "#": AddressingMode.Immediate,
      "@": AddressingMode.Indirect,
      "<": AddressingMode.Autodecrement,
      "": AddressingMode.Direct
    };

    return {
      addressingMode: map[addressingMode.sourceString],
      field: operandValue.asMarsJSObject()
    };
  },

  OperandValue: e => e.asMarsJSObject(),

  AddExp: e => e.asMarsJSObject(),

  AddExp_plus: (left: ohm.Node, _, right: ohm.Node): MathExpression => {
    return {
      operator: MathOperator.Add,
      left: left.asMarsJSObject(),
      right: right.asMarsJSObject()
    };
  },

  AddExp_minus: (left: ohm.Node, _, right: ohm.Node): MathExpression => {
    return {
      operator: MathOperator.Subtract,
      left: left.asMarsJSObject(),
      right: right.asMarsJSObject()
    };
  },

  MulExp_times: (left: ohm.Node, _, right: ohm.Node): MathExpression => {
    return {
      operator: MathOperator.Multiply,
      left: left.asMarsJSObject(),
      right: right.asMarsJSObject()
    };
  },

  MulExp_divide: (left: ohm.Node, _, right: ohm.Node): MathExpression => {
    return {
      operator: MathOperator.Divide,
      left: left.asMarsJSObject(),
      right: right.asMarsJSObject()
    };
  },

  operandLiteral: e => e.asMarsJSObject(),

  opcode: (opcode: ohm.Node) => {
    return Opcode[opcode.sourceString.toUpperCase()];
  },

  number: function(_, num: ohm.Node) {
    return parseInt(num.sourceString);
  },

  label: function(label: ohm.Node) {
    return label.sourceString;
  },

  comment: function(_, comment: ohm.Node) {
    return comment.sourceString;
  }
});
