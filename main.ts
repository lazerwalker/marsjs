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
    JMP,
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

    readonly programs: Instruction[][]
    readonly size: number
    readonly cycleLimit: number

    cycles: number = 0

    constructor(programs: Instruction[][], 
                size: number = 8000,
                cycleLimit: number = 10000) {
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

    tick() {
        for(let warrior of this.warriors) {
            if (this.canExecute(warrior.pc)) {
                this.execute(warrior.pc)
                this.incrementPCIfAppropriate(warrior)
            } else {
                console.log(`Game over: player ${warrior.number} bombed!`)
            }

            this.cycles++
            if (this.cycles >= this.cycleLimit) {
                console.log("Game over: draw!")
            }
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

    private canExecute(pc: number): boolean {
        const instruction = this.memory[pc]
        return instruction.opcode !== Opcode.DAT
    }

    private execute(pc: number) {
        // TODO: A LOT OF LOGIC
        const instruction = this.memory[pc]
        console.log(instruction)
    }

    private incrementPCIfAppropriate(warrior: Warrior) {
        const instruction = this.memory[warrior.pc]

        if (instruction.opcode in [Opcode.JMP, Opcode.JMN, Opcode.JMZ]) {
            return
        } 
        warrior.pc = (warrior.pc + 1 % this.size)
        console.log(warrior.pc)
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

while(true) { 
    vm.tick() 
}
