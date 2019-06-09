import { table, rel } from './tableBuilder';
import { KnexConnection } from './connection';

class User {
  static tyql = {
    table: 'users',
    template: () => new User(0, 'alice'),
  };
  constructor(public id: number, public user_name: string) {}
}

class Post {
  static tyql = {
    table: 'posts',
    template: () => new Post(0, 0, ''),
  };
  constructor(public id: number, public author_id: number, public title: string) {}
}

class Comment {
  static tyql = {
    table: 'comments',
    template: () => new Comment(0, 0, ''),
  };
  constructor(public id: number, public commenter_id: number, public content: string) {}
}

export const Users = table(User, {
  rels: {
    posts: rel(Post, 'author_id', 'id'),
    comments: rel(Comment, 'commenter_id', 'id'),
  },
});

export const Posts = table(Post, {
  rels: {
    author: rel(User, 'id', 'author_id'),
  },
});

export const Comments = table(Comment, {
  rels: {
    commenter: rel(User, 'id', 'commenter_id'),
  },
});

const conn = {
  runQuery: (): any => null,
};

export async function checkTypes() {
  const users = await Users.$query().load(conn);
  console.log(users);

  const idAndNames = await Users.$query()
    .select(Users.id, Users.user_name)
    .load(conn);
  console.log(idAndNames);

  const userAndPosts = await Users.$query()
    .innerJoin(Users.posts)
    .load(conn);
  console.log(userAndPosts);

  const tableAndCols = await Users.$query()
    .innerJoin(Users.posts)
    .innerJoin(Users.comments)
    .select(Users.$all(), Users.posts.title, Users.posts.$all(), Users.id, Users.comments.$all())
    .load(conn);
  console.log(tableAndCols);

  Users.$query().where(Users.id.eq(1), Users.id.eq(Users.id).eq(true));
  Users.$query()
    .innerJoin(Users.posts)
    // .where(Users.id.add(3)) // expected error
    .where(Users.id.eq(Users.id.add(Users.posts.id)), Users.id.eq(3), Users.id.in(1, 2, 3))
    .groupBy(Users.posts.id)
    .orderBy(Users.id.asc(), Users.posts.title.desc());

  const ret = await Users.$query()
    .select(Users.id.add(3), Users.id.eq(3))
    .load(conn);
  console.log(ret);

  // expected error
  // Users().where(Users.id.eq(Posts.id));
}

async function checkRunning() {
  const conn = new KnexConnection({
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'ryu',
      database: 'tyql_sample',
    },
  });
  try {
    const users = await Users.$query().load(conn);
    console.log(users);

    const ids = await Users.$query()
      .select(Users.id)
      .where(Users.id.in(1, 2, 3))
      .load(conn);
    console.log(ids);

    const userAndPosts = await Users.$query()
      .innerJoin(Users.posts)
      .load(conn);
    console.log(userAndPosts);
  } finally {
    conn.close();
  }
}
checkRunning();
