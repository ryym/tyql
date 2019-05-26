import * as Knex from 'knex';
import { tableDef, schema, to } from './tyql';

class User {
  static tableDef = () => tableDef('users');
  static template = () => new User('taro', 'taro@hoge.com', new Date());

  readonly id: number | null = null;

  constructor(public user_name: string, public email: string, public created_at: Date) {}
}

class Post {
  static tableDef = () => tableDef('posts');
  static template = () => new Post();

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
  const q = t.users
    .$query()
    .innerJoin(t.users.posts)
    .select(t.users.user_name, t.users.posts.$all());
  // .select(t.users.$all());
  //   console.log(q);

  const result = await q.load(knex);
  console.log(result);
});
