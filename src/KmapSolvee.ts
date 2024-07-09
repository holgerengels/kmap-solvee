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
  message?: string,
}

interface Operation {
  name: string,
  title: string,
  help: string,
  func: (e: Equation, arg?: BoxedExpression) => Equation[];
  arg: boolean;
  render(arg?: BoxedExpression): TemplateResult;
}
interface Hint {
  match: string,
  operation: string,
  message: string
}
interface Strategy {
  name: string,
  title: string,
  help: string,
  arg: boolean;

  apply(e: Equation, callback: (op: Operation, e: Equation, arg?: BoxedExpression) => Promise<Equation[]>): void;
}

function json(exp: BoxedExpression, log?: boolean) {
  if (LOGGING || log) console.log(JSON.stringify(exp.json))
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
    span.eq, span.err, span.op, span.sols, span.msg {
      margin: 4px;
      padding: 8px;
      border-radius: 8px;
      align-content: center;
      transition: background-color ease-in-out .1s, border-color ease-in-out 0.1s;
    }
    span.eq {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid lightgray;
    }
    span.err {
      border: 1px solid firebrick;
      background-color: lightpink;
    }
    span.msg {
      border: 1px solid #fbc02d;
      background-color: #fffac1;
    }
    span.eq[aria-pressed=true] {
      border-color: #0288d1;
      background-color: #E1ECF4;
    }
    span[faded] {
      opacity: 0;
    }
    span:not([faded]) {
      transition: opacity 0.7s ease-in-out;
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
      border: 1px solid #5eb8ff;
      font-weight: 500;
    }
    span.op:has(button:active) {
      border: 1px solid #005b9f;
      background-color: #E1ECF4;
    }
    span.op input {
      border: 1px solid lightgray;
      width: 2em;
      text-transform: lowercase;
    }
    span.op button {
      border: none;
      background-color: transparent;
      font-family: unset;
      font-weight: 500;
      font-size: unset;
    }
  `,
  katexStyles];

  declare shadowRoot: ShadowRoot;

  @property({attribute: 'operations'})
  private operationNames?: string;
  @property({attribute: 'solutions'})
  private solutionTex?: string;
  @property({type: Array, converter: {
      fromAttribute: (value, type) => {
        return value ? JSON.parse(value) : [];
      },
      toAttribute: (value, type) => {
      }
    }})
  private hints: Hint[] = [];

  @state()
  private expectedSolutions: BoxedExpression[] = [];

  @property()
  private strategy?: string;

  @state()
  private operations: Operation[] = [];

  @property()
  private equation!: Equation;

  @state()
  private selected!: Equation;

  @state()
  private solutions: BoxedExpression[] = [];

  private valid: boolean = true;

  @state()
  private messages = new Set();

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
    if (_changedProperties.has("solutionTex")) {
      if (this.solutionTex) {
        const expected: BoxedExpression[] = [];
        this.solutionTex.split(",").forEach(n => {expected.push(ce.parse(n))})
        this.expectedSolutions = Array.from(new Set(expected)).sort(NUMERIC_COMPARISION);
      }
    }
  }

  protected updated(_changedProperties: PropertyValues) {
      let els = this.shadowRoot.querySelectorAll("[faded]");
      setTimeout(function () {
        els.forEach(e => e.removeAttribute("faded"))
      });
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
    console.log("lala")
    json(ce.box(["Divide",["Add",["Multiply",-6,["Sqrt",2]],-8],2]).simplify(), true)
    //console.log("im " + ce.box(["Multiply",["Complex",0,1],"Pi"]).simplify().isImaginary)
    //json(ce.parse("ee^xe^{-x}"))
    //json(ce.parse("ee^xe^{-x}").simplify())
    //json(ce.box(["Expand", ce.parse("(x+2)(x+1)^2x")]).evaluate(), true)
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
      this.solutions = Array.from(new Set([...this.solutions, ...solutions])).sort(NUMERIC_COMPARISION);

    if (e.message) {
      this.messages.add(e.message);
      this.requestUpdate("messages");
    }
    for (const hint of this.hints) {
    if (e.operation.name === hint.operation && ce.box(["Equal", e.left, e.right]).match(ce.parse(hint.match))) {
        this.messages.add(hint.message);
        this.requestUpdate("messages");
      }
    }

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
    if (LOGGING) eqs.forEach(e => console.log(JSON.stringify(e.left.json) + " = " + JSON.stringify(e.right.json)));
  }

  select(e: Equation) {
    e.derived = [];
    e.operation = undefined;
    e.arg = undefined;
    this.selected = e;
    this.messages.clear();
  }

  renderEquation(e: Equation): TemplateResult {
    return html`
      <div class="block">
        ${e.error ? html`<span class="err" faded>${e.error}</span>` : html`
        <span class="eq" faded role="button" aria-pressed="${this.selected === e}" @click="${() => this.select(e)}">
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
      ${o.arg ? html`<input id="${"i_" + o.name}" type="text" size="3" autocomplete="off" autocapitalize="off" onblur="this.value=this.value.toLowerCase()" @keydown="${(e) => { if (e.code === "Enter") this.perform(o)}}">` : undefined}
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
        <span class="sols">${latex(this.solutions.length ? ce.box(["Equal","L_doublestruck", ["Set", ...this.solutions]]) : ce.box(["Equal","L_doublestruck", ["Set", ce.parse("\\text{...}")]]))}</span>
      </div>
      <div class="eqs">
        ${Array.from(this.messages).map(m => html`<span class="msg" faded>${m}</span>`)}
      </div>
    `;
  }

  public init() {
    this.equation = { variable: "x", left: this.equation!.left, right: this.equation!.right }
    this.selected = this.equation;
    this.solutions = [];
    this.messages = new Set();
  }

  public bark() {
  }

  public showAnswer() {
    const strat = strategy(this.strategy || "");
    if (strat)
      strat.apply(this.equation, async (op: Operation, e: Equation, arg?: BoxedExpression): Promise<Equation[]> => {
        await new Promise(f => setTimeout(f, 500));
        return this.apply(op, e, arg);
      });
  }

  public isValid(): boolean {
    return this.valid;
  }
}
const compareArrays = (a, b) => a.length === b.length && a.every((element, index) => element.isEqual(b[index]));

function latex(expression: BoxedExpression) {
  if (LOGGING) console.log(JSON.stringify(expression.json))
  return renderLatex(expression.toLatex(latexOptions))
}
function renderLatex(tex: string) {
  tex = tex.replace(/\\exponentialE/g, "e");
  tex = tex.replace(/\\exp\(([^()]*)\)/g, "e^{$1}");
  tex = tex.replace(/\\\//g, "/");
  return html`${unsafeHTML(katex.renderToString(tex, { output: "html", strict: false, throwOnError: false, trust: true, displayMode: true }))}`;
}
const assert = (assertion: boolean, message?: string, params?: any[]) => {
  console.assert(assertion, message, params)
  if (!assertion)
    throw new Error();
};
const error = (e: Equation, message: string) => [{
  variable: e.variable,
  left: e.left,
  right: e.right,
  error: message,
}];

const NUMERIC_COMPARISION = (a, b) => a.value - b.value;

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
    return html`|&nbsp;&nbsp;${latex(ce.box(["Negate", arg!]))}`
  }
};
const MULTIPLY: Operation = { name: "multiply", title: "•", help: "Äquivalenzumformung: Beide Seiten mit dem Ausdruck multiplizieren", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const DIVIDE: Operation = { name: "divide", title: "：", help: "Äquivalenzumformung: Auf beiden Seiten durch den Ausdruck dividieren", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const SQRT: Operation = { name: "sqrt", title: "`\\sqrt{\\text{ }}`", help: "Äquivalenzumformung: Auf beiden Seiten die Wurzelfunktion anwenden", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
const ROOT: Operation = { name: "root", title: "`\\sqrt[n]{\\text{ }}`", help: "Äquivalenzumformung: Auf beiden Seiten die n-te Wurzel ziehen", arg: true,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
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
    if (Math.round(arg!.numericValue as number/2) === arg!.numericValue as number/2)
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

    return left.N().isImaginary || right.N().isImaginary || left.isNaN || right.isNaN
      ? error(e, "In ℝ ist der Logarithmus nur für positive Zahlen definiert!")
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
const EXPAND: Operation = { name: "expand", title: "Ausmultiplizieren", help: "Linke Seite ausmultiplizieren", arg: false,
  func: (e: Equation, arg?: BoxedExpression): Equation[] => {
    assert(!arg);
    return [{
      variable: e.variable,
      left: ce.box(["ExpandAll", e.left]).evaluate(),
      right: e.right
    }]
  },
  render: (arg?: BoxedExpression): TemplateResult => {
    return html`||&nbsp;&nbsp;${latex(ce.box(arg!))}&nbsp;<i>ausmultiplizieren</i>`
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
    const quadraticForm3 = ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", "_c"]]);

    let match: BoxedSubstitution | null = null;
    try {
      match = e.left.match(quadraticForm);
    }
    catch (err) {
      console.log(err)
    }
    let message;
    if (match === null) {
      match = e.left.match(quadraticForm2);
      message = "Kann man MNF lösen, schneller geht's mit x Ausklammern und SvNP";
    }
    if (match === null) {
      match = e.left.match(quadraticForm3);
      message = "Kann man MNF lösen, schneller geht's mit Wurzel ziehen";
    }
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
      right: minus.evaluate().simplify(),
      message: message
    }, {
      variable: e.variable,
      left: ce.box(e.variable),
      right: plus.evaluate().simplify(),
      message: message
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

const operations: Operation[] = [
  ADD, SUBTRACT, MULTIPLY, DIVIDE, SQRT, ROOT, SQUARE, LN, EXP,
  EXPAND, FACTORIZE, ZERO_PRODUCT, QUADRATIC_FORMULA, SUBSTITUTE, RESUBSTITUTE, NULL_FORM, SIMPLIFY
];

const sets: Map<string, string[]> = new Map([
  ['exponential', ["add", "subtract", "multiply", "divide", "ln", "factorize", "expand", "zero_product", "quadratic_formula", "substitute", "resubstitute"]],
  ['polynomial', ["add", "subtract", "multiply", "divide", "sqrt", "factorize", "expand", "zero_product", "quadratic_formula", "substitute", "resubstitute"]],
  ['polynomial-root', ["add", "subtract", "multiply", "divide", "root", "factorize", "expand", "zero_product", "quadratic_formula", "substitute", "resubstitute"]]
]);

function operation(name: string) {
  return operations.find(o => o.name === name)!;
}

const STRATEGY_POLYNOMIALy: Strategy = {
  name: "polynomial",
  title: "",
  help: "",
  arg: false,
  async apply(e, callback) {
    if (!e.right.isEqual(ce.box(0))) {
      let result = await callback((operation("subtract")), e, e.right);
      e = result[0];
    }
    let min = 10;
    e.left.getSubexpressions("Power").forEach(s => min = Math.min(min, s.ops![1].numericValue as number));
    let result = await callback((operation("factorize")), e, ce.box(["Power", "x", min]));
    e = result[0];
    result = await callback((operation("zero_product")), e);
    for (let equation of result) {
      let match = equation.left.match(ce.box(["Add", "x", "_a"]));
      if (match && match._a.isNotZero) {
        await callback(operation("subtract"), equation, match._a);
        continue;
      }
      match = equation.left.match(ce.box(["Add", ["Power", "x", "_n"], "_a"]));
      if (match) {
        if (match._a.isNotZero)
          equation = (await callback(operation("subtract"), equation, match._a))[0];
        equation = match._n.numericValue === 2 ? await (callback(operation("sqrt"), equation))[0] : (await callback(operation("root"), equation, match._n))[0];
        continue;
      }
      match = equation.left.match(ce.box(["Add", ["Multiply", ["Power", e.variable, "2"], "_a"], ["Multiply", e.variable, "_b"], "_c"]));
      if (match) {
        await callback(operation("quadratic_formula"), equation)
        continue;
      }
    }
  }
}
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

const strategies: Strategy[] = [ STRATEGY_POLYNOMIAL ];

function strategy(name: string) {
  return strategies.find(o => o.name === name)!;
}
