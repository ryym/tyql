import { Aliased, Op, IExpr, Expr, iexprPhantomTypes } from './types';

const todo = (): any => null;

const isIExpr = (v: any): v is IExpr<any, any> => {
  return v.$type === 'EXPR';
};

export abstract class Ops<V, M> implements IExpr<V, M> {
  $type = 'EXPR' as const;

  abstract readonly _iexpr_types: [V, M];
  abstract toExpr(): Expr;

  as(_alias: string): Aliased<V, M> {
    return todo();
  }

  // 単純に val: V | IExpr<V, M2> にしてしまうと、val: V だった場合に
  // M2 が any に推論されてしまう。それを防ぐために M2 = M としてる。
  // メソッド定義を overload する事でも防げるはずだけど、面倒なので。
  eq<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    const expr = isIExpr(val) ? val : new Literal(val);
    return new InfixOp<boolean, M | M2>(this, Op.EQ, expr);
  }

  // 本来は特定の型でしか呼び出せないはずだけど、
  // そこまでやると RDB ごとにも違いそうだし無視する。
  // SQL のシンタックス的に問題なければひとまずOK。
  add<M2 = M>(val: V | IExpr<V, M2>): InfixOp<V, M | M2> {
    const expr = isIExpr(val) ? val : new Literal(val);
    return new InfixOp<V, M | M2>(this, Op.ADD, expr);
  }

  // TODO: Return InOp
  in<M2 = M>(..._vals: V[] | IExpr<V, M | M2>[]): IExpr<boolean, M | M2> {
    return todo();
  }

  // Other operations...
}

export class InfixOp<V, M> extends Ops<V, M> implements IExpr<V, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<V, M>();

  constructor(
    private readonly left: IExpr<any, M>,
    private readonly op: Op,
    private readonly right: IExpr<any, M>
  ) {
    super();
  }

  toExpr(): Expr {
    return {
      $exprType: 'INFIX',
      left: this.left,
      op: this.op,
      right: this.right,
    };
  }
}

export class Literal<V> extends Ops<V, never> implements IExpr<V, never> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<V, never>();

  constructor(private readonly value: V) {
    super();
  }

  toExpr(): Expr {
    return {
      $exprType: 'LIT',
      value: this.value,
    };
  }
}

// TODO: Should not allow to call numeric operations such as `a.eq(b).add(3)`.
export class LogicalOp<M> extends Ops<boolean, M> implements IExpr<boolean, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<boolean, M>();

  constructor(
    private readonly left: IExpr<boolean, any>,
    private readonly right: IExpr<boolean, any>
  ) {
    super();
  }

  toExpr(): Expr {
    return {
      $exprType: 'INFIX',
      left: this.left,
      right: this.right,
      op: Op.AND,
    };
  }
}

type ModelOf<E> = E extends IExpr<any, infer M> ? M : never;
type ModelsOf<Es extends any[]> = { [P in keyof Es]: ModelOf<Es[P]> }[number];

export const and = <Ps extends IExpr<boolean, any>[]>(...preds: Ps): LogicalOp<ModelsOf<Ps>> => {
  let pred = preds.reduce((left, right) => new LogicalOp(left, right));
  return pred as LogicalOp<ModelsOf<Ps>>;
};
