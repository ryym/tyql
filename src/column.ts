import { Ordering, ModelClass, IColumn, ColumnExpr, iexprPhantomTypes, ColumnList } from './types';
import { Ops } from './ops';

type MethodNames<T> = { [P in keyof T]: T[P] extends Function ? P : never }[keyof T];

export type FieldNames<T> = Exclude<keyof T, MethodNames<T>>;

export type Fields<T> = { [P in FieldNames<T>]: T[P] };

export type FieldNamesOfType<T, V> = {
  [P in FieldNames<T>]: T[P] extends V | null | undefined ? P : never
}[FieldNames<T>];

export class Column<V, M> extends Ops<V, M> implements IColumn<V, M> {
  readonly $type = 'EXPR' as const;
  readonly _iexpr_types = iexprPhantomTypes<V, M>();

  readonly modelClass: ModelClass<M>;
  readonly tableName: string;
  readonly columnName: string;
  readonly fieldName: string;

  constructor(modelClass: ModelClass<M>, conf: ColumnConfig) {
    super();
    this.modelClass = modelClass;
    this.tableName = conf.tableName;
    this.columnName = conf.columnName;
    this.fieldName = conf.fieldName;
  }

  toExpr(): ColumnExpr {
    return {
      $exprType: 'COLUMN',
      tableName: this.tableName,
      columnName: this.columnName,
      fieldName: this.fieldName,
    };
  }

  asc(): Ordering<M> {
    throw new Error('unimplemented');
  }

  desc(): Ordering<M> {
    throw new Error('unimplemented');
  }
}

export type ColumnConfig = {
  tableName: string;
  columnName: string;
  fieldName: string;
};

export class ModelColumnList<M> implements ColumnList<M> {
  $type = 'COLUMN_LIST' as const;

  private readonly _columns: Column<any, M>[];

  constructor(private readonly modelClass: ModelClass<M>, private readonly _tableAlias?: string) {
    const tmpl = modelClass.tyql.template();
    const convert = modelClass.tyql.columnNameRule;
    this._columns = Object.keys(tmpl).map(name => {
      return new Column(modelClass, {
        tableName: _tableAlias || this.tableName(),
        fieldName: name,
        columnName: convert ? convert(name) : name,
      });
    });
  }

  tableAlias(): string | undefined {
    return this._tableAlias;
  }

  tableName(): string {
    return this.modelClass.tyql.table;
  }

  columns(): Column<any, M>[] {
    return this._columns;
  }
}

// Simple implementation.
export const camelToSnake = (word: string): string => {
  let snake = '';
  for (let c of word) {
    const lowerC = c.toLowerCase();
    if (c === lowerC) {
      snake += c;
    } else {
      snake += `_${lowerC}`;
    }
  }
  return snake;
};
