import { assertType, Equals } from './testutils/typeAssert';
import { newQueryBuilder, to } from './table';
import { newFakeConnection } from './connection';

class User {
  static tyql = {
    table: 'users',
    template: () => new User(0, 'alice'),
  };

  constructor(public id: number, public user: string) {}
}

class Post {
  static tyql = {
    table: 'posts',
    template: () => new Post(0, 0, 'hello'),
  };
  constructor(public id: number, public authorId: number, public post: string) {}
}

class Comment {
  static tyql = {
    table: 'comments',
    template: () => new Comment(0, 0, 0, 'good article'),
  };
  constructor(
    public id: number,
    public commenterId: number,
    public postId: number,
    public comment: string
  ) {}
}

export const Users = newQueryBuilder(User, {
  posts: to(Post, 'authorId', 'id'),
  comments: to(Comment, 'commenterId', 'id'),
});

export const Posts = newQueryBuilder(Post, {
  author: to(User, 'id', 'authorId'),
  comments: to(Comment, 'postId', 'id'),
});

export const Comments = newQueryBuilder(Comment, {
  commenter: to(User, 'id', 'commenterId'),
  post: to(Post, 'id', 'postId'),
});

const fakeConn = newFakeConnection();

describe('Type inferences of query results', () => {
  it.skip('distinguishes array types', () => {
    // This must be error.
    assertType<Equals<any[], number[]>>();
  });

  it('infers Model[] if no selects and joins', async () => {
    const users = await Users().load(fakeConn);
    assertType<Equals<typeof users, User[]>>();
  });

  it('infers selected column types', async () => {
    const idAndNames = await Users()
      .select(Users.id, Users.user)
      .load(fakeConn);
    assertType<Equals<typeof idAndNames, [number, string][]>>();
  });

  it('infers selected expression types', async () => {
    const exprs = await Users()
      .select(Users.id.add(3), Users.id.eq(3))
      .load(fakeConn);
    assertType<Equals<typeof exprs, [number, boolean][]>>();
  });

  it('infers types of Models and columns if selected', async () => {
    const tableAndCols = await Users()
      .innerJoin(Users.posts)
      .innerJoin(Users.comments)
      .select(Users(), Users.posts.post, Users.posts(), Users.comments.id, Users.comments())
      .load(fakeConn);
    assertType<Equals<typeof tableAndCols, [User, string, Post, number, Comment][]>>();
  });

  it('infers [Model, Model..][] for joins', async () => {
    const userAndPosts = await Users()
      .innerJoin(Users.posts)
      .load(fakeConn);
    assertType<Equals<typeof userAndPosts, [User, Post][]>>();
  });

  it('infers nested tuple type for nested joins', async () => {
    const nestedJoinResult = await Users()
      .innerJoin(Users.comments)
      .innerJoin(
        Users.posts()
          .innerJoin(Posts.comments().innerJoin(Comments.commenter))
          .innerJoin(Posts.author)
      )
      .load(fakeConn);

    assertType<Equals<typeof nestedJoinResult, [User, Comment, [Post, [Comment, User], User]][]>>();
  });
});
