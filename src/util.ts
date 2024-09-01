import {html} from "lit";
import katex from "katex";
import {BoxedExpression} from "@cortex-js/compute-engine";
import {unsafeHTML} from "lit/directives/unsafe-html.js";
import {ce, parser} from "./model";

export const latexOptions = {
  decimalMarker: "{,}",
  groupSeparator: "",
  imaginaryUnit: "\\operatorname{i}",
  invisiblePlus: "+"
}

export function renderBoxed(expression: BoxedExpression) {
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

export function boxedLatex(expression: BoxedExpression) {
  return latex(expression.toLatex(latexOptions))
}

export function latex(tex: string) {
  tex = tex.replace(/\\exponentialE/g, "e");
  tex = tex.replace(/\\exp\(([^()]*)\)/g, "e^{$1}");
  tex = tex.replace(/\\\//g, "/");
  return tex;
}

export const assert = (assertion: boolean, message?: string, params?: any[]) => {
  console.assert(assertion, message, params)
  if (!assertion)
    throw new Error();
};

export function asciiparse(asciimath: string) {
  return ce.parse(parser.parse(asciimath));
}
