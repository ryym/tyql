import { Columns, AllColumns, Column } from './column';
import { ModelClass } from './types';

export type TableRel<A, B> = Columns<B> & {
  $leftCol: Column<A, any>;
  $rightCol: Column<B, any>;
  $all(): AllColumns<B>;
};

type RelsTemplateItem<A, B> = [keyof A, [ModelClass<B>, keyof B]];

export type RelsTemplate<A, B = any> = {
  readonly [key: string]: RelsTemplateItem<A, B>;
};

export type RelsDef<A, Tmpl> = {
  [K in keyof Tmpl]: Tmpl[K] extends RelsTemplateItem<A, infer B> ? TableRel<A, B> : never
};

export type AnyRelsDef<A> = {
  [key: string]: TableRel<A, any>;
};
