import { ModelClass, FieldNames } from './model';
import { Columns, ColumnList, toColumns, Column } from './column';
import { AnyRelsDef, RelsTemplate, RelsDef, TableRel, RelsTo } from './tableRel';
import { QueryBuilder, newQueryDef } from './queryBuilder';
import { RelationLoader } from './relationLoader';

export interface TableActions<T> {
  $query(): QueryBuilder<T, T>;
  $all(): ColumnList<T>;
  $rels<RS extends TableRel<T, any>[]>(...rels: RS): RelationLoader<T, RS>;
}

export type LoadedRels<T, RS> = {
  [K in keyof RS]: RS[K] extends TableRel<T, infer U, infer V> ? Map<V, U[]> : never
};

const newTableActions = <T>(model: ModelClass<T>): TableActions<T> => {
  return {
    $query() {
      return new QueryBuilder<T, T>(newQueryDef(model));
    },
    $all() {
      return new ColumnList(model.tyql.table, model);
    },

    $rels<RS extends TableRel<T, any>[]>(...rels: RS): RelationLoader<T, RS> {
      return new RelationLoader(rels);
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
      const [leftColName, { model: otherClass, column: rightColName }] = relsTmpl[name];
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
        $all: () => new ColumnList(tableAlias, otherClass),
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
export const to = <B, P extends FieldNames<B>>(
  model: ModelClass<B>,
  column: P
): RelsTo<B, B[P]> => ({ model, column });
