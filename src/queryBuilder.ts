import {
  Selectable,
  Select,
  ValuesOf,
  AddColumn,
  Orderer,
  AliasedQuery,
  Connection,
  ResultRowType,
  Query,
  IExpr,
  Groupable,
  ColumnList,
  Joiner,
} from './types';

const unimplemented = (): never => {
  throw new Error('unimplemented');
};

export class QueryBuilder<From, R, Ms> {
  constructor(private readonly query: Query<Ms>) {}

  select<Sels extends Selectable<Ms>[]>(
    ...sels: Sels
  ): QueryBuilder<From, Select<ValuesOf<Sels>>, Ms> {
    return new QueryBuilder<From, Select<ValuesOf<Sels>>, Ms>({
      ...this.query,
      select: sels,
    });
  }

  innerJoin<R2, M2>(joiner: Joiner<R2, From, M2>): QueryBuilder<From, AddColumn<R, R2>, Ms | M2> {
    const join = joiner();
    const query: Query<Ms | M2> = { ...this.query };
    query.defaultSelect.push(join.rightColumns());
    query.innerJoins.push(join);
    return new QueryBuilder(query);
  }

  where(...preds: IExpr<boolean, Ms>[]): QueryBuilder<From, R, Ms> {
    this.query.where = this.query.where.concat(preds);
    return this;
  }

  groupBy(...exprs: Groupable<Ms>[]): QueryBuilder<From, R, Ms> {
    this.query.groupBy = this.query.groupBy.concat(exprs);
    return this;
  }

  having(...preds: IExpr<boolean, Ms>[]): QueryBuilder<From, R, Ms> {
    this.query.having = this.query.having.concat(preds);
    return this;
  }

  orderBy(...ords: Orderer<Ms>[]): QueryBuilder<From, R, Ms> {
    this.query.orderBy = this.query.orderBy.concat(ords);
    return this;
  }

  limit(n: number): QueryBuilder<From, R, Ms> {
    this.query.limit = n;
    return this;
  }

  offset(n: number): QueryBuilder<From, R, Ms> {
    this.query.offset = n;
    return this;
  }

  as(_alias: string): AliasedQuery {
    return unimplemented();
  }

  async load(conn: Connection): Promise<ResultRowType<R>[]> {
    return conn.runQuery<ResultRowType<R>>(this.query);
  }

  async first(conn: Connection): Promise<ResultRowType<R> | undefined> {
    const rows = await this.limit(1).load(conn);
    return rows[0];
  }

  toSQL(conn: Connection): [string, any[]] {
    return conn.toSQL(this.query);
  }
}

export const newQuery = <M>(from: ColumnList<M>): Query<M> => {
  return {
    from: from.tableName(),
    fromAlias: from.tableAlias(),
    select: null,
    defaultSelect: [from],
    innerJoins: [],
    where: [],
    groupBy: [],
    having: [],
    orderBy: [],
    limit: null,
    offset: null,
  };
};
