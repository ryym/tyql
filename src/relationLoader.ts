import * as Knex from 'knex';
import { TableRel } from './tableRel';
import { QueryBuilder, newQueryDef } from './queryBuilder';

export class RelationLoader<T, RS extends TableRel<T, any>[]> {
  constructor(private readonly rels: RS) {}

  async loadMaps(records: T[], knex: Knex): Promise<RelsMap<T, RS>> {
    const queries = this.rels.map(rel => {
      const key = rel.$leftCol.fieldName;
      const values = records.map(r => r[key as keyof T]);
      const q = new QueryBuilder<any, any>(
        newQueryDef(rel.$rightCol.model, rel.$rightCol.tableName)
      );
      return q.whereRaw(kn => kn.whereIn(rel.$rightCol.identifier(), values as any[]));
    });

    // TODO: Sort by key column.

    const results = await Promise.all(queries.map(q => q.load(knex)));

    return results.map((rows, i) => {
      const rel = this.rels[i];
      const keyField = rel.$rightCol.fieldName;
      const map = new Map();
      for (let row of rows) {
        let list = map.get(row[keyField]);
        if (list == null) {
          list = [];
          map.set(row[keyField], list);
        }
        list.push(row);
      }

      return map;
    }) as RelsMap<T, RS>;
  }
}

export type RelsMap<T, RS> = {
  [K in keyof RS]: RS[K] extends TableRel<T, infer U, infer V> ? Map<V, U[]> : never
};
