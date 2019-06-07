import * as Knex from 'knex';
import { ModelClass, ColumnList, Selectable, TableRel, Connection } from './types';

export type Query<Models> = {
  from: string;
  models: Set<ModelClass<Models>>;
  defaultSelect: ColumnList<any>[];
  select: Selectable<any>[] | null;
  innerJoins: TableRel<any, any, any>[];
};

export const newQuery = <M>(_m: ModelClass<M>, _fromAs?: string): Query<M> => {
  return null as any;
};

export const constructQuery = (_conn: Connection, _q: Query<any>): Knex.QueryBuilder => {
  return null as any;
};
