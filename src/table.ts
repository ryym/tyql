import {
  ColumnExpr,
  QueryBuilder,
  Ordering,
  TableRel,
  ColumnList,
  ModelClass,
  Connection,
} from './types';
import { Ops } from './ops';

type MethodNames<T> = { [P in keyof T]: T[P] extends Function ? P : never }[keyof T];

export type FieldNames<T> = Exclude<keyof T, MethodNames<T>>;

export type Fields<T> = { [P in FieldNames<T>]: T[P] };

export type FieldNamesOfType<T, V> = {
  [P in FieldNames<T>]: T[P] extends V | null | undefined ? P : never
}[FieldNames<T>];

export type ColumnSet<M> = { readonly [K in keyof Fields<M>]: Column<M[K], M> };

export type RelationBuilder<V, M1, M2> = ColumnSet<M2> & {
  (): TableRel<V, M1, M2>;
};

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

interface TableActions<M> extends QueryBuilder<M, M>, ColumnList<M> {
  columns(): ColumnExpr<any, M>[];
  query(): QueryBuilder<M, M>;
  rels<RS extends TableRel<any, M, any>[]>(...rels: RS): RelationLoader<M, RS>;
}

const todo = (): any => null;
export class Column<V, M> extends Ops<V, M> implements ColumnExpr<V, M> {
  tableName: string = todo();
  columnName: string = todo();
  fieldName: string = todo();
  modelClass: ModelClass<M> = todo();
  _value_phantom = todo() as V;

  asc(): Ordering<M> {
    return todo();
  }

  desc(): Ordering<M> {
    return todo();
  }
}
