import { ModelClass, ColumnList, Query, JoinDefinition } from './types';
import {
  Table,
  FieldNames,
  FieldNamesOfType,
  RelationBuilder,
  Column,
  ColumnSet,
  TableBase,
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

  const columnList: ColumnList<M> = {
    $type: 'COLUMN_LIST' as const,
    columns: () => Object.values(columns),
  };

  const base: TableBase<M> = {
    $all: () => columnList,
    $query: () => new QueryBuilder<M, M>(newQuery(columnList, tableName)),
    $rels: () => unimplemented(),
  };

  return Object.assign({}, columns, relations, base);
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
          tableName: rightModel.tyql.table,
          tableAlias,
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
