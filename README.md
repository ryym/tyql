# Tyql

Moderately type safe ORM builder for TypeScript

## What it looks like

```typescript
// models

class User {
  constructor(
    public id: number,
    public name: string,
    public birthday: Date
  ) {}
}

class Tweet {
  constructor(
    public id: number,
    public authorId: number,
    public content: string
  ) {}
}
```

Any query results are statically typed.

```typescript
import {table, or} from 'tyql';
import {User, Tweet} from './models';
import {createConnection} from './connection';

const Users = table(User, { /* definitions */ });
const Tweets = table(Tweet, { /* definitions */ });

const conn = createConnection();

async function main() {
  // You can obtain the array of your model.
  // result: User[]
  const users = await Users.$query().load(conn);

  // You can obtain the array of models array by joining.
  // result: [User, Tweet][]
  const userAndTweets = await Users.$query()
    .innerJoin(Users.tweets)
    .load(conn);

  // You can select some columns as well.
  // result: [Date, number, string]
  const [name, tweetId, content] = await Users.$query()
    .innerJoin(Users.tweets)
    .select(Users.birthday, Users.tweets.id, Users.tweets.content)
    .first(conn);

  // But this becomes COMPILE TIME error because you don't join with `Users.tweets`.
  await Users.$query()
    .select(Users.birthday, Users.tweets.id, Users.tweets.content)
    .first(conn);

  // Write complex queries type-safely.
  Users.$query()
    .innerJoin(Users.tweets)
    .where(
      Users.id.gte(10),
      Users.name.notIn("foo", "bar", "baz"),
      or(
        Users.tweets.content.like('%TypeScript%'),
        Users.tweets.content.like('%GitHub%'),
      )
    )
    .limit(500);

  // Load relations easily.
  // result: [Map<K, Model>...]
  const [tweets] = await Users.$rels(Users.tweets).loadMaps(users, conn);
}
```