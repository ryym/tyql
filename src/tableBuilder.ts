import { ModelClass } from './types';
import { Table, FieldNames, FieldNamesOfType, RelationBuilder } from './table';

export const rel = <M1, M2, C2 extends FieldNames<M2>>(
  _table2: ModelClass<M2>,
  _field2: C2,
  _field1: FieldNamesOfType<M1, M2[C2]>
): RelsTemplateItem<M1, M2, M2[C2]> => {
  return null as any;
};

export type RelsTemplateItem<M1, M2, V> = {
  leftCol: FieldNamesOfType<M1, V>;
  rightCol: FieldNamesOfType<M2, V>;
  rightModel: ModelClass<M2>;
};

export type RelsTemplate<A, B = any, P extends keyof B = any> = {
  readonly [key: string]: RelsTemplateItem<A, B, B[P]>;
};

export type RelationBuilders<M1, Tmpl> = {
  [K in keyof Tmpl]: Tmpl[K] extends RelsTemplateItem<M1, infer M2, infer V>
    ? RelationBuilder<V, M1, M2>
    : never
};

export type TableConfig<T, Rels extends RelsTemplate<T>> = {
  rels?: Rels;
};

// The syntax highlight of VSCode does not work correctly
// if we define this by arrow function :(
export function table<M, Rels extends RelsTemplate<M>>(
  _clazz: ModelClass<M>,
  _config: TableConfig<M, Rels> = {}
): Table<M, RelationBuilders<M, Rels>> {
  return null as any;
}