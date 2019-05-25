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

export class Column<T> {
  constructor(readonly table: TableDefinition, readonly name: string) {}

  // TODO: Add operators.
  eq(_val: T) {}
}

export type Columns<T> = { readonly [K in keyof T]: Column<T[K]> };

export type Schema<T> = Columns<T> & {
  $query(): void;
};

export const schema = <T>(clazz: ModelClass<T>): Schema<T> => {
  const table = clazz.tableDef();
  const tmpl = clazz.template();
  const columns: Columns<T> = Object.getOwnPropertyNames(tmpl).reduce(
    (cols, name) => {
      cols[name] = new Column(table, name);
      return cols;
    },
    {} as any
  );

  return Object.assign({ $query() {} }, columns);
};
