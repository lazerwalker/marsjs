export enum AddressingMode {
    Immediate,
    Direct,
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

export interface Instruction {
    opcode: Opcode,
    label?: string,
    comment?: string

    aMode: AddressingMode,
    aField: number, // TODO: Not really a number!

    bMode: AddressingMode,
    bField: number, // TODO: Not really a number!
}

export interface Warrior {
    number: number
    pc: number[]
}