import {BoxedExpression, BoxedRule, BoxedSubstitution} from "@cortex-js/compute-engine";
import {assert, latex, latexOptions, renderLatex} from "./util";
import {html, TemplateResult} from "lit";
import {boxed_0, ce, Equation, Operation} from "./model";
import katex from "katex";
window.katex = katex;

const ADD: Operation = {
  name: "add", title: "`+\\square`", help: "Äquivalenzumformung: Auf beiden Seiten den Ausdruck addieren", arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);
    return [{
      variable: e.variable,
      left: ce.box(["Add", e.left, ce.box(arg!)]).simplify(),
      right: ce.box(["Add", e.right, ce.box(arg!)]).simplify()
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;+&nbsp;${latex(ce.box(arg!))}`
  }
};
const SUBTRACT: Operation = {
  name: "subtract", title: "`−\\square`", help: "Äquivalenzumformung: Auf beiden Seiten den Ausdruck subtrahieren", arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);
    return [{
      variable: e.variable,
      left: ce.box(["Subtract", e.left, ce.box(arg!)]).simplify(),
      right: ce.box(["Subtract", e.right, ce.box(arg!)]).simplify()
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${latex(ce.box(["Negate", arg!]))}`
  }
};
const MULTIPLY: Operation = {
  name: "multiply", title: "`\\cdot \\square`", help: "Äquivalenzumformung: Beide Seiten mit dem Ausdruck multiplizieren", arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);
    if (arg!.isZero)
      return error(e, "Beide Seiten mit 0 multiplizieren ist nicht erlaubt!");
    let sols = ce.box(["Equal", arg!, 0]).solve("x");
    if (sols && sols?.length != 0)
      return error(e, "Multiplizieren mit einen Term, der 0 werden kann, ist nicht erlaubt!");
    else
      return [{
        variable: e.variable,
        left: ce.box(["Multiply", e.left, ce.box(arg!)]).simplify(),
        right: ce.box(["Multiply", e.right, ce.box(arg!)]).simplify()
      }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;·&nbsp;${latex(ce.box(arg!))}`
  }
};
const DIVIDE: Operation = {
  name: "divide", title: "`:\\square`", help: "Äquivalenzumformung: Auf beiden Seiten durch den Ausdruck dividieren", arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);
    if (arg!.isZero)
      return error(e, "Durch 0 teilen ist nicht definiert!");
    let sols = ce.box(["Equal", arg!, 0]).solve("x");
    if (sols && sols?.length != 0)
      return error(e, "Teilen durch einen Term, der 0 werden kann, ist nicht erlaubt!");
    else
      return [{
        variable: e.variable,
        left: ce.box(["Divide", e.left, ce.box(arg!)]).simplify(),
        right: ce.box(["Divide", e.right, ce.box(arg!)]).simplify()
      }];
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;:&nbsp;${latex(ce.box(arg!))}`
  }
};
const SQRT: Operation = {
  name: "sqrt",
  title: "`\\sqrt{\\text{ }}`",
  help: "Äquivalenzumformung: Auf beiden Seiten die Wurzelfunktion anwenden",
  arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    const left = ce.box(["Sqrt", e.left]).simplify();
    const right = ce.box(["Sqrt", e.right]).simplify();

    if (left.N().isImaginary || right.N().isImaginary)
      return error(e, "In ℝ ist die Wurzel einer negativen Zahl nicht definiert!");

    let result: Equation[] = [{
      variable: e.variable,
      left: left,
      right: right.simplify(),
    }];
    if (!e.right.isZero)
      result.push({
        variable: e.variable,
        left: left,
        right: ce.box(["Negate", right]).simplify(),
      })
    return result;
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\sqrt{}")}`
  }
};
const ROOT: Operation = {
  name: "root",
  title: "`\\sqrt[n]{\\text{ }}`",
  help: "Äquivalenzumformung: Auf beiden Seiten die n-te Wurzel ziehen",
  arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);

    const left = ce.box(["Root", e.left, arg!]).simplify();
    const right = ce.box(["Root", e.right, arg!]).simplify();

    if (left.N().isImaginary || right.N().isImaginary)
      return error(e, "In ℝ ist die gerade Wurzel einer negativen Zahl nicht definiert!");

    let result: Equation[] = [{
      variable: e.variable,
      left: left,
      right: right.simplify(),
    }];
    if (Math.round(arg!.numericValue as number / 2) === arg!.numericValue as number / 2)
      result.push({
        variable: e.variable,
        left: left,
        right: ce.box(["Negate", right]).simplify(),
      });
    return result;
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${latex(ce.box(["Root", ce.parse("\\text{}"), arg!]))}`
  }
};
const SQUARE: Operation = {
  name: "square", title: "`\\square^2`", help: "Äquivalenzumformung: Beide Seiten quadrieren", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    const left = ce.box(["Square", e.left]).simplify();
    const right = ce.box(["Square", e.right]).simplify();

    return [{
      variable: e.variable,
      left: left,
      right: right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\square^2")}`
  }
};
const LN: Operation = {
  name: "ln", title: "ln", help: "Äquivalenzumformung: Auf beiden Seiten die Logarithmusfunktion anwenden", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    const left = ce.box(["Ln", e.left]).simplify();
    const right = ce.box(["Ln", e.right]).simplify();

    return left.N().isImaginary || right.N().isImaginary || left.isNaN || right.isNaN
      ? error(e, "In ℝ ist der Logarithmus nur für positive Zahlen definiert!")
      : [{
        variable: e.variable,
        left: left,
        right: right,
      }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\ln")}`
  }
};

async function lazyJsxGraph() {
  if (!customElements.get('kmap-jsxgraph')) {
    customElements.define('kmap-jsxgraph', (await import('kmap-jsxgraph')).KmapJsxGraph);
  }
}

function graph(f: string, y: number, sol1: BoxedExpression, sol2: BoxedExpression, p: BoxedExpression) {
  const l1 = sol1.toLatex(latexOptions).replace(/\\/g, '\\\\');
  const l2 = sol2.toLatex(latexOptions).replace(/\\/g, '\\\\');
  return `<kmap-jsxgraph useKatex style="min-width: 320px; max-width: 400px; aspect-ratio: 8/3; box-shadow: var(--elevation-01);">
    <style slot="styles">.term { background-color: white }</style>
    <script type="none" slot="attributes">
        { boundingBox: [-4, 1.5, 4, -1.5], pan: { enabled: false},
          defaultAxes: {
            x: { ticks: { scale: Math.PI, scaleSymbol: '\u03c0', ticksDistance: 1, insertTicks: false, minorTicks: 5 } },
            y: { ticks: { ticksDistance: 1, insertTicks: false, minorTicks: 1 } }
        } }
    </script>
    <script type="none" slot="script">
//<![CDATA[
    var board = this.board;
    var f = board.create('functiongraph', (x) => ${f}, {strokeWidth: 1});
    var g = board.create('functiongraph', (x) => ${y}, {strokeWidth: 1});
    var o = board.create('point', [0, 0], {visible: false});
    var x1 = board.create('point', [${sol1.N().value}, 0], {strokeWidth: 1, face: '+', name: "${l1}", label: {useKatex: true, offset: [0,10]}});
    var y1 = board.create('point', [${sol1.N().value}, ${y}], {visible: false});
    var s11 = board.create('segment', [o, x1], { color: JXG.palette.vermillion});
    var s12 = board.create('segment', [x1, y1], { color: JXG.palette.vermillion});
    var p = board.create('point', [${p.N().value}, 0], {visible: false});
    var x2 = board.create('point', [${sol2.N().value}, 0], {strokeWidth: 1, face: '+', name: "${l2}", label: {useKatex: true, offset: [0,10]}});
    var y2 = board.create('point', [${sol2.N().value}, ${y}], {visible: false});
    var s21 = board.create('segment', [p, x2], { color: JXG.palette.vermillion});
    var s22 = board.create('segment', [x2, y2], { color: JXG.palette.vermillion});
//]]></script></kmap-jsxgraph>`;
}

const ARCSIN: Operation = {
  name: "arcsin",
  title: "`\sin^{-1}`",
  help: "Äquivalenzumformung: Auf beiden Seiten die Arkussinusfunktion anwenden",
  arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    await lazyJsxGraph();

    if ("Sin" !== e.left.head)
      return error(e, "Auf der linken Seite muss die Sinusfunktion zu oberst stehen!");

    const left = e.left.ops![0];
    const sol1 = ce.box(["Arcsin", e.right]).simplify();

    let message;
    if (left.head !== "Symbol") {
      message = "Es empfiehlt sich, zunächst das Argument des Sinus mit u zu substituieren. Dann lässt sich die zweite Lösung der Periode einfacher bestimmen.";
      return [{
        variable: e.variable,
        left: left,
        right: sol1,
        message: message,
      }]
    }
    else {
      let sol2 = sol1.N().isNegative ? ce.box(["Subtract", ["Negate", ce.parse("\\pi")], sol1]).simplify() : ce.box(["Subtract", ce.parse("\\pi"), sol1]).simplify();
      let f = "Math.sin(x)"
      let p = sol1.N().isNegative ? ce.parse("-\\pi") : ce.parse("\\pi");
      message="<div style='display: flex; flex-wrap: wrap; gap: 16px'>" + graph(f, e.right.N().value as number, sol1, sol2, p) + "<span style='flex: min-content'>Pro Periode gibt es zwei Lösungen. Die erste liefert der WTR. Die zweite kann man mittels Symmetrie&shy;betrachtungen aus dem Schaubild der Standard Sinusfunktion ableiten.</span></div>"
      return [{
        variable: e.variable,
        left: left,
        right: sol1,
      }, {
        variable: e.variable,
        left: left,
        right: sol2,
        message: message
      }]
    }
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\sin^{-1}")}`
  }
};

const ARCCOS: Operation = {
  name: "arccos",
  title: "`\cos^{-1}`",
  help: "Äquivalenzumformung: Auf beiden Seiten die Arkuskosinusfunktion anwenden",
  arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    await lazyJsxGraph();

    if ("Cos" !== e.left.head)
      return error(e, "Auf der linken Seite muss die Kosinusfunktion zu oberst stehen!");

    const left = e.left.ops![0];
    const sol1 = ce.box(["Arccos", e.right]).simplify();

    let message;
    if (left.head !== "Symbol") {
      message = "Es empfiehlt sich, zunächst das Argument des Kosinus mit u zu substituieren. Dann lässt sich die zweite Lösung der Periode einfacher bestimmen.";
      return [{
        variable: e.variable,
        left: left,
        right: sol1,
        message: message,
      }]
    }
    else {
      let sol2 = ce.box(["Negate", sol1]).simplify();
      let f = "Math.cos(x)"
      let p = ce.box(0);
      message="<div style='display: flex; flex-wrap: wrap; gap: 16px'>" + graph(f, e.right.N().value as number, sol1, sol2, p) + "<span style='flex: min-content'>Pro Periode gibt es zwei Lösungen. Die erste liefert der WTR. Die zweite kann man mittels Symmetrie&shy;betrachtungen aus dem Schaubild der Standard Kosinusfunktion ableiten.</span></div>"
      return [{
        variable: e.variable,
        left: left,
        right: sol1,
      }, {
        variable: e.variable,
        left: left,
        right: sol2,
        message: message
      }]
    }
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\cos^{-1}")}`
  }
};

const PERIODIZE: Operation = {
  name: "periodize",
  title: "`+ k\\cdot\\square`",
  help: "Periodisierung. Die ein oder zwei Lösungen wiederholen sich periodisch.",
  arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);

    if ("Symbol" !== e.left.head)
      return error(e, "Muss zunächst nach x aufgelöst werden!");
    if (e.variable !== "x")
      return error(e, "Zuerst muss die Resubstitution erfolgen!");

    const right = ce.box(["Add", e.right, ["Multiply", "k", arg!]]);

    return [{
      variable: e.variable,
      left: e.left,
      right: right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>periodisieren</i>`
  }
};
const EXP: Operation = {
  name: "exp",
  title: "`e^{\\square}`",
  help: "Äquivalenzumformung: Auf beiden Seiten die Exponentialfunktion",
  arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    const left = ce.box(["Exp", e.left]).simplify();
    const right = ce.box(["Exp", e.right]).simplify();

    return [{
      variable: e.variable,
      left: left,
      right: right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("e^{\\square}")}`
  }
};
const FACTORIZE: Operation = {
  name: "factorize", title: "`\\square`&nbsp;ausklammern", help: "Auf der linken Seite den Ausdruck ausklammern", arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);
    return [{
      variable: e.variable,
      left: ce.box(["Multiply", arg!, ce.box(["Divide", e.left, ce.box(arg!)]).simplify()]),
      right: e.right
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;${latex(ce.box(arg!))}&nbsp;<i>ausklammern</i>`
  }
};
const EXPAND: Operation = {
  name: "expand", title: "Ausmultiplizieren", help: "Linke Seite ausmultiplizieren", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    return [{
      variable: e.variable,
      left: ce.box(["ExpandAll", e.left]).evaluate(),
      right: e.right
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>ausmultiplizieren</i>`
  }
};
const SUBSTITUTE: Operation = {
  name: "substitute", title: "Subst", help: "Alle Vorkommen des Ausdrucks werden durch u ersetzt", arg: true,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(arg !== undefined);
    //const exp: BoxedRule = { id: "exp", priority: 500, condition: undefined, match: ce.box(["Power", "e", "_a"]), replace: ce.box(["Exp", "_a"]) };
    const subst: BoxedRule = {id: "subst", priority: 300, condition: undefined, match: arg!, replace: ce.box("u")};
    const subst2: BoxedRule = {
      id: "subst2",
      priority: 1,
      condition: undefined,
      match: ce.box(["Power", arg!, 2]).simplify({recursive: true}),
      replace: ce.box(["Power", "u", 2])
    };
    return [{
      variable: "u",
      left: e.left.simplify({rules: new Set<BoxedRule>([])}).replace(new Set<BoxedRule>([subst, subst2]), {recursive: true})?.simplify({recursive: true}) || e.left,
      right: e.right.simplify({rules: new Set<BoxedRule>([])}).replace(new Set<BoxedRule>([subst, subst2]), {recursive: true})?.simplify({recursive: true}) || e.right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;${latex(arg!)}&nbsp;:=&nbsp;u`
  }
};
const RESUBSTITUTE: Operation = {
  name: "resubstitute", title: "Resubst", help: "u wird in den Ausdruck zurück ersetzt", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);
    let ee: Equation | undefined = e;
    while (ee && !arg) {
      if (ee.operation === SUBSTITUTE)
        arg = ee.arg;
      ee = ee.former;
    }
    if (arg === undefined)
      return error(e, "Es ist keine Substitution vorausgegangen!");

    e.arg = arg;
    const subst: BoxedRule = {id: "subst", priority: 1, condition: undefined, match: ce.box("u"), replace: arg!};
    return [{
      variable: "x",
      left: e.left.replace(new Set<BoxedRule>([subst]), {recursive: true})?.simplify() || e.left,
      right: e.right.replace(new Set<BoxedRule>([subst]), {recursive: true})?.simplify() || e.right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;u&nbsp;:=&nbsp;${latex(ce.box(arg!))}`
  }
};
const QUADRATIC_FORMULA: Operation = {
  name: "quadratic_formula", title: "MNF", help: "Für Gleichungen der Form ax²+bx+c=0", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);

    let max = 0;
    e.left.getSubexpressions("Power").forEach(s => max = Math.max(max, s.ops![1].numericValue as number));
    if (max > 2)
      return error(e, "Die Mitternachtsformel kann nur auf Polynomgleichungen vom Grad 2 angewandt werden");

    const quadraticForm = ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", e.variable, "_b"], "_c"]);
    const quadraticForm2 = ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", e.variable, "_b"]]);
    const quadraticForm3 = ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", "_c"]]);

    let match: BoxedSubstitution | null = null;
    try {
      match = e.left.match(quadraticForm);
    } catch (err) {
      console.log(err)
    }
    let message;
    if (match === null) {
      match = e.left.match(quadraticForm2);
      message = "Kann man mit MNF lösen, schneller geht's mit x Ausklammern und SVNP";
    }
    if (match === null) {
      match = e.left.match(quadraticForm3);
      message = "Kann man mit MNF lösen, schneller geht's mit Wurzel ziehen";
    }
    if (match === null || e.right.isNotZero)
      return error(e, "Die Mitternachtsformel kann nur auf Gleichungen der Form ax²+bx+c=0 angewandt werden!");

    const a = match!._a;
    const b = match!._b || 0;
    const c = match!._c || 0;
    let minus = ce.box(["Divide", ["Subtract", ["Negate", b], ["Sqrt", ["Subtract", ["Power", b, 2], ["Multiply", 4, a, c]]]], ["Multiply", 2, a]]);
    let plus = ce.box(["Divide", ["Add", ["Negate", b], ["Sqrt", ["Subtract", ["Power", b, 2], ["Multiply", 4, a, c]]]], ["Multiply", 2, a]]);

    const term = ce.box(["Subtract", ["Power", b, 2], ["Multiply", 4, a, c]]);
    const n = term.N();
    if (n.isNegative)
      return error({variable: 'x', left: term, right: boxed_0}, "`D = " + term.toLatex(latexOptions) + " < 0`");
    else if (n.isZero)
      return [{
        variable: e.variable,
        left: ce.box(e.variable),
        right: minus.evaluate().simplify(),
        message: message
      }];
    else
      return [{
        variable: e.variable,
        left: ce.box(e.variable),
        right: minus.evaluate().simplify(),
        message: message
      }, {
        variable: e.variable,
        left: ce.box(e.variable),
        right: plus.evaluate().simplify(),
        message: message
      }];
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>MNF</i>`
  }
};
const ZERO_PRODUCT: Operation = {
  name: "zero_product", title: "SVNP", help: "Eine Seite muss ein Produkt, die andere Null sein", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);

    if (!e.left.isEqual(boxed_0) && !e.right.isEqual(boxed_0))
      return error(e, "Auf einer Seite muss null stehen!")
    if ((e.left.json as Array<any>)[0] !== "Multiply" && (e.right.json as Array<any>)[0] !== "Multiply")
      return error(e, "Eine Seite muss ein Produkt sein!")

    let product = e.left.head === "Multiply" ? e.left : e.right;
    let equations: Equation[] = [];
    for (let factor of product.ops!) {
      //if ("Multiply" === factor.head)
      //  continue;
      if (!factor.has("x"))
        continue
      if (factor.head === "Power")
        factor = factor.ops![0];
      equations.push({
        variable: "x",
        left: ce.box(factor),
        right: boxed_0
      });
    }
    return equations;
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>SVNP</i>`
  }
};
const NULL_FORM: Operation = {
  name: "null_form", title: "Nullform", help: "In Nullform bringen", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);

    e.arg = ce.box(["Negate", e.right]).simplify();
    return [{
      variable: e.variable,
      left: ce.box(["Subtract", e.left, e.right]).simplify(),
      right: boxed_0
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${latex(ce.box(arg!))}`
  }
};
const SIMPLIFY: Operation = {
  name: "simplify", title: "Vereinfache", help: "Vereinfachen", arg: false,
  func: async (e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
    assert(!arg);

    return [{
      variable: e.variable,
      left: e.left.simplify(),
      right: e.right.simplify()
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>vereinfachen</i>`
  }
};
export const error = (e: Equation, message: string) => [{
  variable: e.variable,
  left: e.left,
  right: e.right,
  error: message,
}];

export const operations: Operation[] = [
  ADD, SUBTRACT, MULTIPLY, DIVIDE, SQRT, ROOT, SQUARE, LN, ARCSIN, ARCCOS, EXP,
  EXPAND, FACTORIZE, ZERO_PRODUCT, QUADRATIC_FORMULA, SUBSTITUTE, RESUBSTITUTE, PERIODIZE, NULL_FORM, SIMPLIFY
];
export function operation(name: string) {
  return operations.find(o => o.name === name)!;
}
export const sets: Map<string, string[]> = new Map([
  ['exponential', ["add", "subtract", "multiply", "divide", "ln", "factorize", "expand", "zero_product", "quadratic_formula", "substitute", "resubstitute"]],
  ['polynomial', ["add", "subtract", "multiply", "divide", "sqrt", "factorize", "expand", "zero_product", "quadratic_formula", "substitute", "resubstitute"]],
  ['polynomial-root', ["add", "subtract", "multiply", "divide", "root", "factorize", "expand", "zero_product", "quadratic_formula", "substitute", "resubstitute"]],
  ['trigonometrical', ["add", "subtract", "multiply", "divide", "arcsin", "arccos", "factorize", "expand", "zero_product", "substitute", "resubstitute", "periodize"]]
]);
