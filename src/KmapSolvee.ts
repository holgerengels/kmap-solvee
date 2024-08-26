import {css, html, LitElement, PropertyValues, TemplateResult} from 'lit';
import {property, query, state} from 'lit/decorators.js';
import {BoxedExpression} from "@cortex-js/compute-engine";
import {katexStyles} from "./katex-css.js";
import {renderBoxed, renderLatex} from "./util";
import {operations, sets} from "./operations";
import {ce, Equation, Hint, Operation} from "./model";
import {unsafeHTML} from "lit/directives/unsafe-html.js";
import {strategy} from "./strategies";

const LOGGING = false;

function json(exp: BoxedExpression, log?: boolean) {
  if (LOGGING || log) console.log(JSON.stringify(exp.json))
}

export class KmapSolvee extends LitElement {
  static styles = [css`
    :host {
      display: flex;
      flex-flow: column;
      gap: 8px;
//      --elevation-00: 0px 0px 0px 0px rgba(0, 0, 0, 0.2), 0px 0px 0px 0px rgba(0, 0, 0, 0.14), 0px 0px 0px 0px rgba(0, 0, 0, 0.12);
      --elevation-01: 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12);
//      --elevation-02: 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);
      --elevation-03: 0px 3px 3px -2px rgba(0, 0, 0, 0.2), 0px 3px 4px 0px rgba(0, 0, 0, 0.14), 0px 1px 8px 0px rgba(0, 0, 0, 0.12);
//      --elevation-04: 0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12);
//      --elevation-05: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 5px 8px 0px rgba(0, 0, 0, 0.14), 0px 1px 14px 0px rgba(0, 0, 0, 0.12);
//      --elevation-06: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);
//      --elevation-07: 0px 4px 5px -2px rgba(0, 0, 0, 0.2), 0px 7px 10px 1px rgba(0, 0, 0, 0.14), 0px 2px 16px 1px rgba(0, 0, 0, 0.12);
//      --elevation-08: 0px 5px 5px -3px rgba(0, 0, 0, 0.2), 0px 8px 10px 1px rgba(0, 0, 0, 0.14), 0px 3px 14px 2px rgba(0, 0, 0, 0.12);
//      --elevation-09: 0px 5px 6px -3px rgba(0, 0, 0, 0.2), 0px 9px 12px 1px rgba(0, 0, 0, 0.14), 0px 3px 16px 2px rgba(0, 0, 0, 0.12);
//      --elevation-10: 0px 6px 6px -3px rgba(0, 0, 0, 0.2), 0px 10px 14px 1px rgba(0, 0, 0, 0.14), 0px 4px 18px 3px rgba(0, 0, 0, 0.12);
//      --elevation-transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    span.katex-display {
      margin: 0;
    }
    div.block {
      display: flex;
      flex-flow: column;
      flex: 1 1;
      gap: 8px;
    }
    div.eqs {
      display: flex;
      flex-flow: row wrap;
      gap: 8px;
    }
    span.eq, span.err, span.op, div.args, span.sols, span.msg {
      padding: 8px 12px;
      border-radius: 8px;
      box-shadow: var(--elevation-01);
      align-content: center;
      transition: background-color ease-in-out .1s;
    }
    span.eq {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fafafa;
    }
    span.err {
      background-color: lightpink;
    }
    span.msg {
      background-color: #fffac1;
    }
    span.eq[aria-pressed=true] {
      background-color: #E1ECF4;
    }
    [faded] {
      opacity: 0;
    }
    :not([faded]) {
      transition: opacity 0.7s ease-in-out;
    }
    span.e, span.o {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    }
    div.ops {
      display: flex;
      flex-flow: row wrap;
      gap: 8px;
      margin: 4px 0px;
      position: relative;
    }
    div.args {
      position: absolute;
      display: grid;
      align-items: center;
      grid-template-columns: min-content 1fr min-content;
      width: 200px; height: 44px;
      left: calc(50% - 100px); top: calc(50% - 22px);
      font-weight: 500;
      background-color: white;
      box-shadow: var(--elevation-03);
    }
    span.op {
      font-weight: 500;
    }
    span.op:has(button:active) {
      background-color: #E1ECF4;
    }
    div.args input {
      text-transform: lowercase;
      border: 1px solid lightgray;
      border-radius: 4px;
      padding: 4px;
    }
    div.args input:focus {
      outline: none;
    }
    span.op button, div.args button {
      display: flex;
      border: none;
      background-color: transparent;
      font-family: unset;
      font-weight: 500;
      font-size: unset;
    }
    [hidden] {
      display: none!important;
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

  @property({reflect: true, type: Boolean})
  private valid: boolean = false;

  @state()
  private messages: string[] = [];

  @state()
  private argsVisible = false;
  private currentOperation?: Operation;

  @query('#i', true)
  private ie!: HTMLInputElement;

  private _animFrom?: DOMRect;
  private _animTo?: DOMRect;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.cancel)
  }

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
    if (this.argsVisible)
      this.ie.focus();
    if (_changedProperties.has("argsVisible")) {

    }
  }

  updateSlotted({target}) {
    let content = target.assignedNodes().map((n) => n.textContent).join('');
    console.log(content)
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

  _hover(e) {
    this._animFrom = e.target.getBoundingClientRect();
  }

  async apply(op: Operation, e: Equation, arg?: BoxedExpression) {
    console.assert(e)
    console.assert(e.variable)
    console.assert(e.left)
    console.assert(e.right)
    e.operation = op;
    e.arg = arg;
    let results: Equation[] = await op.func(e, arg);
    results.forEach(d => d.former = e);
    e.derived = results;
    if (!e.derived[0].error)
      this.selected = e.derived[0];
    this.requestUpdate();
    this.log(results);
    this.solutionsAndMessage(e);
    return results;
  }

  private solutionsAndMessage(e: Equation) {
    let solutions: BoxedExpression[] = [];
    let messages: string[] = [];
    this.gather(solutions, messages, this.equation);
    this.solutions = solutions.sort(NUMERIC_COMPARISION);
    this.messages = messages;
    this.valid = compareArrays(this.solutions, this.expectedSolutions);
  }

  private gather(solutions: BoxedExpression[], messages: string[], equation: Equation) {
    if (equation.left.isEqual(ce.box("x")) && equation.right.isNumber && !equation.derived?.length)
      solutions.push(equation.right)
    if (equation.message)
      messages.push(equation.message);
    for (const hint of this.hints) {
      if (equation.operation?.name === hint.operation && ce.box(["Equal", equation.left, equation.right]).match(ce.parse(hint.match))) {
        messages.push(hint.message);
      }
    }

    equation.derived?.forEach(d => this.gather(solutions, messages, d))
  }

  private perform(o?: Operation) {
    if (!this.selected)
      return;
    if (o && this.currentOperation) {
      this.cancel()
      return;
    }
    if (o?.arg) {
      this.argsVisible = true;
      this.currentOperation = o;

      let that = this;
      setTimeout(function () {
        that._animTo = that.ie.closest("div")!.getBoundingClientRect();

        if (!that._animFrom)
          return;

        var invertTop = that._animFrom.top - that._animTo.top;
        var invertLeft = that._animFrom.left - that._animTo.left;
        var invertScale = that._animFrom.width / that._animTo.width;

        var player = that.ie.closest("div")!.animate([{
          transformOrigin: 'top left',
          transform: `translate(${invertLeft}px, ${invertTop}px) scale(${invertScale}, ${invertScale})`,
          opacity: 0.2
        }, {
          transformOrigin: 'top left', transform: 'none', opacity: 1
        }], {
          duration: 300,
          easing: 'ease-in-out',
          fill: 'both'
        });
        player.addEventListener('finish', function () {
          that._animFrom = undefined;
          that._animTo = undefined;
        });
      })
    }
    else {
        if (!o) {
        o = this.currentOperation!;
        this.currentOperation = undefined;
      }
      this.argsVisible = false;
      let arg = this.ie.value && this.ie.value !== "" ? ce.parse(this.ie.value) : undefined;
      this.apply(o, this.selected, arg);
      this.ie.value = "";
    }
  }
  private cancel() {
    this.currentOperation = undefined;
    this.argsVisible = false;
  }

  private log(eqs: Equation[]) {
    if (LOGGING) eqs.forEach(e => console.log(JSON.stringify(e.left.json) + " = " + JSON.stringify(e.right.json)));
  }

  select(e: Equation) {
    e.derived = [];
    e.operation = undefined;
    e.arg = undefined;
    this.selected = e;
    this.solutionsAndMessage(e);
  }

  renderEquation(e: Equation): TemplateResult {
    return html`
      <div class="block">
        ${e.error ? html`<span class="err" faded>${e.error.match(/`.*`/) ? renderLatex(e.error.substring(1, e.error.length-1)) : e.error}</span>` : html`
        <span class="eq" faded role="button" aria-pressed="${this.selected === e}" @click="${() => this.select(e)}">
          <span class="e">${renderBoxed(ce.box(["Equal", e.left, e.right]))}</span>
          ${e.operation ? html`<span class="o">${e.operation.render(e.arg)}</span>` : undefined}
        </span>
        ${e.derived && e.derived.length ? html`
          <div class="eqs">
          ${e.derived.map(d => html`${this.renderEquation(d)}`)}
        </div>` : undefined}
        `}
      </div>
    `;
  }

  renderOperation(o: Operation): TemplateResult {
    return html`
      <span class="op" title="${o.help}" @mouseenter="${this._hover}">
        <button @click="${(e) => { e.stopPropagation(); this.perform(o)}}">${(this.renderMixed(o.title))}</button>
      </span>
    `;
  }

  renderMixed(code: string): TemplateResult[] {
    let segments = code.split('`');
    if (segments.length % 2 === 1)
      segments.push('');

    let buffer: TemplateResult[] = [];
    for (let i=0; i < segments.length; i+=2) {
      const text = segments[i];
      let tex = segments[i + 1];
      buffer.push(html`${unsafeHTML(text)}`)
      buffer.push(renderLatex(tex));
    }
    return buffer;
  }

  renderArgs(): TemplateResult {
    return html`
      <div class="args" ?hidden="${!this.argsVisible}" @click="${(e) => e.stopPropagation()}" faded>
        ${this.currentOperation ? html`<span style="margin-right: 8px; display: flex">${(this.renderMixed(this.currentOperation.title))}</span>` : ''}
        <input id="i" type="text" size="3" autocomplete="off" autocapitalize="off" onblur="this.value=this.value.toLowerCase()" @keydown="${(e) => {
          switch (e.code) {
            case "Enter": case "NumpadEnter": this.perform(); return
            case "Escape": this.cancel(); return
          }}}">
        <button @click="${(e) => { e.stopPropagation(); this.perform()}}">⏎</button>
      </div>
    `;
  }

  render() {
    return html`
      <div hidden>
        <slot @slotchange=${this.updateSlotted}></slot>
      </div>
      <div class="ops">
        ${this.operations.map(o => html`${this.renderOperation(o)}`)}
        ${this.renderArgs()}
      </div>
      <div class="eqs">
        ${this.equation ? html`${this.renderEquation(this.equation)}` : ``}
      </div>
      <div class="eqs">
        <span class="sols">${renderBoxed(this.solutions.length ? ce.box(["Equal","L_doublestruck", ["Set", ...this.solutions]]) : ce.box(["Equal","L_doublestruck", ["Set", ce.parse("\\text{...}")]]))}</span>
      </div>
      <div class="eqs">
        ${Array.from(this.messages).map(m => html`<span class="msg" faded>${this.renderMixed(m)}</span>`)}
      </div>
    `;
  }

  public init() {
    this.equation = { variable: "x", left: this.equation!.left, right: this.equation!.right }
    this.selected = this.equation;
    this.solutions = [];
    this.messages = [];
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

const NUMERIC_COMPARISION = (a, b) => a.value - b.value;

