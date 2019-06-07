export interface ModelConfig<T> {
  readonly table: string;
  template(): T;
}

export interface ModelClass<T> {
  tyql: ModelConfig<T>;
}

export enum Op {
  EQ = '=',
}

export enum OpPrefix {
  NOT = 'not',
}

export enum OpSufix {
  IS_NULL = 'IS NULL',
}

export interface ColumnExpr<V, M> {
  readonly $type: 'COLUMN_EXPR';

  // This phantom field is neccesary to hold V. Without this, you can:
  // `let a: ColumnExpr<string, any> = <ColumnExpr<number, any>>b;`.
  readonly _value_phantom: V;
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;
  readonly modelClass: ModelClass<M>;
}

export interface LitExpr<V> {
  readonly $type: 'LIT_EXPR';
  readonly value: V;
}

export interface PrefixExpr<V, M> {
  readonly $type: 'PREFIX_EXPR';
  op: Op;
  expr: Expr<V, M>;
}

export interface InfixExpr<V, M> {
  readonly $type: 'INFIX_EXPR';
  left: Expr<V, M>;
  op: Op;
  right: Expr<V, M>;
}

export interface SufixExpr<V, M> {
  readonly $type: 'SUFIX_EXPR';
  expr: Expr<V, M>;
  op: Op;
}

export interface InExpr<V, M> {
  readonly $type: 'IN_EXPR';
  left: Expr<V, M>;
  right: Expr<V, any>[];
  not: boolean;
}

export interface BetweenExpr<V, M> {
  readonly $type: 'BETWEEN_EXPR';
  value: Expr<V, M>;
  start: Expr<V, M>;
  end: Expr<V, M>;
  not: boolean;
}

export interface QueryExpr<V> {
  readonly $type: 'QUERY_EXPR';
  _value?: V; // ??
}

export type Expr<V, M> =
  | ColumnExpr<V, M>
  | LitExpr<V>
  | PrefixExpr<V, M>
  | InfixExpr<V, M>
  | SufixExpr<V, M>
  | InExpr<V, M>
  | BetweenExpr<V, M>
  | QueryExpr<V>;

export interface Aliased<V, M> {
  readonly $type: 'ALIASED';
  alias: string;
  expr: Expr<V, M>;
}

// Special interface to bundle multiple columns as one expression.
export interface ColumnList<M> {
  readonly $type: 'COLUMN_LIST';
  columns(): ColumnExpr<any, M>[];
}

export enum Order {
  ASC,
  DESC,
}

export interface Ordering<M> {
  order: Order;
  expr: Expr<any, M>;
}

export interface AliasedQuery {
  alias: string;
  query: QueryExpr<any>;
}

export interface SchemaTable<M> {
  model: ModelClass<M>;
}

export type TableLike = AliasedQuery | SchemaTable<any>;

export interface TableRel<V, M1, M2> extends ColumnList<M2> {
  leftCol: ColumnExpr<V, M1>;
  rightCol: ColumnExpr<V, M2>;
  on<U>(expr: Expr<U, any>): TableJoin<M2>;
}

export interface TableRelBuilder<V, M1, M2> {
  $joinType: 'TABLE_REL_BUILDER';
  (): TableRel<V, M1, M2>;
}

export interface TableJoin<M> extends ColumnList<M> {
  $joinType: 'TABLE_JOIN';
  on: Expr<boolean, M>;
}

export type Selectable<M> = Expr<any, M> | Aliased<any, M> | ColumnList<M>;

export type Joinable<M1, M2> = TableRelBuilder<any, M1, M2> | TableJoin<M2>;

// Perhaps Unnecessary interface?
export interface QueryBuilder<R, Ms> {
  select<Sels extends Selectable<Ms>[]>(...sels: Sels): QueryBuilder<Select<ValuesOf<Sels>>, Ms>;

  innerJoin<M1 extends Ms, M2>(join: Joinable<M1, M2>): QueryBuilder<RowType<R, M2>, Ms | M2>;

  where(...preds: Expr<boolean, Ms>[]): QueryBuilder<R, Ms>;

  groupBy(...exprs: Expr<any, Ms>[]): QueryBuilder<R, Ms>;

  having(...preds: Expr<boolean, Ms>[]): QueryBuilder<R, Ms>;

  orderBy(...ords: Ordering<Ms>[]): QueryBuilder<R, Ms>;

  limit(n: number): QueryBuilder<R, Ms>;

  offset(n: number): QueryBuilder<R, Ms>;

  as(alias: string): AliasedQuery;

  load(conn: Connection): Promise<ResultRowType<R>[]>;
}

// export interface QueryRunner<R> {
//   load(conn: Connection): Promise<R[]>;
// }

export interface Connection {
  connection(): any; // ??
}

export type Select<V> = { selects: V };

export type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };

type ValueOf<S> = S extends ColumnList<infer M> ? M : S extends Expr<infer V, any> ? V : never;

export type RowType<A, B> = A extends Select<any>
  ? A
  : A extends [infer R1, infer R2]
  ? [R1, R2, B]
  : A extends [infer R1, infer R2, infer R3]
  ? [R1, R2, R3, B]
  : [A, B];

export type ResultRowType<R> = R extends Select<infer V> ? V : R;
