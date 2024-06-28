import {ComputeEngine} from "@cortex-js/compute-engine";

const ce = new ComputeEngine();

let find = ce.latexDictionary.find(d => d.name === "Exp");
find!.serialize = (serializer, expr) => {
  const op12 = op(expr, 1);
  return joinLatex(["\\exponentialE^{", serializer.serialize(op12), "}"]);
};
ce.parse("e^{2x}").simplify().toLatex()
function isFunctionObject(expr: any) {
  return expr !== null && typeof expr === "object" && "fn" in expr;
}

function op(expr: any, n: number) {
  if (Array.isArray(expr))
    return expr[n] ?? null;
  if (expr === null || expr === void 0)
    return null;
  if (isFunctionObject(expr))
    return expr.fn[n] ?? null;
  return null;
}
function joinLatex(segments: string[]) {
  let sep = "";
  let result = "";
  for (const segment of segments) {
    if (segment) {
      if (/[a-zA-Z*]/.test(segment[0])) {
        result += sep;
      }
      if (/\\[a-zA-Z]+\*?$/.test(segment)) {
        sep = " ";
      } else {
        sep = "";
      }
      result += segment;
    }
  }
  return result;
}
