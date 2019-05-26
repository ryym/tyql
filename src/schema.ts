import { ModelClass } from './types';
import { Columns, AllColumns, toColumns } from './column';
import { AnyRelsDef, RelsTemplate, RelsDef, TableRel } from './tableRel';
import { QueryBuilder } from './queryBuilder';

export type Schema<T, Rels extends AnyRelsDef<T>> = Columns<T> &
  Rels & {
    $all(): AllColumns<T>;
    $query(): QueryBuilder<T, T[], T>;
  };

export type SchemaConfig<Rels extends RelsTemplate> = {
  rels?: Rels;
};

export const schema = <T, Rels extends RelsTemplate>(
  clazz: ModelClass<T>,
  config: SchemaConfig<Rels>
): Schema<T, RelsDef<T, Rels>> => {
  const columns = toColumns(clazz);

  const relsTmpl = config.rels || <Rels>{};
  const rels: RelsDef<T, Rels> = Object.keys(relsTmpl).reduce(
    (rls, name) => {
      const otherClass = relsTmpl[name];
      const rel: TableRel<T, any> = Object.assign(toColumns(otherClass), {
        $left: clazz,
        $right: otherClass,
        $all: () => new AllColumns(otherClass),
      });
      rls[name] = rel;
      return rls;
    },
    {} as any
  );

  const methods = {
    $query: () => new QueryBuilder<T, T[], T>(),
    $all: () => new AllColumns(clazz),
  };

  return Object.assign(methods, columns, rels);
};
