import {BoxedExpression, ComputeEngine} from "@cortex-js/compute-engine";
import {TemplateResult} from "lit";
import AsciiMathParser from 'asciimath2tex';

export const ce = new ComputeEngine();
export const boxed_0 = ce.box(0);

export const parser = new AsciiMathParser();

export interface Equation {
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

export interface Operation {
  name: string,
  title: string,
  help: string,
  func: (e: Equation, arg?: BoxedExpression) => Promise<Equation[]>;
  arg: boolean;

  render(arg?: BoxedExpression): TemplateResult;
}

export interface Hint {
  match: string,
  operation: string,
  message: string
}

export interface Strategy {
  name: string,
  title: string,
  help: string,
  arg: boolean;

  apply(e: Equation, callback: (op: Operation, e: Equation, arg?: BoxedExpression) => Promise<Equation[]>): void;
}
