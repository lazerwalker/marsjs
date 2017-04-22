enum AddressingMode {
    Direct,
    Immediate,
    Indirect,
    Autodecrement // TODO: Distinguish between 86 and 88 (and 94?)
}

enum Opcode {
    DAT,
    MOV,
    ADD,
    SUB,
    JMZ,
    JMN,
    DJN,
    CMP,
    SPL,
    SLT
    // XCH
    // PCT
}

interface Instruction {
    opcode: Opcode,
    label?: string,
    comment?: string

    aMode: AddressingMode,
    aField: number, // TODO: Not really a number!

    bMode: AddressingMode,
    bField: number, // TODO: Not really a number!
}

interface Warrior {
    number: number
    pc: number
}

class VM {
    readonly warriors: Warrior[]
    readonly memory: Instruction[]

    constructor(readonly programs: Instruction[][], 
                readonly size: number = 8000) {
        this.memory = []
        
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

    tick() {
        for(let warrior of this.warriors) {
            console.log(warrior)
        }
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
}

const vm = new VM([[
    {
            opcode: Opcode.CMP, 
            aMode: AddressingMode.Direct,
            aField: 5,
            bMode: AddressingMode.Direct,
            bField: 4   
        }
]])
console.log(vm.memory)
