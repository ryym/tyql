import { tableDef, schema } from './tyql';

class User {
  static tableDef = () => tableDef('users');
  static template = () => new User('alice', 20);

  constructor(public name: string, public age: number) {}
}

class Post {
  static tableDef = () => tableDef('posts');
  static template = () => new Post();

  authorId: number = 0;
  title: string = '';
}

const t = {
  users: schema(User, {
    rels: {
      posts: Post,
    },
  }),
  posts: schema(Post, {}),
};

console.log(t);

const q = t.users
  .$query()
  .innerJoin(t.users.posts)
  .select(t.users.name, t.users.posts.$all());

console.log(q);
