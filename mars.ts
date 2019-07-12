import {
  AddressingMode,
  Opcode,
  Instruction,
  Warrior,
  MathExpression,
  MathOperator
} from "./types";

import * as _ from "lodash";

export class VM {
  readonly warriors: Warrior[];
  readonly memory: Instruction[];

  readonly programs: Instruction[][];
  readonly size: number;
  readonly cycleLimit?: number;

  cycles: number = 0;
  nextProgramIndex: number = 0;

  labels: { [name: string]: number } = {};
  equs: { [name: string]: number } = {};

  constructor(
    programs: Instruction[][],
    size: number = 8000,
    cycleLimit?: number,
    startPositions?: number[]
  ) {
    this.memory = [];
    this.warriors = [];

    this.programs = programs;
    this.size = size;
    this.cycleLimit = cycleLimit;

    const emptyInstruction: Instruction = {
      opcode: Opcode.DAT,
      aMode: AddressingMode.Immediate,
      aField: 0,
      bMode: AddressingMode.Immediate,
      bField: 0
    };

    for (let i = 0; i < size; i++) {
      this.memory[i] = Object.assign({}, emptyInstruction);
    }

    let positions: number[];
    if (startPositions && startPositions.length === programs.length) {
      positions = startPositions;
    } else {
      const maybePositions = this.findStartPositions(programs, size);
      if (maybePositions === null) {
        console.log("Could not assign positions");
        return;
      }
      positions = maybePositions as number[];
    }

    // Copy programs to memory
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const start = positions[i];

      let indexOffset = 0; // Since we skip some instructions, but use the for loop index for positioning.
      for (let j = 0; j < program.length; j++) {
        const absoluteAddr = (start + j + indexOffset) % size;
        const instruction = program[j];
        instruction.owner = i;

        if (instruction.opcode === Opcode.END) {
          if (instruction.aField && this.labels[instruction.aField]) {
            positions[i] = this.labels[instruction.aField];
          }
          break;
        }

        if (instruction.opcode === Opcode.EQU) {
          if (instruction.label) {
            this.equs[instruction.label] = instruction.aField;
          }
          indexOffset -= 1;
          continue;
        }

        this.memory[absoluteAddr] = instruction;

        if (instruction.label) {
          this.labels[instruction.label] = absoluteAddr;
        }
      }
    }

    this.warriors = positions.map((pc, idx) => {
      return { number: idx, pc: [pc] };
    });
  }

  tick(): boolean {
    let warrior = this.warriors[this.nextProgramIndex];
    this.execute(warrior);

    if (warrior.pc.length === 0) {
      console.log(`Game over: player ${warrior.number} bombed!`);
      return false;
    }

    this.cycles++;
    if (this.cycleLimit && this.cycles > this.cycleLimit) {
      console.log("Game over: draw!");
      return false;
    }

    this.nextProgramIndex += 1;
    if (this.nextProgramIndex >= this.warriors.length) {
      this.nextProgramIndex = 0;
    }
    return true;
  }

  print(): string {
    let output: string[] = [];
    output.push(`CYCLE ${this.cycles}`);
    for (let warrior of this.warriors) {
      output.push(`Process Queue: [${warrior.pc}]`);
      for (var i = -5; i < 15; i++) {
        let index = normalizedIndex(warrior.pc[0] + i, this.size);
        let instr = index + ": " + printInstruction(this.memory[index]);
        if (i === 0) {
          instr += ` <-- ${warrior.number}`;
        }
        output.push(instr);
      }
    }
    output.push("");
    return output.join("\n");
  }

  private findStartPositions(
    programs: Instruction[][],
    size: number
  ): number[] | null {
    /** TODO: Very silly.
     * Current design goals:
     * As far away from each other as currently possible.
     * e.g. we calculate how much non-program space there will be, and aim to put them somewhere equidistant.
     */

    const totalProgramSize = _.flatten(programs).length;
    const desiredGap = Math.floor((size - totalProgramSize) / 2);

    const startingPosition = _.random(0, size);

    return programs.map(
      (_, idx) => (startingPosition + idx * desiredGap) % size
    );
  }

  private execute(warrior: Warrior) {
    const pc = warrior.pc.shift() as number;
    const instruction = this.memory[pc];
    const { opcode, aMode, aField, bMode, bField } = instruction;

    const aAddr = this.evaluateOperand(pc, aMode, aField, this.size);
    const bAddr = this.evaluateOperand(pc, bMode, bField, this.size);

    const a = this.memory[aAddr];
    const b = this.memory[bAddr];

    instruction.owner = warrior.number;

    let shouldIncrement = true;

    switch (opcode) {
      case Opcode.ADD:
        if (bMode === AddressingMode.Immediate) {
          return; // TODO: Invalid
        }
        if (aMode === AddressingMode.Immediate) {
          b.bField = this.evaluateField(bAddr, b.bField) + aAddr;
          b.owner = warrior.number;
        } else {
          b.aField = this.evaluateField(bAddr, b.aField) + aAddr;
          b.bField = this.evaluateField(bAddr, b.bField) + bAddr;
          b.owner = warrior.number;
        }
        break;
      case Opcode.CMP:
        // TODO: CMP X, #X
        if (aMode === AddressingMode.Immediate) {
          if (aField === b.bField) {
            warrior.pc.push(pc + 2);
            shouldIncrement = false;
          }
        } else {
          // TODO: Test this — I assume equality doesn't actually work?
          if (a === b) {
            warrior.pc.push(pc + 2);
            shouldIncrement = false;
          }
        }
        break;
      case Opcode.DAT:
        // Don't do anything, just let the process die
        shouldIncrement = false;
        break;
      case Opcode.DJN:
        if (bMode === AddressingMode.Immediate) {
          // TODO: Invalid
          break;
        }
        b.bField = this.evaluateField(bAddr, b.bField) - 1;
        b.owner = warrior.number;

        if (b.bField === 0 && aMode != AddressingMode.Immediate) {
          warrior.pc.push(a.aField);
          shouldIncrement = false;
        }
        break;
      case Opcode.MOV:
        if (
          aMode === AddressingMode.Immediate ||
          bMode === AddressingMode.Immediate
        ) {
          b.bField = aAddr;
          b.owner = warrior.number;
        } else {
          this.memory[bAddr] = Object.assign({}, a);
          if (a.label) {
            this.labels[a.label] = bAddr;
          }
        }
        break;
      case Opcode.JMP:
        if (aMode === AddressingMode.Immediate) {
          break;
        }
        warrior.pc.push(aAddr);
        shouldIncrement = false;
        break;
      case Opcode.JMZ:
        if (aMode === AddressingMode.Immediate) {
          break;
        }
        if (b.bField === 0) {
          warrior.pc.push(aAddr);
          shouldIncrement = false;
        }
        break;
      case Opcode.JMZ:
        if (aMode === AddressingMode.Immediate) {
          break;
        }
        if (b.bField !== 0) {
          warrior.pc.push(aAddr);
          shouldIncrement = false;
        }
        break;
      case Opcode.SPL:
        if (aMode === AddressingMode.Immediate) {
          break;
        }
        warrior.pc.push(pc + 1);
        warrior.pc.push(aAddr);
        shouldIncrement = false;
        break;
      case Opcode.SLT:
        if (bMode === AddressingMode.Immediate) {
          // TODO: Spec disallows this, but I kinda like it
          break;
        }

        var compareValue: number;
        if (aMode === AddressingMode.Immediate) {
          compareValue = aField;
        } else {
          compareValue = a.aField;
        }
        if (compareValue < b.bField) {
          warrior.pc.push(pc + 2);
          shouldIncrement = false;
        }
        break;
      case Opcode.SUB:
        if (bMode === AddressingMode.Immediate) {
          return; // TODO: Invalid
        }
        if (aMode === AddressingMode.Immediate) {
          b.bField = this.evaluateField(bAddr, b.bField) - aAddr;
          b.owner = warrior.number;
        } else {
          b.aField = this.evaluateField(bAddr, b.aField) - aAddr;
          b.bField = this.evaluateField(bAddr, b.bField) - bAddr;
          b.owner = warrior.number;
        }
        break;
    }
    if (shouldIncrement) {
      warrior.pc.push(normalizedIndex(pc + 1, this.size));
    }
  }

  /** Takes a given operand and returns an actual numeric value
   *  If mode is .Immediate, this will be a raw value.
   *  Otherwise, it will be an absolute address.
   *  If mode is .Autoincrement, this will mutate memory.
   */
  private evaluateOperand(
    pc: number,
    mode: AddressingMode,
    field: number | string | MathExpression,
    size: number
  ): number {
    if (typeof field === "number") {
      if (mode === AddressingMode.Immediate) {
        return field;
      }

      var absoluteAddr = (field + pc) % size;

      if (mode === AddressingMode.Direct) {
        return absoluteAddr;
      }

      let value = this.evaluateField(
        absoluteAddr,
        this.memory[absoluteAddr].bField
      );

      if (mode === AddressingMode.Autodecrement) {
        value -= 1;
        this.memory[absoluteAddr].bField = value;
      }

      absoluteAddr += value;
      return absoluteAddr % size;
    } else {
      const evaluatedField = this.evaluateField(pc, field);
      return this.evaluateOperand(pc, mode, evaluatedField, size);
    }
  }

  /** Takes a given field and normalizes it into a relative address number.
   *  It (1) performs label/equ lookups and (2) evaluates math operations.
   *  It does NOT actually resolve that number to an absolute address
   */
  // TODO: This returns -1 if it fails. It should fail more noisily
  private evaluateField(
    absoluteAddr: number,
    field: string | number | MathExpression
  ): number {
    const isMathExpression = (
      x: number | string | MathExpression
    ): x is MathExpression => {
      return (<MathExpression>x).operator !== undefined;
    };

    if (typeof field === "number") {
      return field;
    } else if (isMathExpression(field)) {
      const left = this.evaluateField(absoluteAddr, field.left);
      const right = this.evaluateField(absoluteAddr, field.right);
      if (_.isUndefined(left) || _.isUndefined(right)) {
        return -1;
      }
      switch (field.operator) {
        case MathOperator.Add:
          return left + right;
        case MathOperator.Subtract:
          return left - right;
        case MathOperator.Multiply:
          return left * right;
        case MathOperator.Divide:
          return left / right;
      }
      return -1;
    } else if (typeof field === "string") {
      if (this.labels[field] != undefined) {
        return (this.labels[field] as number) - absoluteAddr;
      } else if (this.equs[field] != undefined) {
        return this.equs[field];
      } else {
        // TODO: Should this throw?
        console.log(`FATAL ERROR: could not find label '${field}'`);
        return -1;
      }
    } else {
      return -1;
    }
  }
}

function normalizedIndex(index: number, size: number) {
  let newIndex = index;
  if (newIndex < 0) {
    newIndex = size + newIndex;
  }

  return newIndex % size;
}

function addressingModeAsString(mode: AddressingMode): string {
  switch (mode) {
    case AddressingMode.Direct:
      return "";
    case AddressingMode.Immediate:
      return "#";
    case AddressingMode.Indirect:
      return "@";
    case AddressingMode.Autodecrement:
      return ">";
  }
}

function mathOperatorAsString(operator: MathOperator): string {
  switch (operator) {
    case MathOperator.Add:
      return "+";
    case MathOperator.Subtract:
      return "-";
    case MathOperator.Multiply:
      return "*";
    case MathOperator.Divide:
      return "/";
  }
}

export function printInstruction(instruction: Instruction): string {
  const str = `${printOpcode(instruction)} ${printOperandA(
    instruction
  )}, ${printOperandB(instruction)}`;

  if (instruction.label) {
    return `${instruction.label} ${str}`;
  } else {
    return str;
  }
}

export const printOpcode = (instruction: Instruction) => {
  return Opcode[instruction.opcode];
};

export const printOperand = (
  mode: AddressingMode,
  value: string | number | MathExpression
): string => {
  return `${addressingModeAsString(mode)}${printOperandVal(value)}`;
};

export const printOperandA = (instruction: Instruction): string => {
  return printOperand(instruction.aMode, instruction.aField);
};

export const printOperandB = (instruction: Instruction): string => {
  return printOperand(instruction.bMode, instruction.bField);
};

const printOperandVal = (operand: string | number | MathExpression): string => {
  if (typeof operand == "string") {
    return operand;
  } else if (typeof operand == "number") {
    return "" + operand;
  } else {
    return `${printOperandVal(operand.left)}${mathOperatorAsString(
      operand.operator
    )}${printOperandVal(operand.right)}`;
  }
};
