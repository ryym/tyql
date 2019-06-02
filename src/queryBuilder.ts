import * as Knex from 'knex';
import { TableRel } from './tableRel';
import { ColumnList, Column } from './column';
import { Query, RawFunc, constructQuery } from './query';
import { Selectable, QueryTable, Orderer, PredExpr, Expr } from './types';

export interface QueryBuilder<Result, Models> {
  select<Sels extends Selectable<Models>[]>(
    ...sels: Sels
  ): QueryBuilder<Select<ValuesOf<Sels>>, Models>;
  innerJoin<M1 extends Models, M2>(
    join: TableRel<M1, M2>
  ): QueryBuilder<ToRowType<Result, M2>, Models | M2>;
  where(...preds: PredExpr<any>[]): QueryBuilder<Result, Models>;
  groupBy(...exprs: Expr<any, any>[]): QueryBuilder<Result, Models>;
  having(...preds: PredExpr<any>[]): QueryBuilder<Result, Models>;

  as(alias: string): QueryTable;
  orderBy(...ords: Orderer[]): QueryBuilder<Result, Models>;
  limit(n: number): QueryBuilder<Result, Models>;
  offset(n: number): QueryBuilder<Result, Models>;

  // TODO: Hide knex as implementation detail.
  load(knex: Knex): Promise<ResultRowType<Result>[]>;
}

export type Select<V> = { selects: V };

type ValueOf<C> = C extends Column<any, infer V>
  ? V
  : C extends ColumnList<infer T>
  ? T
  : never;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };

type ToRowType<A, B> = A extends Select<infer V>
  ? V
  : A extends [infer T1, infer T2]
  ? [T1, T2, B]
  : A extends [infer T1, infer T2, infer T3]
  ? [T1, T2, T3, B]
  : [A, B];

type ResultRowType<R> = R extends Select<infer V> ? V : R;

export class KnexQueryBuilder<R, Ms> implements QueryBuilder<R, Ms> {
  constructor(private queryDef: Query<Ms>) {}

  innerJoin<A extends Ms, B>(rel: TableRel<A, B>): QueryBuilder<ToRowType<R, B>, Ms | B> {
    const queryDef: Query<Ms | B> = { ...this.queryDef };
    queryDef.defaultSelect.push(rel.$all());
    queryDef.models.add(rel.$rightCol.model);
    queryDef.innerJoins.push(rel);
    return new KnexQueryBuilder(queryDef);
  }

  select<Sels extends Selectable<Ms>[]>(
    ...cols: Sels
  ): QueryBuilder<Select<ValuesOf<Sels>>, Ms> {
    const select: Selectable<Ms>[] = [];
    cols.forEach(col => {
      select.push(col);
    });
    this.queryDef.select = select;
    return new KnexQueryBuilder<Select<ValuesOf<Sels>>, Ms>(this.queryDef);
  }

  whereRaw(f: RawFunc): KnexQueryBuilder<R, Ms> {
    if (this.queryDef.whereRaw == null) {
      this.queryDef.whereRaw = [];
    }
    this.queryDef.whereRaw.push(f);
    return this;
  }

  // XXX:
  // TODO: Return value[] instead of [value[]] when result has 1 column.
  async load(conn: Knex): Promise<ResultRowType<R>[]> {
    const query = constructQuery(conn as any, this.queryDef);
    console.log(query.toString());

    // TODO: Adjust options for RDB. This options is only for PostgreSQL.
    const rows = await query.options({ rowMode: 'array' });

    return mapResults(this.queryDef, rows);
  }

  async first(_conn: Knex): Promise<ResultRowType<R>> {
    throw new Error('unimplemented');
  }

  where(..._preds: PredExpr<any>[]): QueryBuilder<R, Ms> {
    throw new Error('unimplemented');
  }
  groupBy(..._exprs: Expr<any, any>[]): QueryBuilder<R, Ms> {
    throw new Error('unimplemented');
  }
  having(..._preds: PredExpr<any>[]): QueryBuilder<R, Ms> {
    throw new Error('unimplemented');
  }
  orderBy(..._ords: Orderer[]): QueryBuilder<R, Ms> {
    throw new Error('unimplemented');
  }
  limit(_n: number): QueryBuilder<R, Ms> {
    throw new Error('unimplemented');
  }
  offset(_n: number): QueryBuilder<R, Ms> {
    throw new Error('unimplemented');
  }
  as(_alias: string): QueryTable {
    throw new Error('unimplemented');
  }
}

const mapResults = ({ select, defaultSelect }: Query<any>, rows: any[][]): any => {
  if (select != null) {
    return rows.map(rawRow => {
      const row: any[] = [];
      let rowIdx = 0;
      let rawRowIdx = 0;
      select.forEach(sel => {
        if (sel instanceof ColumnList) {
          const m = sel.model.tyql.template();
          sel.columns.forEach(col => {
            m[col.fieldName] = rawRow[rawRowIdx++];
          });
          row[rowIdx++] = m;
        } else {
          row[rowIdx++] = rawRow[rawRowIdx++];
        }
      });
      return row;
    });
  }

  if (defaultSelect.length === 1) {
    return rows.map(rawRow => {
      let rowIdx = 0;
      const sel = defaultSelect[0];
      const model = sel.model.tyql.template();
      sel.columns.forEach(col => {
        (model as any)[col.fieldName] = rawRow[rowIdx++];
      });
      return model;
    });
  } else {
    return rows.map(rawRow => {
      let rowIdx = 0;
      return defaultSelect.map(sel => {
        const model = sel.model.tyql.template();
        sel.columns.forEach(col => {
          (model as any)[col.fieldName] = rawRow[rowIdx++];
        });
        return model;
      });
    });
  }
};
