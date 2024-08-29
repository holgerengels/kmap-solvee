import {ce, Equation, Strategy} from "./model";
import {operation} from "./operations";
import {BoxedExpression} from "@cortex-js/compute-engine";
import {boxedLatex} from "./util";

export const boxed_2pi = ce.parse("2\\cdot\\pi");

const STRATEGY_POLYNOMIAL: Strategy = {
  name: "polynomial",
  title: "",
  help: "",
  arg: false,
  async apply(equation, callback) {
    // terminal
    if (equation.left.isEqual(ce.box("x")) && !equation.right.has("x"))
      return;
    // bring into null form
    if (equation.right.isNotZero)
      equation = (await callback(operation("subtract"), equation, equation.right))[0];

    // zero product
    if (equation.left.head == "Multiply") {
      console.log(JSON.stringify(equation.left.json) + " is product");
      let results = await callback(operation("zero_product"), equation);
      for (let equation of results) {
        this.apply(equation, callback);
      }
      return;
    }
    // linear
    let match = equation.left.match(ce.box(["Add", ["Multiply", "_a", "x"], "_b"]));
    if (match) {
      console.log(JSON.stringify(equation.left.json) + " is linear");
      if (match!._b.isNotZero)
        equation = (await callback(operation("subtract"), equation, match!._b))[0];
      if (!match!._a.isOne)
        equation = (await callback(operation("divide"), equation, match!._a))[0];
      return;
    }
    // maybe factorize
    if (equation.left.head === "Add" && equation.right.isZero) {
      let min = 512;
      equation.left.ops?.forEach(o => {
        if (o.head === "Negate")
          o = o.ops![0];
        if (o.head === "Multiply")
          o = o.ops![1];
        if (o.head === "Symbol" && o.has("x"))
          min = 1;
        else if (o.head === "Power")
          min = Math.min(min, o.ops![1].numericValue as number);
        else
          min = -1;
      })
      if (min != -1) {
        let result = await callback((operation("factorize")), equation, ce.box(["Power", "x", min]));
        this.apply(result[0], callback);
        return;
      }
    }

    // power equation
    match = equation.left.match(ce.box(["Add", ["Multiply", "_a", ["Power", "x", "_n"]], "_b"]));
    if (match) {
      console.log(JSON.stringify(equation.left.json) + " is power");
      if (match!._b.isNotZero)
        equation = (await callback(operation("subtract"), equation, match!._b))[0];
      if (!match!._a.isOne)
        equation = (await callback(operation("divide"), equation, match!._a))[0];

      equation = (match!._n.numericValue === 2 ? await callback(operation("sqrt"), equation) : await callback(operation("root"), equation, match!._n))[0];
      return;
    }
    // quadratic
    match = equation.left.match(ce.box(["Add", ["Multiply", ["Power", equation.variable, "2"], "_a"], ["Multiply", equation.variable, "_b"], "_c"]));
    if (match) {
      console.log(JSON.stringify(equation.left.json) + " is quadratic");
      let results = await callback(operation("quadratic_formula"), equation);
      return;
    }
    // biquadratic
    let s = 2;
    match = equation.left.match(ce.box(["Add", ["Multiply", ["Power", equation.variable, "4"], "_a"], ["Multiply", ["Power", equation.variable, "2"], "_b"], "_c"]));
    if (!match) {
      s = 3;
      match = equation.left.match(ce.box(["Add", ["Multiply", ["Power", equation.variable, "6"], "_a"], ["Multiply", ["Power", equation.variable, "3"], "_b"], "_c"]));
    }
    if (!match) {
      s = 4;
      match = equation.left.match(ce.box(["Add", ["Multiply", ["Power", equation.variable, "8"], "_a"], ["Multiply", ["Power", equation.variable, "4"], "_b"], "_c"]));
    }
    if (match && match._c.isNotZero) {
      console.log(JSON.stringify(equation.left.json) + " is biquadratic " + s);
      equation = (await callback(operation("substitute"), equation, ce.box(["Power", "x", s])))[0];
      let results = await callback(operation("quadratic_formula"), equation);
      equation = (await callback(operation("resubstitute"), results[0]))[0];
      this.apply(equation, callback);
      equation = (await callback(operation("resubstitute"), results[1]))[0];
      this.apply(equation, callback);
      return;
    }
  }
}

function extractPeriod(equation: Equation) {
  let expression = ce.box(["ExpandAll", ...equation.left.ops!]).evaluate();
  if (expression.head === "Add")
    expression = expression.ops!.find(o => o.has("x"))!;

  let b: BoxedExpression | undefined;
  if (expression.head === "Multiply") {
    b = expression.ops!.find(o => !o.has("x"));
    return ce.box(["Divide", boxed_2pi, b!]).simplify()
  }
  else
    return boxed_2pi;
}

function top(equation: Equation) {
  let top = equation;
  while (top.former)
    top = top.former;
  return top;
}
function isolated(equation: Equation) {
  let iso = equation;
  while (iso.former && !((iso.left.head === "Sin" || iso.left.head === "Cos") && iso.left.has("x")))
    iso = iso.former;
  return iso;
}

const STRATEGY_TRIGONOMETRICAL: Strategy = {
  name: "trigonometrical",
  title: "",
  help: "",
  arg: false,
  async apply(equation, callback) {
    // terminal
    if (equation.left.isEqual(ce.box("x")) && !equation.right.has("x")) {
      await callback(operation("periodize"), equation, extractPeriod(isolated(equation)));
      return;
    }
    // isolate sin/cos on the left side
    if (equation.left.head === "Add") {
      const adds: BoxedExpression[] = [];
      equation.left.ops?.forEach(o => {
        if (!o.has("x"))
          adds.push(o);
      });
      equation = (await callback(operation("subtract"), equation, ce.box(["Add", ...adds])))[0];
      this.apply(equation, callback);
      return;
    }
    if (equation.left.head === "Subtract") {
      const subtracts: BoxedExpression[] = [];
      equation.left.ops?.forEach(o => {
        if (!o.has("x"))
          subtracts.push(o);
      });
      equation = (await callback(operation("subtract"), equation, ce.box(["Add", ...subtracts])))[0];
      this.apply(equation, callback);
      return;
    }
    if (equation.left.head === "Multiply") {
      const factors: BoxedExpression[] = [];
      equation.left.ops?.forEach(o => {
        if (!o.has("x"))
          factors.push(o);
      });
      equation = (await callback(operation("divide"), equation, ce.box(["Multiply", ...factors])))[0];
      this.apply(equation, callback);
      return;
    }
    if (equation.left.head === "Divide") {
      const divisors: BoxedExpression[] = [];
      equation.left.ops?.forEach(o => {
        if (!o.has("x"))
          divisors.push(o);
      });
      equation = (await callback(operation("multiply"), equation, ce.box(["Multiply", ...divisors])))[0];
      this.apply(equation, callback);
      return;
    }
    if (equation.left.head === "Sin") {
      const subst = equation.left.ops![0].head !== "Symbol";
      if (subst) {
        let p = extractPeriod(equation);
        top(equation).message = "`" + boxedLatex(ce.box(["Equal", "p", p])) + "`";

        equation = (await callback(operation("substitute"), equation, equation.left.ops![0]))[0];
      }

      const results = (await callback(operation("arcsin"), equation));
      results.forEach(async r => {
        if (subst)
          r = (await callback(operation("resubstitute"), r))[0];
        this.apply(r, callback);
      })
      return;
    }
    if (equation.left.head === "Cos") {
      const subst = equation.left.ops![0].head !== "Symbol";
      if (subst) {
        let p = extractPeriod(equation);
        top(equation).message = "`" + boxedLatex(ce.box(["Equal", "p", p])) + "`";

        equation = (await callback(operation("substitute"), equation, equation.left.ops![0]))[0];
      }

      const results = (await callback(operation("arccos"), equation));
      results.forEach(async r => {
        if (subst)
          r = (await callback(operation("resubstitute"), r))[0];
        this.apply(r, callback);
      })
      return;
    }
  }
}
export const strategies: Strategy[] = [STRATEGY_POLYNOMIAL, STRATEGY_TRIGONOMETRICAL];

export function strategy(name: string) {
  return strategies.find(o => o.name === name)!;
}
