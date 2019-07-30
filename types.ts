export enum AddressingMode {
  Direct,
  Immediate,
  Indirect,
  Autodecrement // TODO: Distinguish between 86 and 88 (and 94?)
}

export enum Opcode {
  DAT,
  MOV,
  ADD,
  SUB,
  JMZ,
  JMN,
  JMP,
  DJN,
  CMP,
  SPL,
  SLT,
  EQU,
  END
}

export enum MathOperator {
  Add,
  Divide,
  Subtract,
  Multiply
}

export interface MathExpression {
  left: string | number | MathExpression;
  right: string | number | MathExpression;
  operator: MathOperator;
}

export interface Instruction {
  opcode: Opcode;
  label?: string;
  comment?: string;

  aMode: AddressingMode;
  aField: number; // TODO: Not really a number!

  bMode: AddressingMode;
  bField: number; // TODO: Not really a number!

  owner?: number; // Warrior number
}

export const instructionToString = (instruction: Instruction): string => {
  const { label, opcode, aMode, aField, bMode, bField } = instruction;

  const mode = {
    [AddressingMode.Direct]: "",
    [AddressingMode.Immediate]: "#",
    [AddressingMode.Indirect]: "@",
    [AddressingMode.Autodecrement]: "<"
  };

  let str = `${Opcode[opcode]} ${mode[aMode]}${aField}, ${
    mode[bMode]
  } ${bField}`;

  if (label) {
    str = `${label} ${str}`;
  }

  return str;
};

export interface Warrior {
  number: number;
  pc: number[];
}
