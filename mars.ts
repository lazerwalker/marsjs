import {AddressingMode, Opcode, Instruction, Warrior, MathExpression, MathOperator} from "./types"

export class VM {
    readonly warriors: Warrior[]
    readonly memory: Instruction[]

    readonly programs: Instruction[][]
    readonly size: number
    readonly cycleLimit: number

    cycles: number = 0
    nextProgramIndex: number = 0

    private labels = {} 
    private equs = {}

    constructor(programs: Instruction[][], 
                size: number = 8000,
                cycleLimit: number) {
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
                const absoluteAddr = start + j
                const instruction = program[j]

                if (instruction.opcode === Opcode.END) {
                    if (instruction.aField && this.labels[instruction.aField]) {
                        positions[i] = this.labels[instruction.aField]
                    }
                    break
                }

                this.memory[absoluteAddr] = instruction

                if (instruction.label) {
                    const label = instruction.label

                    if (instruction.opcode === Opcode.EQU) {
                        this.equs[label] = instruction.aField
                    } else {
                        this.labels[label] = absoluteAddr
                    }
                }
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
        if (!!this.cycleLimit && this.cycles > this.cycleLimit) {
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
            output.push(`Process Queue: [${warrior.pc}]`)
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

        const aAddr = this.evaluateField(pc, aMode, aField)
        const bAddr = this.evaluateField(pc, bMode, bField)

        const a = this.memory[aAddr]
        const b = this.memory[bAddr]

        let shouldIncrement = true

        switch(opcode) {
            case Opcode.ADD:
                if (bMode === AddressingMode.Immediate) {
                    return // TODO: Invalid
                }
                if (aMode === AddressingMode.Immediate) {
                    b.bField += aField
                }  else {
                    b.aField += a.aField
                    b.bField += a.bField                 
                }
                break
            case Opcode.CMP:
                // TODO: CMP X, #X
                if (aMode === AddressingMode.Immediate) {
                    if (aField === b.bField) {
                        warrior.pc.push(pc + 2)
                        shouldIncrement= false
                    }
                } else {
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
                b.bField -= 1

                if (b.bField === 0 && aMode != AddressingMode.Immediate) {
                    warrior.pc.push(a.aField)
                    shouldIncrement = false
                }
                break
            case Opcode.MOV:
                if (aMode === AddressingMode.Immediate || bMode === AddressingMode.Immediate) {
                    b.bField = aAddr
                } else { 
                    this.memory[bAddr] = Object.assign({}, a)
                    if (a.label) {
                        this.labels[a.label] = bAddr
                    }
                }
                break
            case Opcode.JMP:
                if (aMode === AddressingMode.Immediate) { break }
                warrior.pc.push(aAddr)
                shouldIncrement = false
                break
            case Opcode.JMZ:
                if (aMode === AddressingMode.Immediate) { break }
                if (b.bField === 0) {                  
                    warrior.pc.push(aAddr)
                    shouldIncrement = false
                }
                break 
            case Opcode.JMZ:
                if (aMode === AddressingMode.Immediate) { break }
                if (b.bField !== 0) {
                    warrior.pc.push(aAddr)
                    shouldIncrement = false
                }
                break 
            case Opcode.SPL:
                if (aMode === AddressingMode.Immediate) { break }            
                warrior.pc.push(pc + 1)
                warrior.pc.push(aAddr)
                shouldIncrement = false
                break
            case Opcode.SLT:
                if (bMode === AddressingMode.Immediate) {
                    // TODO: Spec disallows this, but I kinda like it
                    break
                }

                var compareValue: number
                if (aMode === AddressingMode.Immediate) {
                    compareValue = aField
                } else {
                    compareValue = a.aField
                }
                if (compareValue < b.bField) {
                    warrior.pc.push(pc + 2)
                    shouldIncrement = false
                }
                break                              
            case Opcode.SUB:
                if (bMode === AddressingMode.Immediate) {
                    return // TODO: Invalid
                }
                if (aMode === AddressingMode.Immediate) {
                    b.bField -= aField
                }  else {
                    b.aField -= a.aField
                    b.bField -= a.bField                 
                }
                break
        }
        if (shouldIncrement) {
            warrior.pc.push(normalizedIndex(pc + 1, this.size))
        }
    }

    /** Evaluates the value of a given field.
     *  If mode is .Immediate, this will be a raw value.
     *  Otherwise, it will be an absolute address.
     *  If mode is .Autoincrement, this will mutate memory.
     */
    private evaluateField(pc: number, mode: AddressingMode, field: number | string | MathExpression ): number {
        function isMathExpression(x: number | string | MathExpression): x is MathExpression {
            return (<MathExpression>x).operator !== undefined;
        }

        if (isMathExpression(field)) {
            const left = this.evaluateField(pc, mode, field.left)
            const right = this.evaluateField(pc, mode, field.right)
            switch(field.operator) {
                case MathOperator.Add:
                    return left + right
                case MathOperator.Subtract:
                    return left - right
                case MathOperator.Multiply:
                    return left * right
                case MathOperator.Divide:
                    return left / right
            }
        } 
        if (typeof field === "string" ) {
            if (this.labels[field]) {
                field = this.equs[field]
            }

            if (typeof field === "string" && this.equs[field]) {
                return this.labels[field]
            }
        }

        if (typeof field === "number") {
            if (mode === AddressingMode.Immediate) {
                return field
            }

            let absolute = pc + (field as number)

            if (mode === AddressingMode.Direct) {
                return absolute
            }

            let value = this.memory[absolute].bField
            
            if (mode === AddressingMode.Autodecrement) {
                value -= 1
                this.memory[absolute].bField = value
            }

            absolute += value
            return absolute
        }
        return 0
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

function mathOperatorAsString(operator: MathOperator): string {
    switch(operator) {
        case MathOperator.Add:
            return "+"
        case MathOperator.Subtract:
            return "-"
        case MathOperator.Multiply:
            return "*"
        case MathOperator.Divide:
            return "/"
    }
}

function printInstruction(instruction: Instruction): string {
    const str = `${Opcode[instruction.opcode]} ${addressingModeAsString(instruction.aMode)}${printOperand(instruction.aField)}, ${addressingModeAsString(instruction.bMode)}${printOperand(instruction.bField)}`

    if (instruction.label) {
        return `${instruction.label} ${str}`
    } else {
        return str
    }
}

function printOperand(operand: string | number | MathExpression): string {
    if (typeof operand == "string") {
        return operand
    } else if (typeof operand == "number") {
        return "" + operand
    } else {
        return `${printOperand(operand.left)}${mathOperatorAsString(operand.operator)}${printOperand(operand.right)}`
    }
}