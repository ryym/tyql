import { ColumnList } from './types';
import { ModelColumnList, Column } from './column';

export class RelationActions<M> implements ColumnList<M> {
  $type = 'COLUMN_LIST' as const;

  constructor(private readonly columnList: ModelColumnList<M>) {}

  columns(): Column<any, M>[] {
    return this.columnList.columns();
  }

  tableName(): string {
    return this.columnList.tableName();
  }

  tableAlias() {
    return this.columnList.tableAlias();
  }
}
