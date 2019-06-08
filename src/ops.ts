import { Aliased, InfixExpr, Op, IExpr, Expr, LitExpr } from './types';

const todo = (): any => null;

const isIExpr = (v: any): v is IExpr<any, any> => {
  return v.$type === 'EXPR';
};

export abstract class Ops<V, M> implements IExpr<V, M> {
  $type = 'EXPR' as const;

  abstract toExpr(): Expr<V, M>;

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
  add<M2 = M>(_val: V | IExpr<V, M2>): InfixOp<V, M | M2> {
    return todo();
  }

  // TODO: Return InOp
  in<M2 = M>(..._vals: V[] | IExpr<V, M | M2>[]): IExpr<boolean, M | M2> {
    return todo();
  }

  // Other operations...
}

export class InfixOp<V, M> extends Ops<V, M> implements IExpr<V, M> {
  readonly $type = 'EXPR' as const;

  constructor(
    private readonly left: IExpr<any, M>,
    private readonly op: Op,
    private readonly right: IExpr<any, M>
  ) {
    super();
  }

  toExpr(): InfixExpr<V, M> {
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

  constructor(private readonly value: V) {
    super();
  }

  toExpr(): LitExpr<V> {
    return {
      $exprType: 'LIT',
      value: this.value,
    };
  }
}
