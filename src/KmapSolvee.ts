import {css, html, LitElement, PropertyValues, TemplateResult} from 'lit';
import {property, state} from 'lit/decorators.js';
import {unsafeHTML} from "lit/directives/unsafe-html.js";
import {BoxedExpression, BoxedRule, BoxedSubstitution, ComputeEngine} from "@cortex-js/compute-engine";
import katex from 'katex';
import {katexStyles} from "./katex-css.js";

const LOGGING = false;

const ce = new ComputeEngine();
const latexOptions = {
  decimalMarker: "{,}",
  groupSeparator: "",
  imaginaryUnit: "\\operatorname{i}"
}

interface Equation {
  variable: string,
  left: BoxedExpression,
  right: BoxedExpression,
  former?: Equation,
  derived?: Equation[],
  operation?: Operation,
  arg?: BoxedExpression,
  error?: string,
}

interface Operation {
  name: string,
  title: string,
  help: string,
  func: (e: Equation, arg?: BoxedExpression) => Equation[];
  arg: boolean;
  render(arg?: BoxedExpression): TemplateResult;
}
interface Strategy {
  name: string,
  title: string,
  help: string,
  arg: boolean;
  operations: Operation[]
}

function json(exp: BoxedExpression) {
  if (LOGGING) console.log(JSON.stringify(exp.json))
}

export class KmapSolvee extends LitElement {
  static styles = [css`
    :host {
      display: flex;
      flex-flow: column;
    }
    span.katex-display {
      margin: 0;
    }
    div.block {
      display: flex;
      flex-flow: column;
      flex: 1 1;
    }
    div.eqs {
      display: flex;
      flex-flow: row wrap;
    }
    span.eq, span.err, span.op, span.sols {
      margin: 4px;
      padding: 8px;
      border-radius: 8px;
      transition: background-color ease-in-out .1s, border-color ease-in-out 0.1s;
    }
    span.eq {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid lightgray;
    }
    span.err {
      border: 1px solid coral;
      background-color: lightpink;
    }
    span.eq[aria-pressed=true] {
      border-color: gold;
      background-color: lightyellow;
    }
    span.e, span.o {
      display: inline-flex;
      align-items: center;
      font-size: 1.21em;
      white-space: nowrap;
    }
    div.ops {
      display: flex;
      flex-flow: row wrap;
    }
    span.op {
      border: 1px solid lightblue;
      font-weight: bold;
    }
    span.op:has(button:active) {
      border: 1px solid darkgray;
      background-color: lightblue;
    }
    span.op input {
      border: 1px solid lightgray;
    }
    span.op button {
      border: none;
      background-color: transparent;
      font-weight: bold;
    }
  `,
  katexStyles];

  declare shadowRoot: ShadowRoot;

  @property({attribute: 'operations'})
  private operationNames?: string;
  @state()
  private operations: Operation[] = [];

  @property()
  private equation?: Equation;

  @state()
  private solutions?: BoxedExpression[];

  @state()
  private selected?: Equation;

  private valid: boolean = true;

  protected willUpdate(_changedProperties: PropertyValues) {
    if (_changedProperties.has("operationNames")) {
      let names = this.operationNames ? this.operationNames.split(",").map(n => n.trim()).map(n => sets.has(n) ? sets.get(n) : n).flat() : [];
      let ops: Operation[] = []
      names.forEach(n => {
        for (const operation of operations) {
          if (operation.name === n)
            ops.push(operation)
        }
      });
      this.operations = ops;
    }
  }

  updateSlotted({target}) {
    let content = target.assignedNodes().map((n) => n.textContent).join('');
    if (content) {
      let pos = content.indexOf('=')
      this.equation = { variable: "x", left: ce.parse(content.substring(0, pos))!, right: ce.parse(content.substring(pos+1))!}
      this.selected = this.equation
    }
  }

  /*
  protected async firstUpdated() {
    json(ce.parse("ee^xe^{-x}"))
    json(ce.parse("ee^xe^{-x}").simplify())
  }
   */

  apply(op: Operation, e: Equation, arg?: BoxedExpression) {
    console.assert(e)
    console.assert(e.variable)
    console.assert(e.left)
    console.assert(e.right)
    e.operation = op;
    e.arg = arg;
    let results: Equation[] = op.func(e, arg);
    results.forEach(d => d.former = e);
    e.derived = results;
    this.selected = e.derived[0];
    this.requestUpdate();
    this.log(results);
    let solutions: BoxedExpression[] = [];
    results.forEach(r => {
      if (r.left.isEqual(ce.box("x")) && r.right.isNumber)
        solutions.push(r.right)
    });
    if (solutions.length > 0)
      this.solutions = Array.from(new Set([...(this.solutions ? this.solutions : []), ...solutions])).sort((a, b) => a.isGreater(b) ? 1 : -1);

    return results;
  }

  private perform(o: Operation) {
    if (!this.selected)
      return;
    let ie = o.arg ? (this.shadowRoot!.getElementById("i_" + o.name) as HTMLInputElement) : undefined;
    let arg= ie && ie.value && ie.value !== "" ? ce.parse(ie.value) : undefined;
    this.apply(o, this.selected, arg);
    if (ie) ie.value = "";
  }

  private log(eqs: Equation[]) {
    eqs.forEach(e => console.log(JSON.stringify(e.left.json) + " = " + JSON.stringify(e.right.json)));
  }

  select(e: Equation) {
    e.derived = [];
    e.operation = undefined;
    e.arg = undefined;
    this.selected = e;
  }
  renderEquation(e: Equation): TemplateResult {
    return html`
      <div class="block">
        ${e.error ? html`<span class="err">${e.error}</span>` : html`
        <span class="eq" role="button" aria-pressed="${this.selected === e}" @click="${() => this.select(e)}">
          <span class="e">${latex(e.left)}&nbsp;=&nbsp;${latex(e.right)}</span>
          ${e.operation ? html`<span class="o">${e.operation.render(e.arg)}</span>` : undefined}
        </span>
        ${e.derived ? html`
          <div class="eqs">
          ${e.derived.map(d => html`${this.renderEquation(d)}`)}
        </div>` : undefined}
        `}
      </div>
    `;
  }

  renderOperation(o: Operation): TemplateResult {
    return html`
      <span class="op" title="${o.help}">
        <button @click="${() => this.perform(o)}">${o.title.match(/`.*`/) ? renderLatex(o.title.substring(1, o.title.length-1)) : o.title}</button>
      ${o.arg ? html`<input id="${"i_" + o.name}" type="text" size="2" @keydown="${(e) => { if (e.code === "Enter") this.perform(o)}}">` : undefined}
      </span>
    `;
  }

  render() {
    return html`
      <div hidden>
        <slot @slotchange=${this.updateSlotted}></slot>
      </div>
      <div class="ops">
        ${this.operations.map(o => html`${this.renderOperation(o)}`)}
      </div>
      <div class="eqs">
        ${this.equation ? html`${this.renderEquation(this.equation)}` : ``}
      </div>
      <div class="eqs">
        <span class="sols">${latex(this.solutions ? ce.box(["Equal","L_doublestruck",["Set", ...this.solutions]]) : ce.box(["Equal","L_doublestruck",["Set", ce.parse("\\text{...}")]]))}</span>
      </div>
    `;
  }

  public init() {
  }

  public bark() {
  }

  public showAnswer() {
  }

  public isValid(): boolean {
    return this.valid;
  }
}

function latex(expression: BoxedExpression) {
  if (LOGGING) console.log(JSON.stringify(expression.json))
  return renderLatex(expression.toLatex(latexOptions))
}
function renderLatex(tex: string) {
  tex = tex.replace(/\\exponentialE/g, "e");
  tex = tex.replace(/\\exp\(([^()]*)\)/g, "e^{$1}");
  return html`${unsafeHTML(katex.renderToString(tex, { output: "html", strict: false, throwOnError: false, trust: true, displayMode: true }))}`;
}
function assert(assertion: boolean, message?: string, params?: any[]) {
  console.assert(assertion, message, params)
  if (!assertion)
    throw new Error();
}
function error(e: Equation, message: string) {
  return [{
    variable: e.variable,
    left: e.left,
    right: e.right,
    error: message,
  }];
}

const ADD: Operation = { name: "add", title: "+", help: "Äquivalenzumformung: Auf beiden Seiten den Ausdruck addieren", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const SUBTRACT: Operation = { name: "subtract", title: "−", help: "Äquivalenzumformung: Auf beiden Seiten den Ausdruck subtrahieren", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(arg !== undefined);
    return [{
      variable: e.variable,
      left: ce.box(["Subtract", e.left, ce.box(arg!)]).simplify(),
      right: ce.box(["Subtract", e.right, ce.box(arg!)]).simplify()
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;-&nbsp;${latex(ce.box(arg!))}`
  }
};
const MULTIPLY: Operation = { name: "multiply", title: "•", help: "Äquivalenzumformung: Beide Seiten mit dem Ausdruck multiplizieren", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(arg !== undefined);
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
const DIVIDE: Operation = { name: "divide", title: "：", help: "Äquivalenzumformung: Auf beiden Seiten durch den Ausdruck dividieren", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(arg !== undefined);
    return [{
      variable: e.variable,
      left: ce.box(["Divide", e.left, ce.box(arg!)]).simplify(),
      right: ce.box(["Divide", e.right, ce.box(arg!)]).simplify()
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;:&nbsp;${latex(ce.box(arg!))}`
  }
};
const SQRT: Operation = { name: "sqrt", title: "√", help: "Äquivalenzumformung: Auf beiden Seiten die Wurzelfunktion anwenden", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(!arg);
    const left = ce.box(["Sqrt", e.left]).simplify();
    const right = ce.box(["Sqrt", e.right]).simplify();

    return left.isImaginary || right.isImaginary
      ? error(e, "In ℝ ist die Wurzel einer negativen Zahl nicht definiert!")
      : [{
      variable: e.variable,
      left: left,
      right: right,
    }, {
      variable: e.variable,
      left: left,
      right: ce.box(["Negate", right]).simplify(),
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\sqrt{}")}`
  }
};
const SQUARE: Operation = { name: "square", title: "`\\square^2`", help: "Äquivalenzumformung: Beide Seiten quadrieren", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const LN: Operation = { name: "ln", title: "ln", help: "Äquivalenzumformung: Auf beiden Seiten die Logarithmusfunktion anwenden", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(!arg);
    const left = ce.box(["Ln", e.left]).simplify();
    const right = ce.box(["Ln", e.right]).simplify();

    return left.isNaN || right.isNaN
      ? error(e, "Der Logarithmus ist nur für positive Zahlen definiert!")
      : [{
      variable: e.variable,
      left: left,
      right: right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${renderLatex("\\ln{}")}`
  }
};
const EXP: Operation = { name: "exp", title: "`e^{\\square}`", help: "Äquivalenzumformung: Auf beiden Seiten die Exponentialfunktion", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const FACTORIZE: Operation = { name: "factorize", title: "Ausklammern", help: "Auf der linken Seite den Ausdruck ausklammern", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const SUBSTITUTE: Operation = { name: "substitute", title: "Subst", help: "Alle Vorkommen des Ausdrucks werden durch u ersetzt", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(arg !== undefined);
    //const exp: BoxedRule = { id: "exp", priority: 500, condition: undefined, match: ce.box(["Power", "e", "_a"]), replace: ce.box(["Exp", "_a"]) };
    const subst: BoxedRule = { id: "subst", priority: 300, condition: undefined, match: arg!, replace: ce.box("u") };
    const subst2: BoxedRule = { id: "subst2", priority: 1, condition: undefined, match: ce.box(["Power", arg!, 2]).simplify({recursive: true}), replace: ce.box(["Power", "u", 2]) };
    return [{
      variable: "u",
      left: e.left.simplify({rules: new Set<BoxedRule>([])}).replace( new Set<BoxedRule>([subst, subst2]), {recursive: true})?.simplify({recursive: true}) || e.left,
      right: e.right.simplify({rules: new Set<BoxedRule>([])}).replace( new Set<BoxedRule>([subst, subst2]), {recursive: true})?.simplify({recursive: true}) || e.right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;${latex(arg!)}&nbsp;:=&nbsp;u`
  }
};
const RESUBSTITUTE: Operation = { name: "resubstitute", title: "Resubst", help: "u wird in den Ausdruck zurück ersetzt", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
    const subst: BoxedRule = { id: "subst", priority: 1, condition: undefined, match: ce.box("u"), replace: arg! };
    return [{
      variable: "x",
      left: e.left.replace( new Set<BoxedRule>([subst]), {recursive: true})?.simplify() || e.left,
      right: e.right.replace( new Set<BoxedRule>([subst]), {recursive: true})?.simplify() || e.right,
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;u&nbsp;:=&nbsp;${latex(ce.box(arg!))}`
  }
};
const QUADRATIC_FORMULA: Operation = { name: "quadratic_formula", title: "MNF", help: "Für Gleichungen der Form ax²+bx+c=0", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(!arg);
    const quadraticForm = ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", e.variable, "_b"], "_c"]);
    const quadraticForm2 = ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", e.variable, "_b"]]);

    let match: BoxedSubstitution | null = null;
    try {
      match = e.left.match(quadraticForm);
    }
    catch (err) {
      console.log(err)
    }
    if (match === null)
      match = e.left.match(quadraticForm2)

    if (match === null || e.right.isNotZero)
      return error(e, "Die Mitternachtsformel kann nur auf Gleichungen der Form ax²+bx+c=0 angewandt werden!");

    const a = match!._a;
    const b = match!._b;
    const c = match!._c || 0;
    let minus = ce.box(["Divide", ["Subtract", ["Negate", b], ["Sqrt", ["Subtract", ["Power", b, 2], ["Multiply", 4, a, c]]]], ["Multiply", 2, a]])
    let plus = ce.box(["Divide", ["Add", ["Negate", b], ["Sqrt", ["Subtract", ["Power", b, 2], ["Multiply", 4, a, c]]]], ["Multiply", 2, a]])
    return [{
      variable: e.variable,
      left: ce.box(e.variable),
      right: minus.evaluate(),
    }, {
      variable: e.variable,
      left: ce.box(e.variable),
      right: plus.evaluate(),
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>MNF</i>`
  }
};
const ZERO_PRODUCT: Operation = { name: "zero_product", title: "SvNP", help: "Eine Seite muss ein Produkt, die andere Null sein", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(!arg);

    if (!e.left.isEqual(ce.box("0")) && !e.right.isEqual(ce.box("0")))
      return error(e, "Auf einer Seite muss null stehen!")
    if ((e.left.json as Array<any>)[0] !== "Multiply" && (e.right.json as Array<any>)[0] !== "Multiply")
      return error(e, "Eine Seite muss ein Produkt sein!")

    let product = (e.left.json as Array<any>)[0] === "Multiply" ? e.left : e.right;
    let equations: Equation[] = [];
    for (const factor of product.json as Array<any>) {
      if ("Multiply" === factor)
        continue;
      equations.push({
        variable: "x",
        left: ce.box(factor),
        right: ce.box("0")
      });
    }
    return equations;
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;<i>SVNP</i>`
  }
};
const NULL_FORM: Operation = { name: "null_form", title: "Nullform", help: "In Nullform bringen", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(!arg);

    e.arg = ce.box(["Negate", e.right]).simplify();
    return [{
      variable: e.variable,
      left: ce.box(["Subtract", e.left, e.right]).simplify(),
      right: ce.box("0")
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`|&nbsp;&nbsp;${latex(ce.box(arg!))}`
  }
};
const SIMPLIFY: Operation = { name: "simplify", title: "Vereinfache", help: "Vereinfachen", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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

const STRATEGY_SUBSTITUTION_POLY: Strategy = {
  name: "strategy_substitution", title: "Substitution", help: "Strategie Substitution anwenden", arg: true,
  operations: [NULL_FORM, SUBSTITUTE, QUADRATIC_FORMULA, RESUBSTITUTE, SQRT]
};

const operations: Operation[] = [
  ADD, SUBTRACT, MULTIPLY, DIVIDE, SQRT, SQUARE, LN, EXP,
  FACTORIZE, ZERO_PRODUCT, QUADRATIC_FORMULA, SUBSTITUTE, RESUBSTITUTE, NULL_FORM, SIMPLIFY
];

const sets: Map<string, string[]> = new Map([
  ['exponential', ["add", "subtract", "multiply", "divide", "ln", "factorize", "zero_product", "quadratic_formula", "substitute", "resubstitute"]],
  ['polynomial', ["add", "subtract", "multiply", "divide", "sqrt", "factorize", "zero_product", "quadratic_formula", "substitute", "resubstitute"]]
]);
