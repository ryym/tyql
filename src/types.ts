// Note that some properties' name of the interfaces start with `$`.
// This is because these interfaces may be used with dynamically generated types
// whose property names are defined by user (e.g. column names).
// We avoid possible name collisions by prefixing our property names by `$`.

// TODO: Avoid circlar import.
import { ColumnMap } from './column';

export interface ModelConfig<M> {
  readonly table: string;
  template(): M;
  columnNameRule?: (name: string) => string;
}

export interface ModelClass<M> {
  tyql: ModelConfig<M>;
}

export interface IExpr<V, M> {
  readonly $type: 'EXPR';

  // This property exists just to hold the types V and M.
  // This allows us to construct queries with type-safe manner.
  readonly _iexpr_types: [V, M];

  toExpr(): Expr;
}

export const iexprPhantomTypes = <V, M>(): [V, M] => null as any;

export enum Op {
  EQ = '=',
  NOT_EQ = '<>',
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  ADD = '+',
  SUBTRACT = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  IN = 'IN',
  BETWEEN = 'BETWEEN',
  AND = 'AND',
  OR = 'OR',
  LIKE = 'LIKE',
  NOT_LIKE = 'NOT LIKE',
}

export enum OpPrefix {
  NOT = 'not',
}

export enum OpSufix {
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
}

export interface ColumnExpr {
  readonly $exprType: 'COLUMN';
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;
}

export interface LitExpr {
  readonly $exprType: 'LIT';
  readonly value: any;
}

export interface PrefixExpr {
  readonly $exprType: 'PREFIX';
  op: OpPrefix;
  expr: IExpr<any, any>;
}

export interface InfixExpr {
  readonly $exprType: 'INFIX';
  left: IExpr<any, any>;
  op: Op;
  right: IExpr<any, any>;
}

export interface SufixExpr {
  readonly $exprType: 'SUFIX';
  expr: IExpr<any, any>;
  op: OpSufix;
}

export interface InExpr {
  readonly $exprType: 'IN';
  value: IExpr<any, any>;
  candidates: IExpr<any, any>[];
  positive: boolean;
}

export interface BetweenExpr {
  readonly $exprType: 'BETWEEN';
  value: IExpr<any, any>;
  start: IExpr<any, any>;
  end: IExpr<any, any>;
  positive: boolean;
}

export interface QueryExpr {
  readonly $exprType: 'QUERY';
}

export interface ParensExpr {
  readonly $exprType: 'PARENS';
  expr: IExpr<any, any>;
}

// These types are internal representation and users don't use this directly
// so they do not have types it represents.
// TODO: Add QueryExpr.
export type Expr =
  | ColumnExpr
  | LitExpr
  | PrefixExpr
  | InfixExpr
  | SufixExpr
  | InExpr
  | BetweenExpr
  | ParensExpr;

export interface Aliased<V, M> {
  readonly $type: 'ALIASED';
  readonly _aliased_phantom: [V, M];
  alias: string;
  expr: Expr;
}

export interface IColumn<V, M> extends IExpr<V, M> {
  modelClass: ModelClass<M>;
  toExpr(): ColumnExpr;
}

// Special interface to bundle multiple columns as one expression.
export interface ColumnList<M> {
  readonly $type: 'COLUMN_LIST';
  columns(): IColumn<any, M>[];
  tableName(): string;
  tableAlias(): string | undefined;
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface Orderer<M> {
  _orderer_types: [M];
  expr: IExpr<any, M>;
  order: Order;
}

export interface AliasedQuery {
  alias: string;
  query: QueryExpr;
}

export interface SchemaTable<M> {
  model: ModelClass<M>;
}

export type TableLike = AliasedQuery | SchemaTable<any>;

export interface Joinable<R, M1, M2, Ms> {
  $type: 'JOINABLE';
  _joinable_types: [R, M1, Ms];
  rightColumns(): ColumnList<M2>;
  leftTable(): ColumnMap<M1>;
  rightTable(): ColumnMap<M2>;
  joinCondition: JoinConditioner<M1, M2>;
  joins(): Joinable<any, M2, any, any>[];
  innerJoin<R2, Ms2>(joins: Joiner<R2, M2, any, Ms2>): JoinChain<Append<R, R2>, M1, M2, Ms | Ms2>;
}

export type JoinConditioner<M1, M2> = (
  left: ColumnMap<M1>,
  right: ColumnMap<M2>
) => IExpr<any, any>;

export interface JoinChain<R, M1, M2, Ms> extends Joiner<R, M1, M2, Ms> {
  innerJoin<R2, Ms2>(joins: Joiner<R2, M2, any, Ms2>): JoinChain<Append<R, R2>, M1, M2, Ms | Ms2>;
}

export interface Joiner<R, M1, M2, Ms> {
  (): Joinable<R, M1, M2, Ms>;
}

export interface TableRel<V, M1, M2> {
  (): TableRelDefinition<V, M1, M2>;
}

export interface TableRelDefinition<V, M1, M2> extends Joinable<M2, M1, M2, M2> {
  leftCol: IColumn<V, M1>;
  rightCol: IColumn<V, M2>;
}

export type Selectable<M> =
  | IExpr<any, M>
  | Aliased<any, M>
  | ColumnList<M>
  | Joinable<any, any, any, M>;
export type Groupable<M> = IExpr<any, M> | ColumnList<M>;

export interface Query<Models> {
  from: string;
  fromAlias?: string;
  select: Selectable<any>[] | null;
  defaultSelect: Selectable<any>[];
  innerJoins: Joinable<any, any, any, any>[];
  where: IExpr<boolean, Models>[];
  groupBy: Groupable<Models>[];
  having: IExpr<boolean, Models>[];
  orderBy: Orderer<Models>[];
  limit: number | null;
  offset: number | null;
}

export interface Connection {
  runQuery<R>(q: Query<any>): Promise<R[]>;
  toSQL(q: Query<any>): [string, any[]];
}

export type Select<V> = { selects: V };

export type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };

type ValueOf<S> = S extends ColumnList<infer M>
  ? M
  : S extends Joinable<any, any, infer M, any>
  ? M
  : S extends IExpr<infer V, any>
  ? V
  : never;

// TODO: Should return never if R tuple is too large.
// This definition returns [tuple, M] in that case,
// but the actual return value is different.
export type AddColumn<R, M> = R extends Select<any> ? R : Append<R, M>;

export type Append<R, NR> = R extends any[]
  ? R extends [infer R1]
    ? [R1, NR]
    : R extends [infer R1, infer R2]
    ? [R1, R2, NR]
    : R extends [infer R1, infer R2, infer R3]
    ? [R1, R2, R3, NR]
    : R extends [infer R1, infer R2, infer R3, infer R4]
    ? [R1, R2, R3, R4, NR]
    : R extends [infer R1, infer R2, infer R3, infer R4, infer R5]
    ? [R1, R2, R3, R4, R5, NR]
    : R extends [infer R1, infer R2, infer R3, infer R4, infer R5, infer R6]
    ? [R1, R2, R3, R4, R5, R6, NR]
    : unknown
  : [R, NR];

// - If you don't select values explicitly by `select`, returns default values ([Model, Model, ..][]).
// - Otherwise, returns the selected values ([value, value, ...][]).
// - But if you don't use JOIN or select only one value, returns an array of single value
//   (Model[] or value[] instead of [Model][] or [value][]).
export type ResultRowType<R> = R extends Select<infer V> ? (V extends [infer U] ? U : V) : R;
