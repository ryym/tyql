import { Expr, Aliased, PredExpr } from './types';
import { ModelClass } from './model';

export abstract class Ops<V, M> implements Expr<V, M> {
  abstract modelClass(): ModelClass<M> | null;

  as(alias: string): Aliased<M> {
    return new AliasedExpr<M>(this, alias);
  }

  eq<M2>(val: Expr<V, M2>): PredExpr<M | M2> {
    return new OpInfix<boolean, M | M2>(this, Op.EQ, val);
  }

  // 本来は特定の型でしか呼び出せないはずだけど、
  // そこまでやると RDB ごとにも違いそうだし無視する。
  // SQL のシンタックス的に問題なければひとまずOK。
  add<M2>(val: Expr<V, M2>): Expr<V, M | M2> {
    return new OpInfix<V, M | M2>(this, Op.ADD, val);
  }
}

export enum Op {
  EQ = '=',
  ADD = '+',
}

export class OpInfix<V, M> extends Ops<V, M> {
  _phantom?: V;

  constructor(
    readonly left: Expr<any, any>,
    readonly op: Op,
    readonly right: Expr<any, any>
  ) {
    super();
  }

  modelClass() {
    return null;
  }
}

export class AliasedExpr<M> implements Aliased<M> {
  constructor(readonly expr: Expr<any, M>, private readonly _alias: string) {}

  alias(): string {
    return this._alias;
  }

  modelClass() {
    return this.expr.modelClass();
  }
}
