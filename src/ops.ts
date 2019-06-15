import {
  Aliased,
  Op,
  IExpr,
  Expr,
  iexprPhantomTypes,
  BetweenExpr,
  Orderer,
  Order,
  OpSufix,
} from './types';

const todo = (): any => null;

const isIExpr = (v: any): v is IExpr<any, any> => {
  return v.$type === 'EXPR';
};

const wrapLit = <V, M>(v: V | IExpr<V, M>): IExpr<V, M> => {
  return isIExpr(v) ? v : new Literal(v);
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
    return this.infix<boolean, M2>(Op.EQ, val);
  }

  notEq<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.NOT_EQ, val);
  }

  gt<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.GT, val);
  }

  gte<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.GTE, val);
  }

  lt<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.LT, val);
  }

  lte<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.LTE, val);
  }

  // 本来は特定の型でしか呼び出せないはずだけど、
  // そこまでやると RDB ごとにも違いそうだし無視する。
  // SQL のシンタックス的に問題なければひとまずOK。
  add<M2 = M>(val: V | IExpr<V, M2>): InfixOp<V, M | M2> {
    return this.infix<V, M2>(Op.ADD, val);
  }

  sbt<M2 = M>(val: V | IExpr<V, M2>): InfixOp<V, M | M2> {
    return this.infix<V, M2>(Op.SUBTRACT, val);
  }

  mlt<M2 = M>(val: V | IExpr<V, M2>): InfixOp<V, M | M2> {
    return this.infix<V, M2>(Op.MULTIPLY, val);
  }

  dvd<M2 = M>(val: V | IExpr<V, M2>): InfixOp<V, M | M2> {
    return this.infix<V, M2>(Op.DIVIDE, val);
  }

  like<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.LIKE, val);
  }

  notLike<M2 = M>(val: V | IExpr<V, M2>): InfixOp<boolean, M | M2> {
    return this.infix<boolean, M2>(Op.NOT_LIKE, val);
  }

  private infix<U, M2 = M>(op: Op, val: V | IExpr<any, any>): InfixOp<U, M | M2> {
    return new InfixOp<U, M | M2>(this, op, wrapLit(val));
  }

  in<M2 = M>(...vals: V[] | IExpr<V, M | M2>[]): InOp<M | M2> {
    if (vals.length === 0) {
      throw new Error('[Tyql]: Cannot pass empty arguments to IN');
    }
    const candidates = isIExpr(vals[0])
      ? (vals as IExpr<V, M | M2>[])
      : (vals as V[]).map((v: any) => new Literal(v));
    return new InOp<M | M2>(this, candidates);
  }

  notIn<M2 = M>(...vals: V[] | IExpr<V, M | M2>[]): InOp<M | M2> {
    return this.in(...vals).positive(false);
  }

  between<M2 = M, M3 = M>(start: V | IExpr<V, M2>, end: V | IExpr<V, M3>): BetweenOp<M | M2 | M3> {
    return new BetweenOp<M | M2 | M3>(this, wrapLit(start), wrapLit(end));
  }

  notBetween<M2 = M, M3 = M>(
    start: V | IExpr<V, M2>,
    end: V | IExpr<V, M3>
  ): BetweenOp<M | M2 | M3> {
    return this.between(start, end).positive(false);
  }

  isNull(): SufixOp<boolean, M> {
    return new SufixOp(this, OpSufix.IS_NULL);
  }

  isNotNull(): SufixOp<boolean, M> {
    return new SufixOp(this, OpSufix.IS_NOT_NULL);
  }

  asc(): Orderer<M> {
    return new ExprOrderer(this, Order.ASC);
  }

  desc(): Orderer<M> {
    return new ExprOrderer(this, Order.DESC);
  }
}

export class ExprOrderer<M> implements Orderer<M> {
  _orderer_types: [M] = null as any;
  constructor(public readonly expr: IExpr<any, M>, public readonly order: Order) {}
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

export class SufixOp<V, M> extends Ops<V, M> implements IExpr<V, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<V, M>();

  constructor(private readonly expr: IExpr<any, M>, private readonly op: OpSufix) {
    super();
  }

  toExpr(): Expr {
    return {
      $exprType: 'SUFIX',
      expr: this.expr,
      op: this.op,
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

export class InOp<M> extends Ops<boolean, M> implements IExpr<boolean, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<boolean, M>();
  private _positive: boolean = true;

  constructor(private readonly value: IExpr<any, M>, private readonly candidates: IExpr<any, M>[]) {
    super();
  }

  positive(yes: boolean): InOp<M> {
    this._positive = yes;
    return this;
  }

  toExpr(): Expr {
    return {
      $exprType: 'IN',
      value: this.value,
      candidates: this.candidates,
      positive: this._positive,
    };
  }
}

export class BetweenOp<M> extends Ops<boolean, M> implements IExpr<boolean, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<boolean, M>();
  private _positive: boolean = true;

  constructor(
    private readonly value: IExpr<any, M>,
    private readonly start: IExpr<any, M>,
    private readonly end: IExpr<any, M>
  ) {
    super();
  }

  positive(yes: boolean): BetweenOp<M> {
    this._positive = yes;
    return this;
  }

  toExpr(): BetweenExpr {
    return {
      $exprType: 'BETWEEN',
      value: this.value,
      start: this.start,
      end: this.end,
      positive: this._positive,
    };
  }
}

type ModelOf<E> = E extends IExpr<any, infer M> ? M : never;
type ModelsOf<Es extends any[]> = { [P in keyof Es]: ModelOf<Es[P]> }[number];

export class InParens<V, M> extends Ops<V, M> implements IExpr<V, M> {
  _iexpr_types = iexprPhantomTypes<V, M>();

  constructor(private readonly expr: IExpr<V, M>) {
    super();
  }

  toExpr(): Expr {
    return { $exprType: 'PARENS', expr: this.expr };
  }
}

export const parens = <V, M>(expr: IExpr<V, M>): InParens<V, M> => {
  return new InParens(expr);
};

export const and = <Ps extends IExpr<boolean, any>[]>(
  ...preds: Ps
): InfixOp<boolean, ModelsOf<Ps>> => {
  let pred = preds.reduce((left, right) => new InfixOp(left, Op.AND, right));
  return pred as InfixOp<boolean, ModelsOf<Ps>>;
};

export const or = <Ps extends IExpr<boolean, any>[]>(
  ...preds: Ps
): InParens<boolean, ModelsOf<Ps>> => {
  let pred = preds.reduce((left, right) => new InfixOp(left, Op.OR, right));
  return new InParens(pred);
};
