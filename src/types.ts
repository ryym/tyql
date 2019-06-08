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
  readonly $exprType: 'COLUMN';
  readonly _value_phantom?: V;
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;
  readonly modelClass: ModelClass<M>;
}

export interface LitExpr<V> {
  readonly $exprType: 'LIT';
  readonly value: V;
}

export interface PrefixExpr<V, M> {
  readonly $exprType: 'PREFIX';
  readonly _value_phantom?: V;
  op: Op;
  expr: IExpr<any, M>;
}

export interface InfixExpr<V, M> {
  readonly $exprType: 'INFIX';
  readonly _value_phantom?: V;
  left: IExpr<any, M>;
  op: Op;
  right: IExpr<any, M>;
}

export interface SufixExpr<V, M> {
  readonly $exprType: 'SUFIX';
  readonly _value_phantom?: V;
  expr: IExpr<any, M>;
  op: Op;
}

export interface InExpr<V, M> {
  readonly $exprType: 'IN';
  left: IExpr<V, M>;
  right: IExpr<V, any>[];
  not: boolean;
}

export interface BetweenExpr<V, M> {
  readonly $exprType: 'BETWEEN';
  value: IExpr<V, M>;
  start: IExpr<V, M>;
  end: IExpr<V, M>;
  not: boolean;
}

export interface QueryExpr<V> {
  readonly $exprType: 'QUERY';
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

export interface IExpr<V, M> {
  readonly $type: 'EXPR';
  toExpr(): Expr<V, M>;
}

export interface Aliased<V, M> {
  readonly $type: 'ALIASED';
  alias: string;
  expr: Expr<V, M>;
}

export interface IColumn<V, M> extends IExpr<V, M> {
  modelClass: ModelClass<M>;
  toExpr(): ColumnExpr<V, M>;
}

// Special interface to bundle multiple columns as one expression.
export interface ColumnList<M> {
  readonly $type: 'COLUMN_LIST';
  columns(): IColumn<any, M>[];
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
  leftCol: IColumn<V, M1>;
  rightCol: IColumn<V, M2>;
  on<U>(expr: IExpr<U, any>): TableJoin<M2>;
}

export interface TableRelBuilder<V, M1, M2> {
  $joinType: 'TABLE_REL_BUILDER';
  (): TableRel<V, M1, M2>;
}

export interface TableJoin<M> extends ColumnList<M> {
  $joinType: 'TABLE_JOIN';
  on: Expr<boolean, M>;
}

export type Selectable<M> = IExpr<any, M> | Aliased<any, M> | ColumnList<M>;

export type Joinable<M1, M2> = TableRelBuilder<any, M1, M2> | TableJoin<M2>;

// Perhaps Unnecessary interface?
export interface QueryBuilder<R, Ms> {
  select<Sels extends Selectable<Ms>[]>(...sels: Sels): QueryBuilder<Select<ValuesOf<Sels>>, Ms>;

  innerJoin<M1 extends Ms, M2>(join: Joinable<M1, M2>): QueryBuilder<AddColumn<R, M2>, Ms | M2>;

  where(...preds: IExpr<boolean, Ms>[]): QueryBuilder<R, Ms>;

  groupBy(...exprs: IExpr<any, Ms>[]): QueryBuilder<R, Ms>;

  having(...preds: IExpr<boolean, Ms>[]): QueryBuilder<R, Ms>;

  orderBy(...ords: Ordering<Ms>[]): QueryBuilder<R, Ms>;

  limit(n: number): QueryBuilder<R, Ms>;

  offset(n: number): QueryBuilder<R, Ms>;

  as(alias: string): AliasedQuery;

  load(conn: Connection): Promise<ResultRowType<R>[]>;
}

export interface Query<Models> {
  from: string;
  select: Selectable<any>[] | null;
  defaultSelect: ColumnList<Models>[];
  innerJoins: Joinable<any, any>[];
}

export interface Connection {
  runQuery<R>(q: Query<any>): Promise<R[]>;
}

export type Select<V> = { selects: V };

export type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };

type ValueOf<S> = S extends ColumnList<infer M> ? M : S extends IExpr<infer V, any> ? V : never;

// TODO: Should return never if R tuple is too large.
// This definition returns [tuple, M] in that case,
// but the actual return value is different.
export type AddColumn<R, M> = R extends Select<any>
  ? R
  : R extends [infer R1, infer R2]
  ? [R1, R2, M]
  : R extends [infer R1, infer R2, infer R3]
  ? [R1, R2, R3, M]
  : R extends [infer R1, infer R2, infer R3, infer R4]
  ? [R1, R2, R3, R4, M]
  : R extends [infer R1, infer R2, infer R3, infer R4, infer R5]
  ? [R1, R2, R3, R4, R5, M]
  : R extends [infer R1, infer R2, infer R3, infer R4, infer R5, infer R6]
  ? [R1, R2, R3, R4, R5, R6, M]
  : [R, M];

// - If you don't select values explicitly by `select`, returns default values ([Model, Model, ..][]).
// - Otherwise, returns the selected values ([value, value, ...][]).
// - But if you don't use JOIN or select only one value, returns an array of single value
//   (Model[] or value[] instead of [Model][] or [value][]).
export type ResultRowType<R> = R extends Select<infer V> ? (V extends [infer U] ? U : V) : R;
