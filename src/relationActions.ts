import { TableRelDefinition, Joiner, Append, JoinChain, Joinable, JoinConditioner } from './types';
import { ModelColumnList, Column, ColumnMap } from './column';

export class RelationActions<V, M1, M2> implements TableRelDefinition<V, M1, M2> {
  $type = 'JOINABLE' as const;
  _joinable_types: [M2, M1, M2] = null as any;

  private innerJoins: Joinable<any, M2, any, any>[] = [];

  constructor(
    readonly _leftTable: ColumnMap<M1>,
    readonly _rightTable: ColumnMap<M2>,
    readonly leftCol: Column<V, M1>,
    readonly rightCol: Column<V, M2>,
    readonly joinCondition: JoinConditioner<M1, M2>,
    private readonly columnList: ModelColumnList<M2>
  ) {}

  rightColumns = () => {
    return this.columnList;
  };

  leftTable = () => this._leftTable;
  rightTable = () => this._rightTable;

  joins = () => {
    return this.innerJoins;
  };

  innerJoin = <R2, Ms2>(
    join: Joiner<R2, M2, any, Ms2>
  ): JoinChain<Append<M2, R2>, M1, M2, M2 | Ms2> => {
    this.innerJoins.push({
      ...join(),
      leftTable: this.rightTable,
    });

    const joinChainBase = (): Joinable<Append<M2, R2>, M1, M2, M2 | Ms2> => ({
      $type: 'JOINABLE' as const,
      _joinable_types: null as any,
      rightColumns: this.rightColumns,
      leftTable: this.leftTable,
      rightTable: this.rightTable,
      joinCondition: this.joinCondition,
      joins: this.joins,
      innerJoin: this.innerJoin as any,
    });

    const joinChain = Object.assign(joinChainBase, {
      innerJoin: <R3, Ms3>(
        join: Joiner<R3, any, any, any>
      ): JoinChain<any, M1, M2, M2 | Ms2 | Ms3> => {
        return this.innerJoin(join);
      },
    });

    return joinChain;
  };

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
