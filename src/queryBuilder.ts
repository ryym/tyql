import {
  QueryBuilder as IQueryBuilder,
  Selectable,
  Select,
  ValuesOf,
  AddColumn,
  Ordering,
  AliasedQuery,
  Connection,
  ResultRowType,
  Query,
  IExpr,
  Joinable,
} from './types';

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

  innerJoin<M1 extends Ms, M2>(join: Joinable<M1, M2>): QueryBuilder<AddColumn<R, M2>, Ms | M2> {
    const query: Query<Ms | M2> = { ...this.query };
    query.defaultSelect.push(join.$all());
    query.innerJoins.push(join);
    return new QueryBuilder(query);
  }

  where(...preds: IExpr<boolean, Ms>[]): QueryBuilder<R, Ms> {
    this.query.where = this.query.where.concat(preds);
    return this;
  }

  groupBy(..._exprs: IExpr<any, Ms>[]): QueryBuilder<R, Ms> {
    return unimplemented();
  }

  having(..._preds: IExpr<boolean, Ms>[]): QueryBuilder<R, Ms> {
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
    return conn.runQuery<ResultRowType<R>>(this.query);
  }
}
