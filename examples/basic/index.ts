import { camelToSnake, Connection, Db, newQueryBuilder, to } from 'tyql';

// - user has_many posts and comments
// - post has_many comments

class User {
  id: number = 0;
  userName: string = '';
  email: string = '';
  createdAt: Date = new Date();

  static tyql = {
    table: 'users',
    template: () => new User(),
    columnNameRule: camelToSnake,
  };
}

class Post {
  id: number = 0;
  authorId: number = 0;
  title: string = '';

  static tyql = {
    table: 'posts',
    template: () => new Post(),
    columnNameRule: camelToSnake,
  };
}

class Comment {
  id: number = 0;
  commenterId: number = 0;
  postId: number = 0;
  content: string = '';

  static tyql = {
    table: 'comments',
    template: () => new Comment(),
    columnNameRule: camelToSnake,
  };
}

const Users = newQueryBuilder(User, {
  posts: to(Post, 'authorId', 'id'),
  comments: to(Comment, 'commenterId', 'id'),
});

const Posts = newQueryBuilder(Post, {
  comments: to(Comment, 'postId', 'id'),
});

export async function main() {
  const conn = new Connection(Db.POSTGRES, {
    host: 'localhost',
    port: 5433,
    user: 'tyql',
    password: 'tyql',
    database: 'sample',
  });

  try {
    // Load all users.
    const users = await Users().load(conn);
    console.log(users);

    // Load related posts and comments.
    const [posts, comments] = await Users()
      .rels(Users.posts, Users.comments)
      .loadMaps(users, conn);
    console.log(posts.entries(), comments.entries());

    // Load users and posts with select, joins and conditions.
    const userNameAndPosts = await Users()
      .innerJoin(Users.posts)
      .where(Users.posts.title.like('my%'))
      .select(Users.userName, Users.posts())
      .load(conn);
    console.log(userNameAndPosts);
    const [userName, post] = userNameAndPosts[0];
    console.log(userName.toUpperCase(), post.title);

    // Use nested joins.
    const joinedResults = await Users()
      .innerJoin(Users.comments)
      .innerJoin(Users.posts().innerJoin(Posts.comments))
      .orderBy(Users.id.desc(), Users.comments.id.asc(), Posts.comments.id.desc())
      .load(conn);
    console.log(joinedResults);
  } finally {
    conn.close();
  }
}
main();
