import * as Knex from 'knex';
import { table, to } from './tyql';

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

const withDb = (knex: Knex) => async (proc: Function) => {
  try {
    await proc(knex);
  } finally {
    knex.destroy();
  }
};

const knex = Knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'ryu',
    database: 'tyql_sample',
  },
});
withDb(knex)(async (knex: Knex) => {
  let q = t.users
    .$query() //.select(t.users.email);
    .innerJoin(t.users.posts)
    .select(t.users.user_name, t.users.posts.$all(), t.users.created_at, t.users.$all());

  const result = await q.load(knex);
  console.log(result[0]);
  console.log('----------------');

  let users = await t.users.$query().load(knex);
  console.log(users[0]);
  console.log('----------------');

  let result2 = await t.users
    .$query()
    .innerJoin(t.users.posts)
    .load(knex);
  console.log(result2[0]);

  const rs = await t.users.$rels(t.users.posts, t.users.comments).loadMaps(users, knex);
  console.log(rs);
  // const rs2 = await t.posts.$loadRels(knex, posts, t.posts.tmp, t.posts.author);
  // console.log(rs2);

  console.log('----end-----');
});

// TODO: 次は fromRel の実現性を確認する。
