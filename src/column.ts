import { ModelClass, Fields } from './model';
import { MayHaveModel } from './types';
import { Ops } from './ops';

export type ColumnConfig = {
  tableName: string;
  columnName: string;
  fieldName: string;
};

export class Column<M, V> extends Ops<V, M> {
  readonly $type = 'COLUMN';
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;

  constructor(readonly model: ModelClass<M>, config: ColumnConfig) {
    super();
    this.tableName = config.tableName;
    this.columnName = config.columnName;
    this.fieldName = config.fieldName;
  }

  modelClass(): ModelClass<M> {
    return this.model;
  }

  identifier(): string {
    return `${this.tableName}.${this.columnName}`;
  }
}

export type Columns<T> = { readonly [K in keyof Fields<T>]: Column<T, T[K]> };

export class ColumnList<M> implements MayHaveModel<M> {
  readonly $type = 'COLUMN_LIST';
  readonly columns: Column<M, any>[];

  constructor(private readonly tableName: string, readonly model: ModelClass<M>) {
    const columns = toColumns(this.tableName, this.model);
    this.columns = Object.values(columns);
  }

  modelClass(): ModelClass<M> {
    return this.model;
  }
}

export const toColumns = <T>(tableName: string, clazz: ModelClass<T>): Columns<T> => {
  const tmpl = clazz.tyql.template();
  const columns: Columns<T> = Object.keys(tmpl).reduce(
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
