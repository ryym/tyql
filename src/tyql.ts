export interface TableDefinition {
  readonly name: string;
}

export const tableDef = (name: string): TableDefinition => {
  return { name };
};

export interface ModelClass<T> {
  tableDef(): TableDefinition;
  template(): T;
}

export class Column<T, V> {
  constructor(readonly _model: ModelClass<T>, readonly name: string) {}

  // TODO: Add operators.
  eq(_val: V) {}
}

export class AllColumns<T> {
  constructor(private readonly clazz: ModelClass<T>) {}

  columns(): Columns<T> {
    return toColumns(this.clazz);
  }
}

export type Columns<T> = { readonly [K in keyof T]: Column<T, T[K]> };

export type SelectMethods<T> = {
  $all(): AllColumns<T>;
};

export type Schema<T, Rels extends AnyRelsDef<T>> = Columns<T> &
  Rels &
  SelectMethods<T> & {
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

const toColumns = <T>(clazz: ModelClass<T>): Columns<T> => {
  const tmpl = clazz.template();
  const columns: Columns<T> = Object.getOwnPropertyNames(tmpl).reduce(
    (cols, name) => {
      cols[name] = new Column(clazz, name);
      return cols;
    },
    {} as any
  );
  return columns;
};

export type TableRel<A, B> = Columns<B> &
  SelectMethods<B> & {
    $left: ModelClass<A>;
    $right: ModelClass<B>;
  };

export type RelsTemplate = {
  readonly [key: string]: ModelClass<any>;
};

export type RelsDef<A, Tmpl> = {
  [K in keyof Tmpl]: Tmpl[K] extends ModelClass<infer B> ? TableRel<A, B> : never
};

export type AnyRelsDef<A> = {
  [key: string]: TableRel<A, any>;
};

export class QueryBuilder<From, R, Models> {
  _phantom?: ModelClass<From>;
  constructor(private data: string[] = []) {}

  innerJoin<A extends Models, B>(
    rel: TableRel<A, B>
  ): QueryBuilder<From, ToQueryResult<R, B[]>, Models | B> {
    const data = this.data.concat(
      `inner join: ${rel.$left.tableDef().name} + ${rel.$right.tableDef().name}`
    );
    return new QueryBuilder(data);
  }

  select<CS extends (AllColumns<Models> | Column<Models, any>)[]>(
    ...cols: CS
  ): QueryBuilder<From, Select<ValuesOf<CS>>, Models> {
    let msg = 'select ';
    cols.forEach(col => {
      if (col instanceof AllColumns) {
        msg += Object.keys(col.columns()).join(' ');
      } else {
        msg += `${col.name} `;
      }
    });
    return new QueryBuilder(this.data.concat(msg));
  }

  fetch(): Promise<R> {
    return null as any; // TODO
  }
}

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
