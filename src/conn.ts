import * as Knex from 'knex';

type Quote = (identifier: string) => string;

const getQuoteFunc = (config: Knex.Config): Quote => {
  let quote: Quote | null = null;
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

// TODO: Hide Knex as an implementation detail.
export class Connection {
  readonly knex: Knex;
  readonly quote: Quote;

  constructor(config: Knex.Config) {
    const knex = Knex(config);
    this.knex = knex;
    this.quote = getQuoteFunc(config);
  }

  queryBuilder(): Knex.QueryBuilder {
    return this.knex.select();
  }

  destroy() {
    this.knex.destroy();
  }
}
