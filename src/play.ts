import { TableRelBuilder } from './types';
import { Column, Table } from './table';

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
  constructor(public id: number, public author_id: number, public content: string) {}
}

export type Users = {
  id: Column<number, User>;
  user_name: Column<string, User>;
  posts: Posts & TableRelBuilder<number, User, Post>;
  comments: Comments & TableRelBuilder<number, User, Comment>;
};
export const Users: Users & Table<User> = null as any;

export type Posts = {
  id: Column<number, Post>;
  author_id: Column<number, Post>;
  title: Column<string, Post>;
  author: Users & TableRelBuilder<number, Post, User>;
};
export const Posts: Posts & Table<Post> = null as any;

export type Comments = {
  id: Column<number, Comment>;
  author_id: Column<number, Comment>;
  content: Column<string, Comment>;
  author: Users & TableRelBuilder<number, Comment, User>;
};
export const Comments: Comments & Table<Comment> = null as any;

const conn = {
  connection: (): any => null,
};

export async function checkTypes() {
  const users = await Users().load(conn);
  console.log(users);

  const idAndNames = await Users()
    .select(Users.id, Users.user_name)
    .load(conn);
  console.log(idAndNames);

  const userAndPosts = await Users()
    .innerJoin(Users.posts)
    .load(conn);
  console.log(userAndPosts);

  const tableAndCols = await Users()
    .innerJoin(Users.posts)
    .innerJoin(Users.comments)
    .select(Users(), Users.posts.title, Users.posts(), Users.id, Users.comments())
    .load(conn);
  console.log(tableAndCols);

  Users().where(Users.id.eq(1), Users.id.eq(Users.id).eq(true));
  Users()
    .innerJoin(Users.posts)
    // .where(Users.id.add(3)) // expected error
    .where(Users.id.eq(Users.posts.id), Users.id.eq(3), Users.id.in(1, 2, 3))
    .groupBy(Users.posts.id)
    .orderBy(Users.id.asc(), Users.posts.title.desc());

  const ret = await Users()
    .select(Users.id.add(3), Users.id.eq(3))
    .load(conn);
  console.log(ret);

  Users().innerJoin(Users.posts().on(Users.id.eq(1)));

  // expected error
  // Users().where(Users.id.eq(Posts.id));
}
