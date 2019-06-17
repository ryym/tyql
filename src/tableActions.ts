import {
  ColumnList,
  Selectable,
  Select,
  ValuesOf,
  Joinable,
  AddColumn,
  IExpr,
  Orderer,
  Connection,
  ResultRowType,
  TableRel,
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

  query(): QueryBuilder<M, M> {
    return new QueryBuilder(newQuery(this));
  }

  select<Sels extends Selectable<M>[]>(...sels: Sels): QueryBuilder<Select<ValuesOf<Sels>>, M> {
    return this.query().select(...sels);
  }

  innerJoin<M1 extends M, M2>(join: Joinable<M1, M2>): QueryBuilder<AddColumn<M, M2>, M | M2> {
    return this.query().innerJoin(join);
  }

  where(...preds: IExpr<boolean, M>[]): QueryBuilder<M, M> {
    return this.query().where(...preds);
  }

  groupBy(...exprs: IExpr<any, M>[]): QueryBuilder<M, M> {
    return this.query().groupBy(...exprs);
  }

  having(...preds: IExpr<boolean, M>[]): QueryBuilder<M, M> {
    return this.query().having(...preds);
  }

  orderBy(...ords: Orderer<M>[]): QueryBuilder<M, M> {
    return this.query().orderBy(...ords);
  }

  limit(n: number): QueryBuilder<M, M> {
    return this.query().limit(n);
  }

  offset(n: number): QueryBuilder<M, M> {
    return this.query().offset(n);
  }

  load(conn: Connection): Promise<ResultRowType<M>[]> {
    return this.query().load(conn);
  }
}
