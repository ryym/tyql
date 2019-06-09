import {
  QueryBuilder,
  Ordering,
  ColumnList,
  ModelClass,
  Connection,
  TableRel,
  IColumn,
  ColumnExpr,
  iexprPhantomTypes,
} from './types';
import { Ops } from './ops';

type MethodNames<T> = { [P in keyof T]: T[P] extends Function ? P : never }[keyof T];

export type FieldNames<T> = Exclude<keyof T, MethodNames<T>>;

export type Fields<T> = { [P in FieldNames<T>]: T[P] };

export type FieldNamesOfType<T, V> = {
  [P in FieldNames<T>]: T[P] extends V | null | undefined ? P : never
}[FieldNames<T>];

export type ColumnSet<M> = { readonly [K in keyof Fields<M>]: Column<M[K], M> };

export type RelationBuilder<V, M1, M2> = ColumnSet<M2> & TableRel<V, M1, M2>;

type AnyRelationBuilders<M> = {
  [key: string]: RelationBuilder<any, M, any>;
};

export interface TableBase<M> {
  $all(): ColumnList<M>;
  $query(): QueryBuilder<M, M>;
  $rels<RS extends TableRel<any, M, any>[]>(...rels: RS): RelationLoader<M, RS>;
}

export type Table<M, Rels extends AnyRelationBuilders<M>> = TableBase<M> & Rels & ColumnSet<M>;

export interface RelationLoader<M, RS extends TableRel<any, M, any>[]> {
  loadMaps(records: M[], conn: Connection): Promise<RelsMap<M, RS>>;
}

type RelsMap<M1, RS> = {
  [K in keyof RS]: RS[K] extends TableRel<infer V, M1, infer M2> ? Map<V, M2[]> : never
};

export class Column<V, M> extends Ops<V, M> implements IColumn<V, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<V, M>();

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

  toExpr(): ColumnExpr {
    return {
      $exprType: 'COLUMN',
      tableName: this.tableName,
      columnName: this.columnName,
      fieldName: this.fieldName,
    };
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
