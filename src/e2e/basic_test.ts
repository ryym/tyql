const fs = require('fs');
const path = require('path');

import { table, to, Connection, Db, camelToSnake } from '../';

type Fields<T> = { [P in FieldNames<T>]: T[P] };

type FieldNames<T> = { [P in keyof T]: T[P] extends (...args: any[]) => any ? never : P }[keyof T];

class User {
  id!: number;
  userName!: string;
  email!: string;

  constructor(props: Fields<User>) {
    Object.assign(this, props);
  }

  static tyql = {
    table: 'users',
    template: () => new User({ id: 0, userName: '', email: '' }),
    columnNameRule: camelToSnake,
  };
}

class Post {
  id!: number;
  authorId!: number;
  title!: string;
  content!: string;

  constructor(props: Fields<Post>) {
    Object.assign(this, props);
  }

  static tyql = {
    table: 'posts',
    template: () => new Post({ id: 0, authorId: 0, title: '', content: '' }),
    columnNameRule: camelToSnake,
  };
}

class Comment {
  id!: number;
  commenterId!: number;
  postId!: number;
  content!: string;

  constructor(props: Fields<Comment>) {
    Object.assign(this, props);
  }

  static tyql = {
    table: 'comments',
    template: () => new Comment({ id: 0, commenterId: 0, postId: 0, content: '' }),
    columnNameRule: camelToSnake,
  };
}

export const Users = table(User, {
  posts: to(Post, 'authorId', 'id'),
  comments: to(Comment, 'commenterId', 'id'),
});

export const Posts = table(Post, {
  author: to(User, 'id', 'authorId'),
  comments: to(Comment, 'postId', 'id'),
});

export const Comments = table(Comment, {
  commenter: to(User, 'id', 'commenterId'),
  post: to(Post, 'id', 'postId'),
});

// PostgreSQL only for now.
const conn = new Connection(Db.POSTGRES, {
  host: 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5433,
  user: 'tyql',
  password: 'tyql',
  database: 'sample',
});

// XXX: 悪くないけどこの辺が早めに破綻しそう。
// もっと形式的にテストできるサンプルテーブル構成を考えたい。
const USERS = {
  alice: new User({ id: 1, userName: 'alice', email: 'alice@gmail.com' }),
  bob: new User({ id: 2, userName: 'bob', email: 'bob@gmail.com' }),
};

const POSTS = {
  alice: [
    new Post({ id: 1, authorId: 1, title: 'alice-1', content: 'alice content 1' }),
    new Post({ id: 2, authorId: 1, title: 'alice-2', content: 'alice content 2' }),
  ],
  bob: [new Post({ id: 3, authorId: 2, title: 'bob-1', content: 'bob content 1' })],
};

describe('end to end', () => {
  beforeAll(() => {
    const filePath = path.join(__dirname, 'sqls', 'users_posts_comments.sql');
    const content = fs.readFileSync(filePath);
    const sql = String(content);

    // TODO: ちゃんとする。
    const knex = (conn as any).context.knex;
    return knex.raw(sql);
  });

  it('loads a first record', async () => {
    const user = await Users()
      .orderBy(Users.id.asc())
      .first(conn);
    expect(user).toEqual(USERS.alice);
  });

  it('loads all records', async () => {
    const users = await Users()
      .orderBy(Users.id.asc())
      .load(conn);

    expect(users).toEqual([USERS.alice, USERS.bob]);
  });

  it('loads related posts', async () => {
    const users = await Users().load(conn);
    const [posts] = await Users()
      .rels(Users.posts)
      .loadMaps(users, conn);

    const expected = {
      posts: new Map([[1, POSTS.alice], [2, POSTS.bob]]),
    };
    expect(posts).toEqual(expected.posts);
  });
});
