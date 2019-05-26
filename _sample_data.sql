CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_name VARCHAR(20) NOT NULL,
  email VARCHAR(512) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_idx_name_email ON users (user_name, email);

INSERT INTO users (id, user_name, email) VALUES
  (1, 'alice', 'alice@gmail.com'),
  (2, 'bob', 'bob@gmail.com')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  author_id INT NOT NULL REFERENCES users (id),
  title VARCHAR(1024) NOT NULL,
  content VARCHAR(2048) NOT NULL
);

INSERT INTO posts (id, author_id, title, content) VALUES
  (1, 1, 'my first post', 'Hello, world!'),
  (2, 1, 'my second post', 'Good morning, world!'),
  (3, 2, 'TypeScript is awesome', 'You must use it')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  commenter_id INT NOT NULL REFERENCES users (id),
  post_id INT NOT NULL REFERENCES posts (id),
  content VARCHAR(1024) NOT NULL
);

INSERT INTO comments (id, commenter_id, post_id, content) VALUES
  (1, 1, 1, 'Feel free to comment!'),
  (2, 2, 1, 'Hello!'),
  (3, 1, 2, 'Why?')
ON CONFLICT DO NOTHING;
