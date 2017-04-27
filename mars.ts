import {AddressingMode, Opcode, Instruction, Warrior} from "./types"

export class VM {
    readonly warriors: Warrior[]
    readonly memory: Instruction[]

    readonly programs: Instruction[][]
    readonly size: number
    readonly cycleLimit: number

    cycles: number = 0
    nextProgramIndex: number = 0

    constructor(programs: Instruction[][], 
                size: number = 8000,
                cycleLimit: number = 10) {
        this.memory = []
        
        this.programs = programs
        this.size = size
        this.cycleLimit = cycleLimit

        const emptyInstruction: Instruction = {
            opcode: Opcode.DAT, 
            aMode: AddressingMode.Immediate,
            aField: 0,
            bMode: AddressingMode.Immediate,
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
            return {number: idx, pc: [pc]}
        })
    }

    tick(): boolean {
        let warrior = this.warriors[this.nextProgramIndex]
        if (this.canExecute(warrior)) {
            this.execute(warrior)
        } else {
            console.log(`Game over: player ${warrior.number} bombed!`)
            return false
        }

        this.cycles++
        if (this.cycles > this.cycleLimit) {
            console.log("Game over: draw!")
            return false
        }

        this.nextProgramIndex += 1
        if (this.nextProgramIndex >= this.warriors.length) {
            this.nextProgramIndex = 0
        }
        return true
    }

    print(): string {
        let output: string[] = []
        output.push(`CYCLE ${this.cycles}`)
        for (let warrior of this.warriors) {
            for (var i = -5; i < 15; i++) {
                let index = normalizedIndex(warrior.pc[0] + i, this.size)
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

    private canExecute(warrior: Warrior): boolean {
        const instruction = this.memory[warrior.pc[0]]
        return instruction.opcode !== Opcode.DAT
    }

    private execute(warrior: Warrior) {
        const pc = warrior.pc.shift() as number
        const instruction = this.memory[pc]
        const {opcode, aMode, aField, bMode, bField} = instruction

        let shouldIncrement = true

        switch(opcode) {
            case Opcode.ADD:
                if (bMode === AddressingMode.Immediate) {
                    return // TODO: Invalid
                }
                if (aMode === AddressingMode.Immediate) {
                    let target = this.resolveInstruction(pc, bMode, bField, false)
                    target.bField += aField
                }  else {
                    var a = this.resolveInstruction(pc, aMode, aField, true)
                    var b = this.resolveInstruction(pc, bMode, bField, false)   

                    b.aField += a.aField
                    b.bField += a.bField                 
                }
                break
            case Opcode.CMP:
                // TODO: CMP X, #X
                if (aMode === AddressingMode.Immediate) {
                    var bValue = this.resolveInstruction(pc, bMode, bField, false).bField
                    if (aField === bValue) {
                        warrior.pc.push(pc + 2)
                        shouldIncrement= false
                    }
                } else {
                    let a = this.resolveInstruction(pc, aMode, aField, true)
                    let b = this.resolveInstruction(pc, bMode, bField, false)   
  
                    // TODO: Test this — I assume equality doesn't actually work?
                    if (a === b) {
                        warrior.pc.push(pc + 2)
                        shouldIncrement = false
                    }
                }
                break
            case Opcode.DJN:
                if (bMode === AddressingMode.Immediate) {
                    // TODO: Invalid
                    break
                }
                let bAddr = this.resolveInstructionAddress(pc, bMode, bField, false)
                var b = this.memory[bAddr]
                b.bField -= 1
                if (b.bField === 0 && aMode != AddressingMode.Immediate) {
                    let instr = this.resolveInstruction(pc, aMode, aField, true)
                    warrior.pc.push(instr.aField)
                    shouldIncrement = false
                }
                break
            case Opcode.MOV:
                if (aMode === AddressingMode.Immediate || bMode === AddressingMode.Immediate) {
                    var b = this.resolveInstruction(pc, bMode, bField, false)                    
                    b.bField = aField
                } else { 
                    let a = this.resolveInstruction(pc, aMode, aField, true)
                    let bAddr = this.resolveInstructionAddress(pc, bMode, bField, false)
                    this.memory[bAddr] = Object.assign({}, a)
                }
                break
            case Opcode.JMP:
                if (aMode === AddressingMode.Immediate) {
                    break
                }
                var addr = this.resolveInstructionAddress(pc, aMode, aField, true)
                warrior.pc.push(addr)
                shouldIncrement = false
                // TODO: Confirm indirect works
                // TODO: Autodecrement
                break
            case Opcode.JMZ:
                var bValue = this.resolveInstruction(pc, bMode, bField, false).bField
                if (bValue === 0) {
                    var addr = this.resolveInstructionAddress(pc, bMode, bField, false)
                    warrior.pc.push(addr)
                    shouldIncrement = false
                }
                break 
            case Opcode.JMZ:
                var bValue = this.resolveInstruction(pc, bMode, bField, false).bField
                if (bValue !== 0) {
                    var addr = this.resolveInstructionAddress(pc, bMode, bField, false)
                    warrior.pc.push(addr)
                    shouldIncrement = false
                }
                break 
            case Opcode.SPL:
                var addr = this.resolveInstructionAddress(pc, aMode, aField, true)
                warrior.pc.push(pc + 1)
                warrior.pc.push(addr)
                break
            case Opcode.SLT:
                if (bMode === AddressingMode.Immediate) {
                    // TODO: Spec disallows this, but I kinda like it
                    break
                }
                var bValue = this.resolveInstruction(pc, bMode, bField, false).bField 
                var compareValue: number
                if (aMode === AddressingMode.Immediate) {
                    compareValue = aField
                } else {
                    compareValue = this.resolveInstruction(pc, aMode, aField, true).bField
                }
                if (compareValue < bValue) {
                    warrior.pc.push(pc + 2)
                    shouldIncrement = false
                }
                break                              
            case Opcode.SUB:
                if (bMode === AddressingMode.Immediate) {
                    return // TODO: Invalid
                }
                if (aMode === AddressingMode.Immediate) {
                    let target = this.resolveInstruction(pc, bMode, bField, false)
                    target.bField -= aField
                }  else {
                    let a = this.resolveInstruction(pc, aMode, aField, true)
                    let b = this.resolveInstruction(pc, bMode, bField, false)   
                    b.aField -= a.aField
                    b.bField -= a.bField                 
                }
                break
        }
        if (shouldIncrement) {
            warrior.pc.push(normalizedIndex(pc + 1, this.size))
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
                return normalizedIndex(pc + field, this.size)
            case AddressingMode.Indirect:
                address = normalizedIndex(pc + field, this.size)
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
}

function normalizedIndex(index: number, size: number) {
    let newIndex = index
    if (newIndex < 0) {
        newIndex = size + newIndex
    }

    return newIndex % size;
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