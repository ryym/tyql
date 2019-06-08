import * as Knex from 'knex';
import { Connection, Query } from './types';
import { runQuery } from './queryRunner';

export type Quote = (identifier: string) => string;

// TODO: Hide Knex as an implementation detail.
export class KnexConnection implements Connection {
  readonly knex: Knex;
  readonly quote: Quote;

  constructor(config: Knex.Config) {
    const knex = Knex(config);
    this.knex = knex;
    this.quote = getQuoteFunc(config);
  }

  async runQuery(query: Query<any>): Promise<any> {
    const context = { knex: this.knex, quote: this.quote };
    return runQuery(query, context);
  }

  close() {
    this.knex.destroy();
  }
}

const getQuoteFunc = (config: Knex.Config): Quote => {
  let quote: Quote | null = null;

  // HACK: Acquire the wrapIdentifier (quote) function used in knex.
  const tmpKnex = Knex({
    ...config,
    wrapIdentifier: (value, knexQuote) => {
      quote = knexQuote;
      return knexQuote(value);
    },
  });

  tmpKnex.select('identifier').toString();
  if (quote == null) {
    throw new Error('Could not extract identifier wrapper function from Knex.js');
  }
  return quote;
};
