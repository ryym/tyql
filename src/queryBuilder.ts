import * as Knex from 'knex';
import { ModelClass } from './types';
import { TableRel } from './tableRel';
import { AllColumns, Column } from './column';

type Selectable<Models> = AllColumns<Models> | Column<Models, any>;

export type QueryDef<Models> = {
  from: string;
  models: Set<ModelClass<any>>;
  defaultSelect: AllColumns<Models>[];
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
  ): QueryBuilder<From, ToRowType<R, B>, Models | B> {
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

  // XXX:
  // TODO: Return value[] instead of [value[]] when result has 1 column.
  async load(conn: Knex): Promise<ResultRowType<R>[]> {
    const query = constructQuery(conn as any, this.queryDef);
    console.log(query.toString());
    // return null as any;

    // TODO: Adjust options for RDB. This options is only for PostgreSQL.
    const rows = await query.options({ rowMode: 'array' });
    console.log(rows);
    console.log('--------------------');

    return mapResults(this.queryDef, rows);
  }

  async first(_conn: Knex): Promise<ResultRowType<R>> {
    throw new Error('not implemented yet');
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
        return cols.concat(sel.columns.map(c => c.identifier()));
      } else {
        cols.push(sel.identifier());
        return cols;
      }
    },
    [] as string[]
  );
};

const mapResults = ({ select, defaultSelect }: QueryDef<any>, rows: any[][]): any => {
  if (select != null) {
    return rows.map(rawRow => {
      const row: any[] = [];
      let rowIdx = 0;
      let rawRowIdx = 0;
      select.forEach(sel => {
        if (sel instanceof AllColumns) {
          const m = sel.model.template();
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
      const model = sel.model.template();
      sel.columns.forEach(col => {
        (model as any)[col.fieldName] = rawRow[rowIdx++];
      });
      return model;
    });
  } else {
    return rows.map(rawRow => {
      let rowIdx = 0;
      return defaultSelect.map(sel => {
        const model = sel.model.template();
        sel.columns.forEach(col => {
          (model as any)[col.fieldName] = rawRow[rowIdx++];
        });
        return model;
      });
    });
  }
};

type ValueOf<C> = C extends Column<any, infer V>
  ? V
  : C extends AllColumns<infer T>
  ? T
  : never;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };
export type Select<V> = { selects: V };

type ToRowType<A, B> = A extends Select<infer V>
  ? V
  : A extends [infer T1, infer T2]
  ? [T1, T2, B]
  : A extends [infer T1, infer T2, infer T3]
  ? [T1, T2, T3, B]
  : [A, B];

type ResultRowType<R> = R extends Select<infer V> ? V : R;
