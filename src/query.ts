import * as Knex from 'knex';
import { ModelClass } from './model';
import { ColumnList, Column } from './column';
import { Selectable } from './types';
import { TableRel } from './tableRel';

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

export const constructQuery = (
  knex: Knex.QueryBuilder,
  q: Query<any>
): Knex.QueryBuilder => {
  const cols = getColumnIdentifiers(q.select || q.defaultSelect);

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
      if (sel instanceof ColumnList) {
        return cols.concat(sel.columns.map(c => c.identifier()));
      }
      if (sel instanceof Column) {
        cols.push(sel.identifier());
        return cols;
      }
      throw new Error(`UNREACHABLE: Unknown Selectable value: ${sel}`);
    },
    [] as string[]
  );
};
