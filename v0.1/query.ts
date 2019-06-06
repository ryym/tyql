import * as Knex from 'knex';
import { ModelClass } from './model';
import { ColumnList, Column } from './column';
import { TableRel } from './tableRel';
import { Connection } from './conn';
import { unreachable } from './util';

export type Selectable<M> = Column<any, M> | ColumnList<M>;

export const newQuery = <T>(clazz: ModelClass<T>, fromAs?: string): Query<T> => {
  const fromTable = fromAs ? `${clazz.tyql.table} AS ${fromAs}` : clazz.tyql.table;
  return {
    from: fromTable,
    models: new Set([clazz]),
    defaultSelect: [new ColumnList(fromAs || clazz.tyql.table, clazz)],
    select: null,
    innerJoins: [],
  };
};

export type RawFunc = (knex: Knex.QueryBuilder) => Knex.QueryBuilder;

export type Query<Models> = {
  from: string;
  models: Set<ModelClass<Models>>;
  defaultSelect: ColumnList<any>[];
  select: Selectable<any>[] | null;
  innerJoins: TableRel<any, any>[];
  whereRaw?: RawFunc[];
};

export const constructQuery = (conn: Connection, q: Query<any>): Knex.QueryBuilder => {
  const cols = getColumnIdentifiers(q.select || q.defaultSelect);
  let knex = conn.queryBuilder();

  q.innerJoins.forEach(rel => {
    knex = knex.innerJoin(
      `${rel.$rightCol.model.tyql.table} AS ${rel.$rightCol.tableName}`,
      rel.$rightCol.identifier(),
      rel.$leftCol.identifier()
    );
  });

  if (q.whereRaw) {
    knex = q.whereRaw.reduce((kn, f) => f(kn), knex);
  }

  return knex.select(...cols).from(q.from);
};

const getColumnIdentifiers = (select: Selectable<any>[]): string[] => {
  return select.reduce(
    (cols, sel) => {
      switch (sel.$type) {
        case 'COLUMN':
          cols.push(sel.identifier());
          return cols;
        case 'COLUMN_LIST':
          return cols.concat(sel.columns.map(c => c.identifier()));
        default:
          return unreachable(sel);
      }
    },
    [] as string[]
  );
};
