import { ModelClass, Fields } from './model';

export type ColumnConfig = {
  tableName: string;
  columnName: string;
  fieldName: string;
};

export class Column<T, V> {
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;

  constructor(readonly model: ModelClass<T>, config: ColumnConfig) {
    this.tableName = config.tableName;
    this.columnName = config.columnName;
    this.fieldName = config.fieldName;
  }

  identifier(): string {
    return `${this.tableName}.${this.columnName}`;
  }

  // TODO: Add operators.
  eq(_val: V) {}
}

export type Columns<T> = { readonly [K in keyof Fields<T>]: Column<T, T[K]> };

export class AllColumns<T> {
  readonly columns: Column<T, any>[];

  constructor(private readonly tableName: string, readonly model: ModelClass<T>) {
    const columns = toColumns(this.tableName, this.model);
    this.columns = Object.values(columns);
  }
}

export const toColumns = <T>(tableName: string, clazz: ModelClass<T>): Columns<T> => {
  const tmpl = clazz.tyql.template();
  const columns: Columns<T> = Object.getOwnPropertyNames(tmpl).reduce(
    (cols, name) => {
      cols[name] = new Column(clazz, {
        tableName,
        fieldName: name,
        columnName: name, // TODO: Convert
      });
      return cols;
    },
    {} as any
  );
  return columns;
};
