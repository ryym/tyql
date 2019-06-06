import { Aliased, Expr, InfixExpr, Op } from './types';

const todo = (): any => null;

export abstract class Ops<V, M> {
  as(_alias: string): Aliased<V, M> {
    return todo();
  }

  // 単純に val: V | Expr<V, M2> にしてしまうと、val: V だった場合に
  // M2 が any に推論されてしまう。それを防ぐために M2 = M としてる。
  // メソッド定義を overload する事でも防げるはずだけど、面倒なので。
  eq<M2 = M>(_val: V | Expr<V, M2>): InfixOp<boolean, M | M2> {
    return todo();
  }

  // 本来は特定の型でしか呼び出せないはずだけど、
  // そこまでやると RDB ごとにも違いそうだし無視する。
  // SQL のシンタックス的に問題なければひとまずOK。
  add<M2 = M>(_val: V | Expr<V, M2>): InfixOp<V, M | M2> {
    return todo();
  }

  // TODO: Return InOp
  in<M2 = M>(..._vals: V[] | Expr<V, M | M2>[]): Expr<boolean, M | M2> {
    return todo();
  }

  // Other operations...
}

export class InfixOp<V, M> extends Ops<V, M> implements InfixExpr<V, M> {
  left: Expr<V, M> = todo();
  op: Op = todo();
  right: Expr<V, M> = todo();
}
