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

export interface Table<M> {
  (): TableActions<M>;
}

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
