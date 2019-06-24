import { TableRel, Connection } from './types';
import { QueryBuilder, newQuery } from './queryBuilder';
import { InOp, Literal } from './ops';

export type RelsMap<M1, RS> = {
  [K in keyof RS]: RS[K] extends TableRel<infer V, M1, infer M2> ? Map<V, M2[]> : never
};

export class RelationLoader<M, RS extends TableRel<any, M, any>[]> {
  constructor(private readonly rels: RS) {}

  async loadMaps(records: M[], conn: Connection): Promise<RelsMap<M, RS>> {
    const queries = this.rels.map(tableRel => {
      const rel = tableRel();
      const q = new QueryBuilder<M, any, any>(newQuery(rel.rightColumns()));

      // TODO: Should `rel.$rightCol.in(values)`.
      const key = rel.leftCol.toExpr().fieldName;
      const values = records.map(r => new Literal(r[key as keyof M]));
      const inExpr = new InOp(rel.rightCol, values);

      return q.where(inExpr);
    });

    // TODO: Sort by key column.

    const results = await Promise.all(queries.map(q => q.load(conn)));

    return results.map((rows, i) => {
      const rel = this.rels[i]();
      const keyField = rel.rightCol.toExpr().fieldName;
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
    }) as RelsMap<M, RS>;
  }
}
