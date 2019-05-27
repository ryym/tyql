import { Columns, AllColumns, Column } from './column';
import { ModelClass, FieldNames } from './model';

export type TableRel<A, B> = Columns<B> & {
  $leftCol: Column<A, any>;
  $rightCol: Column<B, any>;
  $all(): AllColumns<B>;
};

// XXX: I want to change `keyof B` to `FieldNames<B>` but it breaks the type inference
// at the table relations definition. So we need to force users to use `to` function to
// define the relations.
export type RelsTemplateItem<A, B> = readonly [FieldNames<A>, [ModelClass<B>, keyof B]];

export type RelsTemplate<A, B = any> = {
  readonly [key: string]: RelsTemplateItem<A, B>;
};

export type RelsDef<A, Tmpl> = {
  [K in keyof Tmpl]: Tmpl[K] extends RelsTemplateItem<A, infer B> ? TableRel<A, B> : never
};

export type AnyRelsDef<A> = {
  [key: string]: TableRel<A, any>;
};
