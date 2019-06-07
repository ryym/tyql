import { ModelClass } from './model';

export const todo = (msg: string = 'no description'): any => {
  throw new Error(`NOT IMPLEMENTED YET (${msg})`);
};

// 空の interface をどうする？
// Symbol とか使ってマーカーインターフェイス的に頑張るか
// Union type を使えるか

// 苦労しそうなのは主に Expr の構築。 ORDER BY とかのクエリの構築はほとんど
// knex のメソッド呼び出しをラップするぐらいな感じのはず。
// knex はあらゆる式の記述をあえて細かくはサポートしない方針っぽいので、
// そこをどう knex にマッピングするか。例えば`a = b`のような比較でも、
// WHERE のトップレベルなら`where('a', 'b')`でいいけど、`(a = b) = (c = d)`のように
// ネストするともう`knex.raw('a = b')`とするしかない。変な例だけど構文的には何も問題ないし、
// 他の演算子の組み合わせならネストは全然ありうる。

export interface MayHaveModel<M> {
  modelClass(): ModelClass<M> | null;
}

export interface Aliased<M> extends MayHaveModel<M> {
  alias(): string;
}

export interface Expr<V, M> extends MayHaveModel<M> {
  // // Without this, the below is valid:
  // // `let a: Expr<boolean> = b as Expr<string>;`
  _expr_phantom?: V;

  as(alias: string): Aliased<M>;
}

export interface PredExpr<M> extends Expr<boolean, M> {}

export interface TableLike {
  _tableLike: true;
}

export interface QueryTable extends MayHaveModel<any>, TableLike {}

export interface SchemaTable extends TableLike {
  $all(): any;
}

export interface Orderer {
  ordering(): Ordering;
}

export type Ordering = {
  readonly expr: Expr<any, any>;
  readonly order: Order;
};

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}