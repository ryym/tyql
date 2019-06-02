import { table, to } from './tyql';
import { Selectable, Expr } from './types';
import { Connection } from './conn';

class User {
  static tyql = {
    table: 'users',
    template: () => new User('taro', 'taro@hoge.com', new Date()),
  };

  readonly id: number | null = null;

  constructor(public user_name: string, public email: string, public created_at: Date) {}

  greet() {
    return `Hello, I am ${this.user_name}.`;
  }
}

class Post {
  static tyql = {
    table: 'posts',
    template: () => new Post(),
  };

  readonly id: number | null = null;
  author_id: number = 0;
  title: string = '';
  content: string = '';

  doSomething() {}
}

class Comment {
  static tyql = {
    table: 'comments',
    template: () => new Comment(),
  };

  readonly id: number | null = null;
  commenter_id: number = 0;
  content: string = '';
}

// 個々は独立してるんだから、実際には1つのオブジェクトにまとめなくても別にいい。
// Users, Posts のようにルートだけ大文字にすれば、間違った使用を減らせそう。
const t = {
  users: table(User, {
    rels: {
      posts: ['id', to(Post, 'author_id')],
      comments: ['id', to(Comment, 'commenter_id')],
    },
  }),
  posts: table(Post, {
    rels: {
      author: ['author_id', to(User, 'id')],
      tmp: ['content', to(Comment, 'content')],
    },
  }),
  comments: table(Comment, {
    rels: {
      commenter: ['commenter_id', to(User, 'id')],
    },
  }),
};

const withDb = (conn: Connection) => async (proc: Function) => {
  try {
    await proc(conn);
  } finally {
    conn.destroy();
  }
};

const knexConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'ryu',
    database: 'tyql_sample',
  },
};

const conn = new Connection(knexConfig);

withDb(conn)(async (conn: Connection) => {
  //

  let q = t.users
    .$query() //.select(t.users.email);
    .innerJoin(t.users.posts)
    .select(t.users.user_name, t.users.posts.$all(), t.users.created_at, t.users.$all());
  const result = await q.load(conn);
  console.log(result[0]);
  console.log('----------------');

  function hoge(_v: Selectable<User>) {}
  hoge(t.users.id);
  let a: Expr<number | null, User> = t.users.id;
  let b = t.users.id.eq(t.users.id);
  console.log(a, b);
  hoge(t.users.id.eq(t.users.id).eq(t.users.id.eq(t.users.id)));
  // hoge(t.comments.id)

  let users = await t.users.$query().load(conn);
  console.log(users[0]);
  console.log('----------------');

  let result2 = await t.users
    .$query()
    .innerJoin(t.users.posts)
    .load(conn);
  console.log(result2[0]);

  const rs = await t.users.$rels(t.users.posts, t.users.comments).loadMaps(users, conn);
  console.log(rs);

  console.log('----end-----');
});
