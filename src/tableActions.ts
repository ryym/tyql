import {
  ColumnList,
  Selectable,
  Select,
  ValuesOf,
  AddColumn,
  IExpr,
  Orderer,
  Connection,
  ResultRowType,
  TableRel,
  Joiner,
} from './types';
import { Column, ModelColumnList } from './column';
import { QueryBuilder, newQuery } from './queryBuilder';
import { RelationLoader } from './relationLoader';

export class TableActions<M> implements ColumnList<M> {
  $type = 'COLUMN_LIST' as const;

  constructor(private readonly columnList: ModelColumnList<M>) {}

  columns(): Column<any, M>[] {
    return this.columnList.columns();
  }

  tableName(): string {
    return this.columnList.tableName();
  }

  tableAlias() {
    return this.columnList.tableAlias();
  }

  rels<RS extends TableRel<any, M, any>[]>(...rels: RS): RelationLoader<M, RS> {
    return new RelationLoader(rels);
  }

  query(): QueryBuilder<M, M, M> {
    return new QueryBuilder(newQuery(this));
  }

  select<Sels extends Selectable<M>[]>(...sels: Sels): QueryBuilder<M, Select<ValuesOf<Sels>>, M> {
    return this.query().select(...sels);
  }

  innerJoin<R2, Ms2>(join: Joiner<R2, M, any, Ms2>): QueryBuilder<M, AddColumn<M, R2>, M | Ms2> {
    return this.query().innerJoin(join);
  }

  where(...preds: IExpr<boolean, M>[]): QueryBuilder<M, M, M> {
    return this.query().where(...preds);
  }

  groupBy(...exprs: IExpr<any, M>[]): QueryBuilder<M, M, M> {
    return this.query().groupBy(...exprs);
  }

  having(...preds: IExpr<boolean, M>[]): QueryBuilder<M, M, M> {
    return this.query().having(...preds);
  }

  orderBy(...ords: Orderer<M>[]): QueryBuilder<M, M, M> {
    return this.query().orderBy(...ords);
  }

  limit(n: number): QueryBuilder<M, M, M> {
    return this.query().limit(n);
  }

  offset(n: number): QueryBuilder<M, M, M> {
    return this.query().offset(n);
  }

  load(conn: Connection): Promise<ResultRowType<M>[]> {
    return this.query().load(conn);
  }

  first(conn: Connection): Promise<ResultRowType<M> | undefined> {
    return this.query().first(conn);
  }
}
