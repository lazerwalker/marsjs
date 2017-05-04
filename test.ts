import {parse} from "./parser"
import {VM} from "./mars"

const fs = require('fs')

const test = parse(fs.readFileSync('validate.rs'))
const vm = new VM([test], 8000, undefined)

console.log(vm.print())
while(vm.tick()) {
    console.log(vm.print())
}