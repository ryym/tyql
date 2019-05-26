import { Columns, AllColumns } from './column';
import { ModelClass } from './types';

export type TableRel<A, B> = Columns<B> & {
  $left: ModelClass<A>;
  $right: ModelClass<B>;
  $all(): AllColumns<B>;
};

export type RelsTemplate = {
  readonly [key: string]: ModelClass<any>;
};

export type RelsDef<A, Tmpl> = {
  [K in keyof Tmpl]: Tmpl[K] extends ModelClass<infer B> ? TableRel<A, B> : never
};

export type AnyRelsDef<A> = {
  [key: string]: TableRel<A, any>;
};
