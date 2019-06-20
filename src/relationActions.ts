import { ColumnList, TableRelDefinition, Joiner } from './types';
import { ModelColumnList, Column } from './column';

export class RelationActions<V, M1, M2> implements ColumnList<M2>, TableRelDefinition<V, M1, M2> {
  $type = 'COLUMN_LIST' as const;
  _joinable_types: [M2, M1] = null as any;

  constructor(
    readonly leftCol: Column<V, M1>,
    readonly rightCol: Column<V, M2>,
    private readonly columnList: ModelColumnList<M2>
  ) {}

  rightColumns() {
    return this.columnList;
  }

  on() {
    return this.rightCol.eq(this.leftCol);
  }

  joins() {
    return []; // XXX
  }

  innerJoin<M3>(_joins: Joiner<any, M2, M3>): Joiner<any, M1, M2 | M3> {
    return null as any; // XXX
  }

  columns(): Column<any, M2>[] {
    return this.columnList.columns();
  }

  tableName(): string {
    return this.columnList.tableName();
  }

  tableAlias() {
    return this.columnList.tableAlias();
  }
}
