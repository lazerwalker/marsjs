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
    SLT
    // XCH
    // PCT
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
    pc: number
}

export class VM {
    readonly warriors: Warrior[]
    readonly memory: Instruction[]

    readonly programs: Instruction[][]
    readonly size: number
    readonly cycleLimit: number

    cycles: number = 0

    constructor(programs: Instruction[][], 
                size: number = 8000,
                cycleLimit: number = 10) {
        this.memory = []
        
        this.programs = programs
        this.size = size
        this.cycleLimit = cycleLimit

        const emptyInstruction: Instruction = {
            opcode: Opcode.DAT, 
            aMode: AddressingMode.Direct,
            aField: 0,
            bMode: AddressingMode.Direct,
            bField: 0   
        }

        for (let i = 0; i < size; i++) {
            this.memory[i] = Object.assign({}, emptyInstruction)
        }

        const maybePositions = this.findStartPositions(programs, size)

        if (maybePositions === null) {
            console.log("Could not assign positions")
            return
        }
        const positions = maybePositions as number[]

        // Copy programs to memory
        for (let i = 0; i < programs.length; i++) {
            const program = programs[i]
            const start = positions[i]

            for (let j = 0; j < program.length; j++) {
                this.memory[start + j] = program[j]
            }
        }

        this.warriors = positions.map( (pc, idx) => {
            return {number: idx, pc: pc}
        })
    }

    tick(): boolean {
        for(let warrior of this.warriors) {
            if (this.canExecute(warrior.pc)) {
                this.execute(warrior)
            } else {
                console.log(`Game over: player ${warrior.number} bombed!`)
                return false
            }

            this.cycles++
            if (this.cycles >= this.cycleLimit) {
                console.log("Game over: draw!")
                return false
            }
        }
        return true
    }

    print(): string {
        let output: string[] = []
        output.push(`CYCLE ${this.cycles}`)
        for (let warrior of this.warriors) {
            for (var i = -15; i < 15; i++) {
                let index = this.normalizedIndex(warrior.pc + i)
                let instr = index + ": " + printInstruction(this.memory[index])
                if (i === 0) {
                    instr += ` <-- ${warrior.number}`
                }
                output.push(instr)
            }
        }
        output.push("")
        return output.join("\n")
    }

    private findStartPositions(programs: Instruction[][], size: number): number[]|null {
        // TODO: Replace with a real randomizer
        // Constraints are:
        // * Must not overlap
        // * Should(?) be 1000 spaces away if possible

        if (programs.length > size / 1000) {
            return null
        }

        return programs.map( (_, idx) => idx * 1000 )
    }

    private canExecute(pc: number): boolean {
        const instruction = this.memory[pc]
        return instruction.opcode !== Opcode.DAT
    }

    private execute(warrior: Warrior) {
        const instruction = this.memory[warrior.pc]
        const {opcode, aMode, aField, bMode, bField} = instruction

        let shouldIncrement = true

        switch(opcode) {
            case Opcode.ADD:
                if (bMode === AddressingMode.Immediate) {
                    return // TODO: Invalid
                }
                if (aMode === AddressingMode.Immediate) {
                    let target = this.resolveInstruction(warrior.pc, bMode, bField, false)
                    target.bField += aField
                }  else {
                    let a = this.resolveInstruction(warrior.pc, aMode, aField, true)
                    let b = this.resolveInstruction(warrior.pc, bMode, bField, false)   

                    b.aField += a.aField
                    b.bField += a.bField                 
                }
                break;
            case Opcode.MOV:
                if (aMode === AddressingMode.Immediate || bMode === AddressingMode.Immediate) {
                    let b = this.resolveInstruction(warrior.pc, bMode, bField, false)                    
                    b.bField = aField
                } else { 
                    let a = this.resolveInstruction(warrior.pc, aMode, aField, true)
                    let bAddr = this.resolveInstructionAddress(warrior.pc, bMode, bField, false)
                    this.memory[bAddr] = Object.assign({}, a)
                }
                break;
            case Opcode.JMP:
                shouldIncrement = false
                if (aMode === AddressingMode.Direct) {
                    warrior.pc += aField
                } else if (aMode === AddressingMode.Indirect) {
                    let instr = this.resolveInstruction(warrior.pc, aMode, aField, true)
                    warrior.pc += instr.aField
                    // TODO: I don't think this actually works
                } else {
                    // Immediate: exit immediately
                    // Autodecrement: TODO
                    break;
                }
        }
        if (shouldIncrement) {
            warrior.pc = this.normalizedIndex(warrior.pc + 1)
        }
    }
    // TODO: `isA` is a weird hacky thing to deal with the fact that, when we recurse in indirect mode, we need to know whether we care about A or B
    private resolveInstruction(pc: number, mode: AddressingMode, field: number, isA: boolean): Instruction {
        const newAddr = this.resolveInstructionAddress(pc, mode, field, isA)
        return this.memory[newAddr]
    }

    private resolveInstructionAddress(pc: number, mode: AddressingMode, field: number, isA: boolean): number {
        let address: number
        switch(mode) {
            case AddressingMode.Direct:
                return this.normalizedIndex(pc + field)
            case AddressingMode.Indirect:
                address = this.normalizedIndex(pc + field)
                const target = this.memory[address]
                if (isA) {
                    return this.resolveInstructionAddress(address, target.aMode, target.aField, isA)
                } else {
                    return this.resolveInstructionAddress(address, target.bMode, target.bField, isA)
                }
            case AddressingMode.Autodecrement:
                // TODO
                return pc
            case AddressingMode.Immediate:
                // Unexpected, just return current instruction
                return pc
        }
    }

    private normalizedIndex(index: number): number {
        let newIndex = index
        if (newIndex < 0) {
            newIndex = this.size + newIndex
        }

        return newIndex % this.size;
    }
}

function addressingModeAsString(mode: AddressingMode): string {
    switch(mode) {
        case AddressingMode.Direct:
            return ""
        case AddressingMode.Immediate:
            return "#"
        case AddressingMode.Indirect:
            return "@"
        case AddressingMode.Autodecrement:
            return ">"
    }
}

function printInstruction(instruction: Instruction): string {
    return `${Opcode[instruction.opcode]} ${addressingModeAsString(instruction.aMode)}${instruction.aField}, ${addressingModeAsString(instruction.bMode)}${instruction.bField}`
}