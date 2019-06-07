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

// TODO: All interfaces must have unique '$type';
// (and all properties should be readonly)

export interface ColumnExpr<V, M> {
  _value_phantom: V;
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;
  readonly modelClass: ModelClass<M>;
}

export interface LitExpr<V> {
  readonly value: V;
}

export interface PrefixExpr<V, M> {
  op: Op;
  expr: Expr<V, M>;
}

export interface InfixExpr<V, M> {
  left: Expr<V, M>;
  op: Op;
  right: Expr<V, M>;
}

export interface SufixExpr<V, M> {
  expr: Expr<V, M>;
  op: Op;
}

export interface InExpr<V, M> {
  left: Expr<V, M>;
  right: Expr<V, any>[];
  not: boolean;
}

export interface BetweenExpr<V, M> {
  value: Expr<V, M>;
  start: Expr<V, M>;
  end: Expr<V, M>;
  not: boolean;
}

export interface QueryExpr<V> {
  _value?: V; // ??
  _is_query_expr: true;
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
  alias: string;
  expr: Expr<V, M>;
}

// Special interface to bundle multiple columns as one expression.
export interface ColumnList<M> {
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
  on<U>(expr: Expr<U, any>): JoinOn<M2>;
}

export interface TableRelBuilder<V, M1, M2> {
  (): TableRel<V, M1, M2>;
}

export interface JoinOn<M> {
  table: TableLike;
  on: Expr<boolean, M>;
}

export type Selectable<M> = Expr<any, M> | Aliased<any, M> | ColumnList<M>;

export type Joinable<M1, M2> = TableRelBuilder<any, M1, M2> | JoinOn<M2>;

// Perhaps Unnecessary interface?
export interface QueryBuilder<R, Ms> {
  select<Sels extends Selectable<Ms>[]>(
    ...sels: Sels
  ): QueryBuilder<Select<ValuesOf<Sels>>, Ms>;

  innerJoin<M1 extends Ms, M2>(
    join: Joinable<M1, M2>
  ): QueryBuilder<RowType<R, M2>, Ms | M2>;

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

type ValueOf<S> = S extends ColumnList<infer M>
  ? M
  : S extends Expr<infer V, any>
  ? V
  : never;

export type RowType<A, B> = A extends Select<any>
  ? A
  : A extends [infer R1, infer R2]
  ? [R1, R2, B]
  : A extends [infer R1, infer R2, infer R3]
  ? [R1, R2, R3, B]
  : [A, B];

export type ResultRowType<R> = R extends Select<infer V> ? V : R;
