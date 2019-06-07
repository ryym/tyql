import * as Knex from 'knex';
import { Selectable, Connection, Joinable, ColumnList } from './types';

export type Query<Models> = {
  from: string;
  select: Selectable<any>[] | null;
  defaultSelect: ColumnList<Models>[];
  innerJoins: Joinable<any, any>[];
};

export const newQuery = <M>(fromCols: ColumnList<M>, fromTable: string): Query<M> => {
  return {
    from: fromTable,
    select: null,
    defaultSelect: [fromCols],
    innerJoins: [],
  };
};

export const constructQuery = (_conn: Connection, _q: Query<any>): Knex.QueryBuilder => {
  return null as any;
};
