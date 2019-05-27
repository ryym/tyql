import { ModelClass } from './model';
import { Columns, AllColumns, toColumns, Column } from './column';
import { AnyRelsDef, RelsTemplate, RelsDef, TableRel } from './tableRel';
import { QueryBuilder, newQueryDef } from './queryBuilder';

export interface TableActions<T> {
  $query(): QueryBuilder<T, T, T>;
  $all(): AllColumns<T>;
  $loadRels<RS extends TableRel<T, any>[]>(
    records: T[],
    ...rels: RS
  ): Promise<LoadedRels<T, RS>>;
}

export type LoadedRels<T, RS> = {
  [K in keyof RS]: RS[K] extends TableRel<T, infer U> ? Map<string, U[]> : never
};

const newTableActions = <T>(model: ModelClass<T>): TableActions<T> => {
  return {
    $query() {
      return new QueryBuilder<T, T, T>(newQueryDef(model));
    },
    $all() {
      return new AllColumns(model.tyql.table, model);
    },
    $loadRels() {
      return null as any; // TODO
    },
  };
};

export type Table<T, Rels extends AnyRelsDef<T>> = Columns<T> & Rels & TableActions<T>;

export type TableConfig<T, Rels extends RelsTemplate<T>> = {
  rels?: Rels;
};

// The syntax highlight of VSCode does not work correctly
// if we define this by arrow function :(
export function table<T, Rels extends RelsTemplate<T>>(
  clazz: ModelClass<T>,
  config: TableConfig<T, Rels>
): Table<T, RelsDef<T, Rels>> {
  const columns = toColumns(clazz.tyql.table, clazz);
  const tableName = clazz.tyql.table;

  const relsTmpl = config.rels || <Rels>{};
  const rels: RelsDef<T, Rels> = Object.keys(relsTmpl).reduce(
    (rls, name) => {
      const [leftColName, [otherClass, rightColName]] = relsTmpl[name];
      const tableAlias = `${tableName}_${name}`;
      const rightColumns = toColumns(tableAlias, otherClass);
      const rel: TableRel<T, any> = Object.assign(rightColumns, {
        $leftCol: columns[leftColName],
        $rightCol: new Column(otherClass, {
          ...rightColumns[rightColName as any],
          tableName: tableAlias,
        }),
        $left: clazz,
        $right: otherClass,
        $all: () => new AllColumns(tableAlias, otherClass),
      });
      rls[name] = rel;
      return rls;
    },
    {} as any
  );

  const actions = newTableActions(clazz);
  return Object.assign(actions, columns, rels);
}

// A utility to define relationship type safely.
export const to = <B>(klass: ModelClass<B>, col: keyof B): [ModelClass<B>, keyof B] => [
  klass,
  col,
];
