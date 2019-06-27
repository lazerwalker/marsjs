import { parse } from "./parser";
import { VM } from "./mars";

const imp = "MOV 0, 1";
const bomb = `
DAT #0, #0
start ADD #4, 3 
MOV 2, @2
JMP start
DAT #0, #0
END start
`;
const parsed = [bomb, imp].map(parse);
const vm = new VM(parsed);

console.log(vm.print());
while (vm.tick()) {
  console.log(vm.print());
}
