import { ComputeEngine } from "@cortex-js/compute-engine";
const ce = new ComputeEngine();
const latexOptions = {
  decimalMarker: "{,}",
  groupSeparator: "",
  imaginaryUnit: "\\operatorname{i}"
}


console.log(JSON.stringify(ce.parse("\\frac{\\ln{9}}{\\ln{3}}").simplify()));
console.log(JSON.stringify(ce.parse("\\ln{3}+\\ln{\\frac{1}{3}}").simplify()));
console.log(JSON.stringify(ce.parse("ee^{-x}e^x").simplify()));
