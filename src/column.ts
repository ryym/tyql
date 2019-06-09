import { Ordering, ModelClass, IColumn, ColumnExpr, iexprPhantomTypes } from './types';
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
