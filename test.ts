import { parse } from "./parser";
import { VM } from "./mars";
import { readFileSync } from "fs";

const script = readFileSync("validate.rs", "utf8");

const test = parse(script);
const vm = new VM([test]);

console.log(vm.print());

var timeout = 0;
function loop() {
  if (vm.tick()) {
    console.log(vm.print());
    setTimeout(loop, timeout);
  }
}

loop();
