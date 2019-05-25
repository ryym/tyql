export default null;

type TableDef = {
  name: string;
};

type AsTable = {
  asTable(): TableDef;
};

type ModelClass<T> = AsTable & {
  new (): T;
};

// type ModelOf<M> = M extends ModelClass<infer T> ? T : never;

interface Column<T, V> {
  readonly model: ModelClass<T>;
  readonly name: string;

  eq(val: V): void;
}
type AllColumns<T> = {
  _type: T;
};

type Columns<T> = { readonly [K in keyof T]: Column<T, T[K]> };

type ValueOf<C> = C extends Column<any, infer R>
  ? R
  : C extends AllColumns<infer T>
  ? T[]
  : never;
type ValuesOf<T> = { [P in keyof T]: ValueOf<T[P]> };
type Select<V> = { selects: V };

type Flatten<R1, R2> = R1 extends Select<infer V>
  ? V
  : R1 extends [infer T1, infer T2]
  ? [T1, T2, R2]
  : R1 extends [infer T1, infer T2, infer T3]
  ? [T1, T2, T3, R2]
  : [R1, R2];

type QueryBuilder<From, Models, R> = {
  readonly $model: ModelClass<From>;

  innerJoin<A extends Models, B>(
    rel: TableRel<A, B>
  ): QueryBuilder<From, Models | B, Flatten<R, B[]>>;

  // こちらの絞り込みの利便性を考えると、 Models は User | Post 形式の方がいい？
  select<CS extends (AllColumns<Models> | Column<Models, any>)[]>(
    ...cols: CS
  ): QueryBuilder<From, Models, Select<ValuesOf<CS>>>;

  fetch(): R;
};

type TableRel<A, B> = {
  $phantom?: [A, B];
} & Columns<B>;

type RelsConf = {
  [key: string]: ModelClass<any>;
};

type RelsDef<T> = {
  [key: string]: TableRel<T, any>;
};

type RelsDefFrom<T, Conf> = {
  [K in keyof Conf]: Conf[K] extends ModelClass<infer U> ? TableRel<T, U> : never
};

type SchemaConf<Rels extends RelsConf> = {
  rels: Rels;
};

type Schema<T, Rels extends RelsDef<T>> = Columns<T> &
  Rels & {
    $model: ModelClass<T>;
    $query: () => QueryBuilder<T, T, T[]>;

    $fromRel<U>(rel: TableRel<U, T>, records: U[]): QueryBuilder<T, T, T[][]>;

    $all: () => AllColumns<T>;
  };

const schema = <T, Rels extends RelsConf>(
  _clazz: ModelClass<T>,
  _conf: SchemaConf<Rels>
): Schema<T, RelsDefFrom<T, Rels>> => {
  return null as any;
};

const table = (name: string): TableDef => ({ name });

class User {
  static asTable = () => table('users');

  name!: string;
  age!: number;
}

class Post {
  static asTable = () => table('posts');

  authorId!: number;
  title!: string;
}

class Comment {
  static asTable = () => table('comments');

  authorId!: number;
  content!: string;
}

const t = {
  users: schema(User, {
    rels: {
      posts: Post,
      comments: Comment,
    },
  }),

  posts: schema(Post, {
    rels: {
      author: User,
      comments: Comment,
    },
  }),

  comments: schema(Comment, {
    rels: {
      author: User,
      post: Post,
    },
  }),
};

t.users
  .$query()
  .innerJoin(t.users.posts)
  .innerJoin(t.posts.comments);
//   .innerJoin(t.posts.author)
//   .innerJoin(t.posts.comments)
//   .fetch();

t.users.$query().fetch();
t.users.$query().select(t.users.name, t.users.age);
t.users
  .$query()
  .innerJoin(t.users.posts)
  // XXX: t.posts.title でも通っちゃう。それは他の結合も同じだしさすがにしょうがないか。
  .select(t.users.$all(), t.users.posts.title);

const users: User[] = [];
t.posts.$fromRel(t.users.posts, users);
