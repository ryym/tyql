import { ModelClass } from './types';
import { Columns, AllColumns, toColumns, Column } from './column';
import { AnyRelsDef, RelsTemplate, RelsDef, TableRel } from './tableRel';
import { QueryBuilder, newQueryDef } from './queryBuilder';

export type Schema<T, Rels extends AnyRelsDef<T>> = Columns<T> &
  Rels & {
    $all(): AllColumns<T>;
    $query(): QueryBuilder<T, T, T>;
  };

export type SchemaConfig<T, Rels extends RelsTemplate<T>> = {
  rels?: Rels;
};

// The syntax highlight of VSCode does not work correctly
// if we define this by arrow function :(
export function schema<T, Rels extends RelsTemplate<T>>(
  clazz: ModelClass<T>,
  config: SchemaConfig<T, Rels>
): Schema<T, RelsDef<T, Rels>> {
  const columns = toColumns(clazz.tableDef().name, clazz);
  const table = clazz.tableDef();

  const relsTmpl = config.rels || <Rels>{};
  const rels: RelsDef<T, Rels> = Object.keys(relsTmpl).reduce(
    (rls, name) => {
      const [leftColName, [otherClass, rightColName]] = relsTmpl[name];
      const tableAlias = `${table.name}_${name}`;
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

  const methods = {
    $query: () => {
      return new QueryBuilder<T, T, T>(newQueryDef(clazz));
    },
    $all: () => new AllColumns(clazz.tableDef().name, clazz),
  };

  return Object.assign(methods, columns, rels);
}

// A utility to define relationship type safely.
export const to = <B>(klass: ModelClass<B>, col: keyof B): [ModelClass<B>, keyof B] => [
  klass,
  col,
];
