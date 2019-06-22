import { TableRelDefinition, Joiner, Append, JoinChain } from './types';
import { ModelColumnList, Column } from './column';

export class RelationActions<V, M1, M2> implements TableRelDefinition<V, M1, M2> {
  $type = 'JOINABLE' as const;
  _joinable_types: [M2, M1, M2] = null as any;

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

  innerJoin<R2, Ms2>(
    _joins: Joiner<R2, M2, any, Ms2>
  ): JoinChain<Append<M2, R2>, M1, M2, M2 | Ms2> {
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
