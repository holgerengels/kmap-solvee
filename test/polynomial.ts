import {ComputeEngine} from "@cortex-js/compute-engine";

const ce = new ComputeEngine();
const tex: string = "2\\times3^{1/2}";
console.log(JSON.stringify(ce.parse(tex).json))
console.log(ce.parse(tex).latex)
