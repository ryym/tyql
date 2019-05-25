type Class<T> = {
  new (): T;
};

interface Column<T, V> {
  readonly model: Class<T>;
  readonly name: string;

  eq(val: V): void;
}

type Schema<T> = { readonly [K in keyof T]: Column<T, T[K]> };

type MergeResult<R1, R2> = R1 extends Select<infer V>
  ? V
  : R1 extends [infer X, infer Y]
  ? [X, Y, R2]
  : R1 extends [infer A, infer B, infer C]
  ? [A, B, C, R2]
  : [R1, R2];

type QueryBuilder<T, Rel, R> = {
  readonly $model: Class<T>;
  readonly $name: string;

  // XXX: この辺とカラム名が同じネームスペースにいるのはよろしくない。

  // XXX: 実際には JOIN 以外を渡せないようにしないといけない。
  innerJoin<U extends Rel, R2>(
    join: QueryBuilder<U, any, R2>
  ): QueryBuilder<T, Rel, MergeResult<R, R2>>;

  select<CS extends any[]>(...cols: CS): QueryBuilder<T, Rel, Select<ValuesOf<CS>>>;

  fetch(): R;
};

type ValueOf<C> = C extends Column<any, infer R> ? R : any;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };
type Select<V> = { selects: V };

type Table<T, Rel> = Schema<T> & QueryBuilder<T, Rel, T[]>;

// type CustomJoin<T extends Schema<any>> = {
//   from: string;
//   to: [T, string];
// };

type Rels = readonly Schema<any>[];

type ModelOf<S> = S extends Schema<infer R> ? R : never;
type ModelsOf<T> = { [P in keyof T]: ModelOf<T[P]> };

type Joinables<R extends ReadonlyArray<any>> = R[number];

type TableConfig<Rel extends Rels> = {
  //   rel: Array<Schema<any> | CustomJoin<Schema<any>>>;
  rel: Rel;
};

const schema = <T>(_clazz: Class<T>): Schema<T> => {
  return null as any;
};

const table = <T, Rel extends Rels>(
  _t: Schema<T>,
  _config: TableConfig<Rel>
): Table<T, Joinables<ModelsOf<Rel>>> => {
  return null as any;
};

// -------------------------------------------------------------

class User {
  name!: string;
  age!: number;
}

class Post {
  title!: string;
  authorId!: number;
}

class Comment {
  authorId!: number;
  content!: string;
}

const users = schema(User);
const posts = schema(Post);
const comments = schema(Comment);

// XXX: proto1 と違い、関係に名前をつけられない。
// オブジェクト形式で定義できてもいいけど、クエリのビルド時には
// 特に使えない。
// すまっぴーの Invitation みたいに同じテーブルへの関係が複数あると対応できないし、
// やはり relation は proto1 に近い方法で定義できる方が便利そう。
const db = {
  users: table(users, {
    rel: [posts, comments],
  }),
  posts: table(posts, {
    rel: [comments],
  }),
  comments: table(comments, {
    rel: [users, posts],
  }),
};

// type A = Joinables<ModelsOf<[typeof posts, typeof comments]>>;

db.posts.fetch();
db.users.innerJoin(db.posts.innerJoin(db.comments)).fetch();

// 一応できるけど、JOINの数だけ conditional type が必要。
db.users
  .innerJoin(db.posts.innerJoin(db.comments))
  .innerJoin(db.comments)
  .fetch();

db.users
  .select(db.users.age, db.posts.title)
  .innerJoin(db.posts)
  .fetch();

export default null;
