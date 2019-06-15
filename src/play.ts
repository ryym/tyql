import { table, rel } from './table';
import { KnexConnection } from './connection';
import { camelToSnake } from './column';
import { and, or } from './ops';

class User {
  static tyql = {
    table: 'users',
    template: () => new User(0, 'alice'),
    columnNameRule: camelToSnake,
  };

  public email: string = '';
  public createdAt: Date = new Date();

  constructor(public id: number, public userName: string) {}
}

class Post {
  static tyql = {
    table: 'posts',
    template: () => new Post(0, 0, ''),
    columnNameRule: camelToSnake,
  };
  constructor(public id: number, public authorId: number, public title: string) {}
}

class Comment {
  static tyql = {
    table: 'comments',
    template: () => new Comment(0, 0, ''),
    columnNameRule: camelToSnake,
  };
  constructor(public id: number, public commenterId: number, public content: string) {}
}

export const Users = table(User, {
  rels: {
    posts: rel(Post, 'authorId', 'id'),
    comments: rel(Comment, 'commenterId', 'id'),
  },
});

export const Posts = table(Post, {
  rels: {
    author: rel(User, 'id', 'authorId'),
  },
});

export const Comments = table(Comment, {
  rels: {
    commenter: rel(User, 'id', 'commenterId'),
  },
});

const conn = {
  runQuery: (): any => null,
  toSQL: (): any => null,
};

export async function checkTypes() {
  const users = await Users.$query().load(conn);
  console.log(users);

  const idAndNames = await Users.$query()
    .select(Users.id, Users.userName)
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

export async function checkRunning() {
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

    const [posts, comments] = await Users.$rels(Users.posts, Users.comments).loadMaps(users, conn);
    console.log(posts, comments);

    const firstComment = await Comments.$query()
      .where(Comments.content.like('%free%'))
      .first(conn);
    console.log(firstComment);

    let complexQueryResult = Users.$query()
      .where(
        Users.email.like('%gmail%'),
        Users.email.notLike('%hoge%'),
        Users.email.like(Users.userName), // lit('%').concat(Users.userName) ?
        Users.id.between(10, 30),
        Users.id
          .add(3)
          .mlt(5)
          .eq(Users.id.sbt(4).dvd(5)),
        Users.userName.notBetween('a', 'z'),
        Users.id.in(1, 3, 10),
        Users.id.notIn(50, 10, 100),
        Users.email.isNull(),
        Users.email.isNotNull(),
        or(
          and(Users.id.gt(5), Users.id.lt(10)),
          Users.userName.like('hey%'),
          Users.userName.like('wow%')
        )
      )
      .groupBy(Users.id, Users.email)
      .having(Users.id.eq(3))
      .orderBy(Users.id.asc(), Users.createdAt.desc(), Users.id.add(1).asc())
      .limit(5)
      .offset(3);
    console.log(complexQueryResult.toSQL(conn));
  } finally {
    conn.close();
  }
}
checkRunning();
