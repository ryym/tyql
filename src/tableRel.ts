import { Columns, AllColumns, Column } from './column';
import { ModelClass, FieldNames } from './model';

export type TableRel<A, B, V = any> = Columns<B> & {
  $leftCol: Column<A, V>;
  $rightCol: Column<B, V>;
  $all(): AllColumns<B>;
};

export type RelsTo<T, V> = {
  model: ModelClass<T>;
  column: keyof T;
  _phantom?: V;
};

// XXX: I want to change `keyof B` to `FieldNames<B>` but it breaks the type inference
// at the table relations definition. So we need to force users to use `to` function to
// define the relations.
export type RelsTemplateItem<A, B, V> = readonly [FieldNames<A>, RelsTo<B, V>];

export type RelsTemplate<A, B = any, P extends keyof B = any> = {
  readonly [key: string]: RelsTemplateItem<A, B, B[P]>;
};

export type RelsDef<A, Tmpl> = {
  [K in keyof Tmpl]: Tmpl[K] extends RelsTemplateItem<A, infer B, infer V>
    ? TableRel<A, B, V>
    : never
};

export type AnyRelsDef<A> = {
  [key: string]: TableRel<A, any>;
};
