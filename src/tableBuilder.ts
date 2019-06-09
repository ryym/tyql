import {
  ModelClass,
  Selectable,
  Select,
  ValuesOf,
  AddColumn,
  Ordering,
  AliasedQuery,
  Connection,
  ResultRowType,
  ColumnList,
  Query,
  IExpr,
  JoinDefinition,
  Joinable,
} from './types';
import {
  Table,
  FieldNames,
  FieldNamesOfType,
  RelationBuilder,
  Column,
  ColumnSet,
  TableActions,
} from './table';
import { QueryBuilder } from './queryBuilder';

export const rel = <M1, M2, C2 extends FieldNames<M2>>(
  rightModel: ModelClass<M2>,
  rightColName: C2,
  leftColName: FieldNamesOfType<M1, M2[C2]>
): RelsTemplateItem<M1, M2, M2[C2]> => {
  return {
    leftColName,
    rightColName: rightColName as any,
    rightModel,
  };
};

export type RelsTemplateItem<M1, M2, V> = {
  leftColName: FieldNamesOfType<M1, V>;
  rightColName: FieldNamesOfType<M2, V>;
  rightModel: ModelClass<M2>;
};

export type RelsTemplate<M1, M2 = any, P extends keyof M2 = any> = {
  readonly [key: string]: RelsTemplateItem<M1, M2, M2[P]>;
};

export type RelationBuilders<M1, Rels> = {
  [P in keyof Rels]: Rels[P] extends RelsTemplateItem<M1, infer M2, infer V>
    ? RelationBuilder<V, M1, M2>
    : never
};

export type TableConfig<M, Rels extends RelsTemplate<M>> = {
  rels?: Rels;
};

// The syntax highlight of VSCode does not work correctly
// if we define this by arrow function :(
export function table<M, Rels extends RelsTemplate<M>>(
  modelClass: ModelClass<M>,
  config: TableConfig<M, Rels> = {}
): Table<M, RelationBuilders<M, Rels>> {
  const tableName = modelClass.tyql.table;
  const columns = newColumnSet(tableName, modelClass);
  const relations = makeRelationBuilders(tableName, columns, config.rels || ({} as Rels));

  const builder = (): TableActions<M> => {
    return new TableActionsImpl(modelClass.tyql.table, Object.values(columns));
  };

  Object.defineProperty(builder, 'name', { value: `${tableName}_builder` });

  return Object.assign(builder, columns, relations);
}

const newColumnSet = <M>(tableName: string, modelClass: ModelClass<M>): ColumnSet<M> => {
  const tmpl = modelClass.tyql.template();
  return Object.keys(tmpl).reduce(
    (cols, name) => {
      (cols as any)[name] = new Column(modelClass, {
        tableName,
        fieldName: name,
        columnName: name, // TODO: Convert
      });
      return cols;
    },
    {} as ColumnSet<M>
  );
};

const makeRelationBuilders = <M, Rels extends RelsTemplate<M>>(
  leftTableName: string,
  leftColumns: ColumnSet<M>,
  relsTmpl: Rels
) => {
  return Object.keys(relsTmpl).reduce(
    (rls, name) => {
      const { leftColName, rightColName, rightModel } = relsTmpl[name];

      const tableAlias = `${leftTableName}_${name}`;
      const rightColumns = newColumnSet(tableAlias, rightModel);
      const leftCol = (leftColumns as any)[leftColName];

      const originalRightCol = rightColumns[rightColName as any];
      const rightCol = new Column<any, any>(rightModel, {
        tableName: tableAlias,
        fieldName: originalRightCol.fieldName,
        columnName: originalRightCol.columnName,
      });

      const relBuilder: RelationBuilder<any, M, any> = Object.assign({}, rightColumns, {
        _joinable_types: null as any,
        $leftCol: leftCol,
        $rightCol: rightCol,
        $all: () => ({
          $type: 'COLUMN_LIST' as const,
          columns: () => Object.values(rightColumns),
        }),
        $toJoin: (): JoinDefinition => ({
          table: tableAlias,
          on: rightCol.eq(leftCol),
        }),
      });
      (rls as any)[name] = relBuilder;
      return rls;
    },
    {} as RelationBuilders<M, Rels>
  );
};

const unimplemented = (): any => {
  throw new Error('unimplemented');
};

export const newQuery = <M>(fromCols: ColumnList<M>, fromTable: string): Query<M> => {
  return {
    from: fromTable,
    select: null,
    defaultSelect: [fromCols],
    innerJoins: [],
    where: [],
  };
};

class TableActionsImpl<M> implements TableActions<M> {
  $type = 'COLUMN_LIST' as const;

  constructor(private readonly tableName: string, private readonly _columns: Column<any, M>[]) {}

  columns() {
    return Object.values(this._columns);
  }

  rels() {
    return unimplemented();
  }

  query(): QueryBuilder<M, M> {
    return new QueryBuilder(newQuery(this, this.tableName));
  }

  select<Sels extends Selectable<M>[]>(...sels: Sels): QueryBuilder<Select<ValuesOf<Sels>>, M> {
    return this.query().select(...sels);
  }

  innerJoin<M1 extends M, M2>(join: Joinable<M1, M2>): QueryBuilder<AddColumn<M, M2>, M | M2> {
    return this.query().innerJoin(join);
  }

  where(...preds: IExpr<boolean, M>[]): QueryBuilder<M, M> {
    return this.query().where(...preds);
  }

  groupBy(...exprs: IExpr<any, M>[]): QueryBuilder<M, M> {
    return this.query().groupBy(...exprs);
  }

  having(...preds: IExpr<boolean, M>[]): QueryBuilder<M, M> {
    return this.query().having(...preds);
  }

  orderBy(...ords: Ordering<M>[]): QueryBuilder<M, M> {
    return this.query().orderBy(...ords);
  }

  limit(n: number): QueryBuilder<M, M> {
    return this.query().limit(n);
  }

  offset(n: number): QueryBuilder<M, M> {
    return this.query().offset(n);
  }

  as(_alias: string): AliasedQuery {
    return unimplemented();
  }

  load(conn: Connection): Promise<ResultRowType<M>[]> {
    return this.query().load(conn);
  }
}
