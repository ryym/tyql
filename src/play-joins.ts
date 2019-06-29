import { table, to } from './table';
import { KnexConnection } from './connection';

// const conn = {
//   runQuery: (): any => null,
//   toSQL: (): any => null,
// };

class A {
  static tyql = {
    table: 'as',
    template: () => new A(),
  };
  public a: number = 0;
}

class B {
  static tyql = {
    table: 'bs',
    template: () => new B(),
  };
  public b: number = 0;
}

class C {
  static tyql = {
    table: 'cs',
    template: () => new C(),
  };
  public c: number = 0;
}

class D {
  static tyql = {
    table: 'ds',
    template: () => new D(),
  };
  public d: number = 0;
}

export const As = table(A, {
  rels: {
    bs: to(B, 'b', 'a'),
    cs: to(C, 'c', 'a'),
  },
});

export const Bs = table(B, {
  rels: {
    cs: to(C, 'c', 'b'),
    ds: to(D, 'd', 'b'),
  },
});

export const Cs = table(C, {
  rels: {
    ds: to(D, 'd', 'c'),
  },
});

export const conn = new KnexConnection({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'ryu',
    database: 'tyql_sample',
  },
});

export const joinCheck = () => {
  /*
  FROM as
  INNER JOIN bs as as_bs ON as.a = as_bs.b
  INNER JOIN cs as bs_cs ON as_bs.b = bs_cs.c
  INNER JOIN ds as cs_ds ON bs_cs.c = cs_ds.d
  INNER JOIN ds as bs_ds ON as_bs.b = bs_ds.d
  INNER JOIN cs as as_cs ON as.a = as_cs.c
  */

  const q = As()
    .innerJoin(
      As.bs()
        .innerJoin(Bs.cs().innerJoin(Cs.ds))
        .innerJoin(Bs.ds)
    )
    .innerJoin(As.cs);

  console.log(...q.toSQL(conn));
};
joinCheck();
