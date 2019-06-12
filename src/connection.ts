import * as Knex from 'knex';
import { Connection, Query } from './types';
import { runQuery, BuildContext, constructQuery } from './queryRunner';

export type Quote = (identifier: string) => string;

// TODO: Hide Knex as an implementation detail.
export class KnexConnection implements Connection {
  private readonly context: BuildContext;

  constructor(config: Knex.Config) {
    const knex = Knex(config);
    const quote = getQuoteFunc(config);
    this.context = { knex, quote };
  }

  async runQuery(query: Query<any>): Promise<any> {
    return runQuery(query, this.context);
  }

  toSQL(query: Query<any>): [string, any[]] {
    const q = constructQuery(this.context.knex.select(), query, this.context);
    const sql = q.toSQL();
    return [sql.sql, sql.bindings];
  }

  close() {
    this.context.knex.destroy();
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
