import * as Knex from 'knex';
import { ModelClass } from './types';
import { TableRel } from './tableRel';
import { AllColumns, Column } from './column';

type Selectable<Models> = AllColumns<Models> | Column<Models, any>;

export type QueryDef<Models> = {
  from: string;
  models: Set<ModelClass<any>>;
  defaultSelect: Selectable<Models>[];
  select: Selectable<Models>[] | null;
  innerJoins: TableRel<Models, Models>[];
};

export const newQueryDef = <T>(clazz: ModelClass<T>): QueryDef<T> => {
  return {
    from: clazz.tableDef().name,
    models: new Set([clazz]),
    defaultSelect: [new AllColumns(clazz.tableDef().name, clazz)],
    select: null,
    innerJoins: [],
  };
};

export class QueryBuilder<From, R, Models> {
  _phantom?: ModelClass<From>;

  constructor(private queryDef: QueryDef<Models>) {}

  innerJoin<A extends Models, B>(
    rel: TableRel<A, B>
  ): QueryBuilder<From, ToQueryResult<R, B[]>, Models | B> {
    const queryDef: QueryDef<Models | B> = { ...this.queryDef };
    queryDef.defaultSelect.push(rel.$all());
    queryDef.models.add(rel.$rightCol.model);
    queryDef.innerJoins.push(rel);
    return new QueryBuilder(queryDef);
  }

  select<CS extends (AllColumns<Models> | Column<Models, any>)[]>(
    ...cols: CS
  ): QueryBuilder<From, Select<ValuesOf<CS>>, Models> {
    const select: Selectable<Models>[] = [];
    cols.forEach(col => {
      select.push(col);
    });
    this.queryDef.select = select;
    return new QueryBuilder(this.queryDef);
  }

  async load(conn: Knex): Promise<R> {
    const query = constructQuery(conn as any, this.queryDef);
    console.log(query.toString());
    // return null as any;
    return query;
  }
}

const constructQuery = (
  knex: Knex.QueryBuilder,
  def: QueryDef<any>
): Knex.QueryBuilder => {
  console.log(def);
  const cols = getColumnIdentifiers(def.select || def.defaultSelect);

  def.innerJoins.forEach(rel => {
    knex = knex.innerJoin(
      `${rel.$rightCol.model.tableDef().name} AS ${rel.$rightCol.tableName}`,
      rel.$rightCol.identifier(),
      rel.$leftCol.identifier()
    );
  });

  return knex.select(...cols).from(def.from);
};

const getColumnIdentifiers = (select: Selectable<any>[]): string[] => {
  return select.reduce(
    (cols, sel) => {
      if (sel instanceof AllColumns) {
        const allCols = Object.values(sel.columns()).map(c => c.identifier());
        return cols.concat(allCols);
      } else {
        cols.push(sel.identifier());
        return cols;
      }
      return cols;
    },
    [] as string[]
  );
};

type ValueOf<C> = C extends Column<any, infer V>
  ? V
  : C extends AllColumns<infer T>
  ? T[]
  : never;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };
export type Select<V> = { selects: V };

type ToQueryResult<R1, R2> = R1 extends Select<infer V>
  ? V
  : R1 extends [infer T1, infer T2]
  ? [T1, T2, R2]
  : R1 extends [infer T1, infer T2, infer T3]
  ? [T1, T2, T3, R2]
  : [R1, R2];
