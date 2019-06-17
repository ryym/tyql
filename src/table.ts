import { ModelClass, JoinDefinition, TableRel } from './types';
import { FieldNames, FieldNamesOfType, Column, Fields, ModelColumnList } from './column';
import { TableActions } from './tableActions';
import { RelationActions } from './relationActions';

// We override the type of function's build-in properties.
// This allows you to define same name properties such as 'name' and 'arguments' in your model.
// Without this, the type of these properties is inferred as an intersection type with the original
// property of a function.
export interface Defunction {
  arguments: unknown;
  bind: unknown;
  call: unknown;
  caller: unknown;
  length: unknown;
  name: unknown;
  prototype: unknown;
  toString: unknown;
}

const defunc = <F extends Function>(f: F, name?: string): F => {
  BUILTIN_FUNCTION_PROPS.forEach(prop => {
    Object.defineProperty(f, prop, {
      value: undefined,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  });
  if (name) {
    Object.defineProperty(f, 'name', { value: name });
  }
  return f;
};

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

export type ColumnSet<M> = { readonly [K in keyof Fields<M>]: Column<M[K], M> };

export interface RelationBuilderBase<M> extends Defunction {
  (): RelationActions<M>;
}

export type RelationBuilder<V, M1, M2> = RelationBuilderBase<M2> &
  ColumnSet<M2> &
  TableRel<V, M1, M2>;

type AnyRelationBuilders<M> = {
  [key: string]: RelationBuilder<any, M, any>;
};

export interface TableBase<M> extends Defunction {
  (): TableActions<M>;
}

export type Table<M, Rels extends AnyRelationBuilders<M>> = TableBase<M> & Rels & ColumnSet<M>;

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

const BUILTIN_FUNCTION_PROPS = [
  'arguments',
  'bind',
  'call',
  'caller',
  'length',
  'name',
  'prototype',
  'toString',
];

// The syntax highlight of VSCode does not work correctly
// if we define this by arrow function :(
export function table<M, Rels extends RelsTemplate<M>>(
  modelClass: ModelClass<M>,
  config: TableConfig<M, Rels> = {}
): Table<M, RelationBuilders<M, Rels>> {
  const tableName = modelClass.tyql.table;
  const columnList = new ModelColumnList(modelClass);
  const columnSet = newColumnSet(columnList);
  const relations = makeRelationBuilders(tableName, columnSet, config.rels || ({} as Rels));

  const base = defunc(() => new TableActions(columnList), `${tableName}_builder`);
  return Object.assign(base, columnSet, relations);
}

const newColumnSet = <M>(columnList: ModelColumnList<M>): ColumnSet<M> => {
  return columnList.columns().reduce(
    (cols, col) => {
      (cols as any)[col.fieldName] = col;
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
      const rightColumnList = new ModelColumnList(rightModel, tableAlias);
      const rightColumnSet = newColumnSet(rightColumnList);
      const leftCol = (leftColumns as any)[leftColName];

      const originalRightCol = rightColumnSet[rightColName as any];
      const rightCol = new Column<any, any>(rightModel, {
        tableName: tableAlias,
        fieldName: originalRightCol.fieldName,
        columnName: originalRightCol.columnName,
      });

      const base = defunc(() => new RelationActions(rightColumnList), `${tableAlias}_builder`);

      const relBuilder: RelationBuilder<any, M, any> = Object.assign(base, rightColumnSet, {
        _joinable_types: null as any,
        $leftCol: leftCol,
        $rightCol: rightCol,
        $all: () => rightColumnList,
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
