/**
 * APL AST nodes.
 * Two top-level categories: Value expressions and Function expressions.
 * Assignment can bind either depending on RHS shape.
 */

export type ValueNode =
  | { type: "num"; value: number }
  | { type: "str"; value: string }
  | { type: "strand"; items: ValueNode[] }
  | { type: "var"; name: string }
  | { type: "paren"; expr: ValueNode }
  | { type: "monadic"; fn: FuncNode; arg: ValueNode }
  | { type: "dyadic"; fn: FuncNode; left: ValueNode; right: ValueNode }
  | { type: "assign"; name: string; rhs: ValueNode | FuncNode }
  | { type: "index"; base: ValueNode; indices: (ValueNode | null)[] };

export type FuncNode =
  | { type: "prim"; glyph: string }
  | { type: "funcVar"; name: string }
  | { type: "dfn"; body: ValueNode[] }
  | { type: "derived1"; op: string; left: FuncNode }
  | { type: "derived2"; op: string; left: FuncNode; right: FuncNode }
  | {
      type: "derivedOp";
      op: string;
      left: FuncNode;
      rightFn?: FuncNode;
      rightVal?: ValueNode;
    }
  | { type: "parenFunc"; inner: FuncNode };

export type AnyNode = ValueNode | FuncNode;

export const isFuncNode = (n: AnyNode): n is FuncNode =>
  n.type === "prim" ||
  n.type === "funcVar" ||
  n.type === "dfn" ||
  n.type === "derived1" ||
  n.type === "derived2" ||
  n.type === "derivedOp" ||
  n.type === "parenFunc";

export interface Program {
  statements: AnyNode[];
}
