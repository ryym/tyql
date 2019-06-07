import {
  QueryBuilder as IQueryBuilder,
  Selectable,
  Select,
  ValuesOf,
  Joinable,
  RowType,
  Expr,
  Ordering,
  AliasedQuery,
  Connection,
  ResultRowType,
} from './types';
import { Query, constructQuery } from './query';

const unimplemented = (): never => {
  throw new Error('unimplemented');
};

export class QueryBuilder<R, Ms> implements IQueryBuilder<R, Ms> {
  constructor(private readonly query: Query<Ms>) {}

  select<Sels extends Selectable<Ms>[]>(...sels: Sels): QueryBuilder<Select<ValuesOf<Sels>>, Ms> {
    return new QueryBuilder<Select<ValuesOf<Sels>>, Ms>({
      ...this.query,
      select: sels,
    });
  }

  innerJoin<M1 extends Ms, M2>(join: Joinable<M1, M2>): QueryBuilder<RowType<R, M2>, Ms | M2> {
    const query: Query<Ms | M2> = { ...this.query };

    switch (join.$joinType) {
      case 'TABLE_JOIN':
        query.defaultSelect.push(join);
        break;
      case 'TABLE_REL_BUILDER':
        query.defaultSelect.push(join());
        break;
    }

    query.innerJoins.push(join);
    return new QueryBuilder(query);
  }

  where(..._preds: Expr<boolean, Ms>[]): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  groupBy(..._exprs: Expr<any, Ms>[]): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  having(..._preds: Expr<boolean, Ms>[]): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  orderBy(..._ords: Ordering<Ms>[]): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  limit(_n: number): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  offset(_n: number): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  as(_alias: string): AliasedQuery {
    return unimplemented();
  }

  async load(conn: Connection): Promise<ResultRowType<R>[]> {
    const query = constructQuery(conn, this.query);

    // TODO: Adjust options for RDB. This options is only for PostgreSQL.
    const rows = await query.options({ rowMode: 'array' });
    console.log(rows);

    return unimplemented();
  }
}
