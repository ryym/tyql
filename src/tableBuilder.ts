import { ModelClass, TableRel } from './types';
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
import { newQuery } from './query';

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

  const builder = () => makeTableActions(modelClass, columns);
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

      const builder = (): TableRel<any, M, any> => {
        return {
          leftCol,
          rightCol,
          columns: () => Object.values(rightColumns),
          on: null as any, // TODO
        };
      };
      Object.defineProperty(builder, 'name', { value: `${tableAlias}_builder` });
      (rls as any)[name] = Object.assign(builder, rightColumns);
      return rls;
    },
    {} as RelationBuilders<M, Rels>
  );
};

const makeTableActions = <M>(modelClass: ModelClass<M>, columns: ColumnSet<M>): TableActions<M> => {
  const todo = (): any => {
    throw new Error('unimplemented');
  };
  const query = () => new QueryBuilder<M, M>(newQuery(modelClass));
  return {
    columns: () => Object.values(columns),
    rels: () => todo(),
    as: () => todo(),
    query,
    select: (...sels) => query().select(...sels),
    innerJoin: join => query().innerJoin(join),
    where: (...preds) => query().where(...preds),
    groupBy: (...keys) => query().groupBy(...keys),
    having: (...exprs) => query().having(...exprs),
    orderBy: (...orders) => query().orderBy(...orders),
    limit: n => query().limit(n),
    offset: n => query().offset(n),
    load: conn => query().load(conn),
  };
};
