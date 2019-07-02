import * as Knex from 'knex';
import { Connection as IConnection, Query } from './types';
import { runQuery, BuildContext, constructQuery } from './queryRunner';

export type Quote = (identifier: string) => string;

export enum Db {
  POSTGRES = 'pg',
  MYSQL = 'mysql',
}

export type Config = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
};

export class Connection implements IConnection {
  private readonly context: BuildContext;

  constructor(db: Db, config: Config) {
    const knexConfig: Knex.Config = {
      client: db,
      connection: config,
    };
    const knex = Knex(knexConfig);
    const quote = getQuoteFunc(knexConfig);
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
