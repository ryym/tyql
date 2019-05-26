import { ModelClass } from './types';

export class Column<T, V> {
  constructor(readonly _model: ModelClass<T>, readonly name: string) {}

  // TODO: Add operators.
  eq(_val: V) {}
}

export type Columns<T> = { readonly [K in keyof T]: Column<T, T[K]> };

export class AllColumns<T> {
  constructor(private readonly clazz: ModelClass<T>) {}

  columns(): Columns<T> {
    return toColumns(this.clazz);
  }
}

export const toColumns = <T>(clazz: ModelClass<T>): Columns<T> => {
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
