import {parse} from "./parser"
import {VM} from "./mars"

const fs = require('fs')

const script = fs.readFileSync('validate.rs')

const test = parse(script)
const vm = new VM([test])

console.log(vm.print())

var timeout = 0
function loop() {
    if (vm.tick()) {
        console.log(vm.print())
        setTimeout(loop, timeout)
    }
}

loop()