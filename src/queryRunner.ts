import * as Knex from 'knex';
import { Query, Expr, Selectable } from './types';
import { Quote } from './connection';
import { mapRows } from './queryResultMapper';

export type BuildContext = {
  knex: Knex;
  quote: Quote;
};

export const runQuery = async (query: Query<any>, ctx: BuildContext): Promise<any[]> => {
  // TODO: Adjust options for RDB. This options is only for PostgreSQL.
  const builder = ctx.knex.select().options({ rowMode: 'array' });
  const q = constructQuery(builder, query, ctx);

  // TODO: Remove debug code.
  console.log(q.toString());

  const rows = await q;
  return mapRows(query, rows);
};

export const constructQuery = (
  builder: Knex.QueryBuilder,
  q: Query<any>,
  ctx: BuildContext
): Knex.QueryBuilder => {
  const select = buildSelect(q.select || q.defaultSelect, ctx);
  builder = builder.from(q.from).select(...select);
  return builder;
};

const buildSelect = (select: Selectable<any>[], ctx: BuildContext): Knex.Raw[] => {
  const raws: Knex.Raw[] = [];

  select.forEach(sel => {
    switch (sel.$type) {
      case 'COLUMN_LIST':
        sel.columns().forEach(col => {
          raws.push(buildExpr(col, ctx));
        });
        break;
      case 'ALIASED':
        // TODO
        break;
      default:
        raws.push(buildExpr(sel, ctx));
        break;
    }
  });

  return raws;
};

const buildExpr = (expr: Expr<any, any>, ctx: BuildContext): Knex.Raw => {
  const st = new QueryState();
  appendExpr(st, expr, ctx);
  return ctx.knex.raw(st.query, st.bindings);
};

class QueryState {
  query: string = '';
  bindings: any[] = [];

  append(query: string, ...bindings: any[]) {
    this.query += query;
    this.bindings = this.bindings.concat(bindings);
  }
}

const appendExpr = (st: QueryState, expr: Expr<any, any>, ctx: BuildContext) => {
  switch (expr.$type) {
    case 'COLUMN_EXPR':
      st.append(`${ctx.quote(expr.tableName)}.${ctx.quote(expr.columnName)}`);
      return;
    default:
      // TODO: exhaustive check.
      throw new Error('unimplemented');
  }
};
