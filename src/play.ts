import * as Knex from 'knex';
import { modelConfig, schema, to } from './tyql';

class User {
  static tyql = modelConfig({
    table: 'users',
    template: () => new User('taro', 'taro@hoge.com', new Date()),
  });

  readonly id: number | null = null;

  constructor(public user_name: string, public email: string, public created_at: Date) {}
}

class Post {
  static tyql = modelConfig({
    table: 'posts',
    template: () => new Post(),
  });

  readonly id: number | null = null;
  author_id: number = 0;
  title: string = '';
  content: string = '';
}

// 個々は独立してるんだから、実際には1つのオブジェクトにまとめなくても別にいい。
const t = {
  users: schema(User, {
    rels: {
      posts: ['id', to(Post, 'author_id')],
    },
  }),
  posts: schema(Post, {
    rels: {
      author: ['author_id', to(User, 'id')],
    },
  }),
};

console.log(t);

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
  console.log(result);
  console.log('----------------');

  let users = await t.users.$query().load(knex);
  console.log(users);
  console.log('----------------');

  let result2 = await t.users
    .$query()
    .innerJoin(t.users.posts)
    .load(knex);
  console.log(result2);
});

// TODO: 次は fromRel の実現性を確認する。
