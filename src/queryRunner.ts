import * as Knex from 'knex';
import { Query, Selectable, IExpr, Op, Joinable, Groupable } from './types';
import { Quote } from './connection';
import { mapRows } from './queryResultMapper';
import { unreachable } from './unreachable';
import { and } from './ops';

export type BuildContext = {
  knex: Knex;
  quote: Quote;
};

export const runQuery = async (query: Query<any>, ctx: BuildContext): Promise<any[]> => {
  // TODO: Adjust options for RDB. This options is only for PostgreSQL.
  const builder = ctx.knex.select().options({ rowMode: 'array' });
  const q = constructQuery(builder, query, ctx);

  const rows = await q;
  return mapRows(query, rows);
};

export const constructQuery = (
  builder: Knex.QueryBuilder,
  q: Query<any>,
  ctx: BuildContext
): Knex.QueryBuilder => {
  const select = buildSelect(q.select || q.defaultSelect, ctx);

  const from = q.fromAlias ? `${q.from} AS ${q.fromAlias}` : q.from;
  builder = builder.from(from).select(...select);

  if (q.where.length > 0) {
    const where = concatPredicates(q.where, ctx);
    builder = builder.where(where);
  }

  if (q.innerJoins.length > 0) {
    buildJoins(q.innerJoins, ctx).forEach(([table, on]) => {
      builder = builder.innerJoin(table, on);
    });
  }

  if (q.groupBy.length > 0) {
    const groupBy = buildGroupBy(q.groupBy, ctx);
    builder = builder.groupBy(groupBy);
  }

  if (q.having.length > 0) {
    const having = concatPredicates(q.having, ctx);
    builder = builder.having(having);
  }

  if (q.orderBy.length > 0) {
    q.orderBy.forEach(ord => {
      const expr = buildExpr(ord.expr, ctx);
      // knex.orderBy accepts Knex.Raw but its type definition does not.
      builder = builder.orderBy(expr as any, ord.order);
    });
  }

  if (q.limit != null) {
    builder = builder.limit(q.limit);
  }
  if (q.offset != null) {
    builder = builder.offset(q.offset);
  }

  return builder;
};

const buildSelect = (select: Selectable<any>[], ctx: BuildContext): Knex.Raw[] => {
  const raws: Knex.Raw[] = [];

  const buildFromJoinable = (join: Joinable<any, any, any, any>) => {
    join
      .rightColumns()
      .columns()
      .forEach(col => {
        raws.push(buildExpr(col, ctx));
      });
    join.joins().forEach(buildFromJoinable);
  };

  select.forEach(sel => {
    switch (sel.$type) {
      case 'COLUMN_LIST':
        sel.columns().forEach(col => {
          raws.push(buildExpr(col, ctx));
        });
        break;
      case 'JOINABLE':
        buildFromJoinable(sel);
        break;
      case 'ALIASED':
        throw new Error('unimplemented');
      default:
        raws.push(buildExpr(sel, ctx));
        break;
    }
  });

  return raws;
};

const concatPredicates = (preds: IExpr<boolean, any>[], ctx: BuildContext): Knex.Raw => {
  const pred = and(...preds);
  return buildExpr(pred, ctx);
};

const buildJoins = (
  joins: Joinable<any, any, any, any>[],
  ctx: BuildContext,
  results: [string, Knex.Raw][] = []
): [string, Knex.Raw][] => {
  joins.forEach(j => {
    const cols = j.rightColumns();
    const table = cols.tableAlias()
      ? `${cols.tableName()} AS ${cols.tableAlias()}`
      : cols.tableName();

    results.push([table, buildExpr(j.joinCondition(j.leftTable(), j.rightTable()), ctx)]);
    buildJoins(j.joins(), ctx, results);
  });

  return results;
};

const buildGroupBy = (exprs: Groupable<any>[], ctx: BuildContext): Knex.Raw[] => {
  const raws: Knex.Raw[] = [];

  exprs.forEach(expr => {
    switch (expr.$type) {
      case 'COLUMN_LIST':
        expr.columns().forEach(col => {
          raws.push(buildExpr(col, ctx));
        });
        break;
      default:
        raws.push(buildExpr(expr, ctx));
        break;
    }
  });

  return raws;
};

const buildExpr = (iexpr: IExpr<any, any>, ctx: BuildContext): Knex.Raw => {
  const st = new QueryState();
  appendExpr(st, iexpr, ctx);
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

const appendExpr = (st: QueryState, iexpr: IExpr<any, any>, ctx: BuildContext) => {
  const expr = iexpr.toExpr();
  switch (expr.$exprType) {
    case 'COLUMN':
      st.append(`${ctx.quote(expr.tableName)}.${ctx.quote(expr.columnName)}`);
      return;

    case 'LIT':
      st.append('?', expr.value);
      return;

    case 'INFIX':
      appendExpr(st, expr.left, ctx);
      st.append(` ${expr.op} `);
      appendExpr(st, expr.right, ctx);
      return;

    case 'PREFIX':
      st.append(`${expr.op} `);
      appendExpr(st, expr.expr, ctx);
      return;

    case 'SUFIX':
      appendExpr(st, expr.expr, ctx);
      st.append(` ${expr.op}`);
      return;

    case 'IN':
      appendExpr(st, expr.value, ctx);
      if (!expr.positive) {
        st.append(' NOT');
      }
      st.append(` ${Op.IN} (`);
      expr.candidates.forEach((v, i) => {
        if (i > 0) {
          st.append(', ');
        }
        appendExpr(st, v, ctx);
      });
      st.append(')');
      return;

    case 'BETWEEN':
      appendExpr(st, expr.value, ctx);
      if (!expr.positive) {
        st.append(' NOT');
      }
      st.append(` ${Op.BETWEEN} `);
      appendExpr(st, expr.start, ctx);
      st.append(' AND ');
      appendExpr(st, expr.end, ctx);
      return;

    case 'PARENS':
      st.append('(');
      appendExpr(st, expr.expr, ctx);
      st.append(')');
      return;

    default:
      unreachable(expr);
  }
};
