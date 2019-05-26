import { ModelClass } from './types';
import { TableRel } from './tableRel';
import { AllColumns, Column } from './column';

export class QueryBuilder<From, R, Models> {
  _phantom?: ModelClass<From>;
  constructor(private data: string[] = []) {}

  innerJoin<A extends Models, B>(
    rel: TableRel<A, B>
  ): QueryBuilder<From, ToQueryResult<R, B[]>, Models | B> {
    const data = this.data.concat(
      `inner join: ${rel.$left.tableDef().name} + ${rel.$right.tableDef().name}`
    );
    return new QueryBuilder(data);
  }

  select<CS extends (AllColumns<Models> | Column<Models, any>)[]>(
    ...cols: CS
  ): QueryBuilder<From, Select<ValuesOf<CS>>, Models> {
    let msg = 'select ';
    cols.forEach(col => {
      if (col instanceof AllColumns) {
        msg += Object.keys(col.columns()).join(' ');
      } else {
        msg += `${col.name} `;
      }
    });
    return new QueryBuilder(this.data.concat(msg));
  }

  fetch(): Promise<R> {
    return null as any; // TODO
  }
}

type ValueOf<C> = C extends Column<any, infer V>
  ? V
  : C extends AllColumns<infer T>
  ? T[]
  : never;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };
export type Select<V> = { selects: V };

type ToQueryResult<R1, R2> = R1 extends Select<infer V>
  ? V
  : R1 extends [infer T1, infer T2]
  ? [T1, T2, R2]
  : R1 extends [infer T1, infer T2, infer T3]
  ? [T1, T2, T3, R2]
  : [R1, R2];
