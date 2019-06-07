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
import { Query } from './query';

const unimplemented = (): never => {
  throw new Error('unimplemented');
};

export class QueryBuilder<R, Ms> implements IQueryBuilder<R, Ms> {
  constructor(private readonly query: Query<Ms>) {
    console.log(this.query);
  }

  select<Sels extends Selectable<Ms>[]>(..._sels: Sels): QueryBuilder<Select<ValuesOf<Sels>>, Ms> {
    return unimplemented();
  }

  innerJoin<M1 extends Ms, M2>(_join: Joinable<M1, M2>): QueryBuilder<RowType<R, M2>, Ms | M2> {
    return unimplemented();
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

  load(_conn: Connection): Promise<ResultRowType<R>[]> {
    return unimplemented();
  }
}
