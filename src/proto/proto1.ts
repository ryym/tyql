type Class<T> = {
  new (): T;
};

interface Column<T, V> {
  readonly model: Class<T>;
  readonly name: string;

  eq(val: V): void;
}

type Columns<T> = { readonly [K in keyof T]: Column<T, T[K]> };

type QueryBuilder<T, R extends {}> = {
  readonly $model: Class<T>;
  readonly $name: string;

  $hasMany<U, R2>(other: Table<U, R2>): TableRel<T, U, R2>;

  // XXX: この辺とカラム名が同じネームスペースにいるのはよろしくない。
  innerJoin<U, R2>(rel: TableRel<T, U, R2>): QueryBuilder<T, R & R2>;
  // innerJoin の左辺を T に固定できるとより安全にジョインが書けるけど。。

  fetch(): Promise<R>;
};

// type QueryResult<N extends string, T> = {
//     // [N]: T;
// }

class TableRel<A, B, R> {
  readonly _left!: A;
  readonly _right!: B;
  readonly result!: R;
}

type Table<T, R> = Columns<T> & QueryBuilder<T, R>;

const table = <T, R>(_clazz: Class<T>): Table<T, R> => {
  return null as any;
};

// -------------------------------------------------------------

class User {
  name!: string;
  age!: number;
}
const Users = table<User, { users: User[] }>(User);

class Post {
  title!: string;
  authorId!: number;
}
const Posts = table<Post, { posts: Post[] }>(Post);

const Rel = {
  Users: {
    Posts: Users.$hasMany(Posts),
  },
};

export async function main() {
  let ret = await Users.fetch();
  console.log(ret);

  let ret2 = await Users.innerJoin(Rel.Users.Posts).fetch();
  console.log(ret2.users, ret2.posts);
}

// Users.innerJoin(Rel.Users.Posts)

// タイプセーフにフィールド名を指定するのってできなかったか。
const useAsKey = <K extends string>(key: K) => {
  return { [key]: 1 };
};
const a = useAsKey('foo');
const b = useAsKey('bar');
console.log(a, b);

type Box<T> = { value: T };
type Boxified<T> = { [P in keyof T]: Box<T[P]> };
export type A = Boxified<[string, number]>;

type ValueOf<C> = C extends Column<any, infer R> ? R : any;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };

export const select = <VS extends any[]>(..._value: VS): ValuesOf<VS> => {
  return null as any;
};

console.log(select(Users.age, Users.name));
