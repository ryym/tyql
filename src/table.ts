import {
  ColumnExpr,
  QueryBuilder,
  Ordering,
  TableRel,
  ColumnList,
  ModelClass,
  Connection,
  TableRelBuilder,
} from './types';
import { Ops } from './ops';

type MethodNames<T> = { [P in keyof T]: T[P] extends Function ? P : never }[keyof T];

export type FieldNames<T> = Exclude<keyof T, MethodNames<T>>;

export type Fields<T> = { [P in FieldNames<T>]: T[P] };

export type FieldNamesOfType<T, V> = {
  [P in FieldNames<T>]: T[P] extends V | null | undefined ? P : never
}[FieldNames<T>];

export type ColumnSet<M> = { readonly [K in keyof Fields<M>]: Column<M[K], M> };

export type RelationBuilder<V, M1, M2> = ColumnSet<M2> & TableRelBuilder<V, M1, M2>;

type AnyRelationBuilders<M> = {
  [key: string]: RelationBuilder<any, M, any>;
};

export type Table<M, Rels extends AnyRelationBuilders<M>> = {
  (): TableActions<M>;
} & Rels &
  ColumnSet<M>;

export interface RelationLoader<M, RS extends TableRel<any, M, any>[]> {
  loadMaps(records: M[], conn: Connection): Promise<RelsMap<M, RS>>;
}

type RelsMap<T, RS> = {
  [K in keyof RS]: RS[K] extends TableRel<T, infer U, infer V> ? Map<V, U[]> : never
};

export interface TableActions<M> extends QueryBuilder<M, M>, ColumnList<M> {
  columns(): ColumnExpr<any, M>[];
  query(): QueryBuilder<M, M>;
  rels<RS extends TableRel<any, M, any>[]>(...rels: RS): RelationLoader<M, RS>;
}

export class Column<V, M> extends Ops<V, M> implements ColumnExpr<V, M> {
  _value_phantom: V = null as any;

  readonly modelClass: ModelClass<M>;
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;

  constructor(modelClass: ModelClass<M>, conf: ColumnConfig) {
    super();
    this.modelClass = modelClass;
    this.tableName = conf.tableName;
    this.columnName = conf.columnName;
    this.fieldName = conf.fieldName;
  }

  asc(): Ordering<M> {
    throw new Error('unimplemented');
  }

  desc(): Ordering<M> {
    throw new Error('unimplemented');
  }
}

export type ColumnConfig = {
  tableName: string;
  columnName: string;
  fieldName: string;
};
