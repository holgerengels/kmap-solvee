import {html} from "lit";
import katex from "katex";
import {BoxedExpression} from "@cortex-js/compute-engine";
import {unsafeHTML} from "lit/directives/unsafe-html.js";

export const latexOptions = {
  decimalMarker: "{,}",
  groupSeparator: "",
  imaginaryUnit: "\\operatorname{i}",
  invisiblePlus: "+"
}

export function latex(expression: BoxedExpression) {
  return renderLatex(expression.toLatex(latexOptions))
}

export function renderLatex(tex: string) {
  tex = tex.replace(/\\exponentialE/g, "e");
  tex = tex.replace(/\\exp\(([^()]*)\)/g, "e^{$1}");
  tex = tex.replace(/\\\//g, "/");
  return html`${unsafeHTML(katex.renderToString(tex, {
    output: "html",
    strict: false,
    throwOnError: false,
    trust: true,
    displayMode: true
  }))}`;
}

export const assert = (assertion: boolean, message?: string, params?: any[]) => {
  console.assert(assertion, message, params)
  if (!assertion)
    throw new Error();
};
