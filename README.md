🚧 Under development

# Tyql - Safe, Lightweight ORM for TypeScript

> NOTE: Currently this document is written in Japanese.
> I'll rewrite this in English later.  
> Also, this document is in work in progress as well as the library itself.

Tyql は柔軟でタイプセーフな DB アクセスを実現する ORM /クエリビルダーです。
Tyql を使えば、最小限の手間で relational database とのインタラクションを安全かつ効率的に記述する事ができます。

## Features

- Type safe query construction
  - Flexible result mapping
  - Column level & Relation level safety
- Ability to define relations between models
  - Easy join
  - Easy relation fetching

### Features Tyql does NOT provide

- Database migration
- Auto generation of models or tables

### Why is type safety matter?

- Fearless model refactoring
- Query construction with compiler assistance

## What it looks like

```typescript
import {Users} from './user';
import {connection} from './connection';

const rows = await Users()
  .innerJoin(Users.Posts)
  // .innerJoin(Users.Credentials)
  .where(
    Users.email.like('%example.com'),
    Users.Posts.isDraft.eq(false),
    // This does NOT compile because you do not join with the credentials table.
    // Users.Credentials.token.isNotNull(),
  )
  .orderBy(Users.createdAt.desc())
  .load(connection);

// Result types are inferred automatically.
rows.forEach(([user, post], i) => {
  console.log(`row ${i}`, user, post);
});
```

## Explore

Tyql による DB アクセスを、サンプルモデルとともに見てみましょう。

### Sample models

例として DB のテーブルに紐づく以下のモデルを考えます:

```typescript
// This corresponds with the "users" table.
class User {
  constructor(
    public readonly id: number,
    public userName: string,
    public email: string,
    public createdAt: Date = new Date(),
  ) {}
}

// This corresponds with the "posts" table.
// "users" has-many "posts".
class Post {
  constructor(
    public readonly id: number,
    public authorId: number, // foreign key for users.id
    public title: string,
    public content: string,
    public createdAt: Date = new Date(),
  ) {}
}
```

#### Query builders

これらのモデルに、リレーション定義などのメタ情報を追加する事で各モデルに対応するクエリビルダーを生成できます (後述)。

```typescript
import {table} from 'tyql';
import {User, Post} from './models';
import {conn} from './connection';

// Query builders.
const Users = table(User, /* some meta data */);
const Posts = table(Post, /* some meta data */);

async () => {
  const allUsers = await Users().orderBy(Users.email.asc()).load(conn);
  console.log('emails:', allUsers.map(u => u.email));

  const firstPost = await Posts().first(conn);
  console.log('post:', firstPost);
}
```

###  Flexible result mapping

Tyql で記述したクエリからは、結果をモデルとして取得する事も、個別に値を得る事も可能です。結果の型は全て推論されるため、明示的に型を指定する必要はありません。

```typescript
// Inferred as 'User[]'
const users = await Users().load(conn);

// Inferred as '[User, Post][]'
const userAndPosts = await Users().innerJoin(Users.posts).load(conn);
const [user, post] = userAndPosts[0];

// Inferred as '[number, string, Post][]'
const results = await Users()
  .innerJoin(Users.posts)
  .select(Users.id, Users.email, Users.posts())
  .load(conn);
const [id, email, post] = results[0];
```

### Column level type safety

クエリビルダーを用いてクエリを記述すれば、カラム名の typo や型の不一致といった trivial なミスをコンパイル時に検出できます。

```typescript
// ERROR: Property 'idd' does not exist
Users().where(Users.idd.eq(5)).first(conn);

// ERROR: Argument of type '10' is not assignable
Users().where(Users.email.eq(10)).first(conn);
```

### Relation level type safety

クエリビルダーは更に、無効なリレーションの使用をコンパイル時に検出できます。例えば以下のクエリはコンパイルが通りますが、

```typescript
Users()
  .innerJoin(Users.posts)
  .where(Users.posts.title.like('WIP%'))
  .load(conn);
```

以下はコンパイルエラーになります。JOIN していないリレーションのカラムをクエリ内で使っているからです。

```typescript
// COMPILE ERROR
Users()
  // .innerJoin(Users.posts)
  .where(Users.posts.title.like('WIP%'))
  .load(conn);
```

### Easy Relation Loading

Tyql は一般的な ORM とは異なり、リレーションをモデルのプロパティとして持たせる事はしません。

```typescript
class User {
  // A model does not have a relation property like this:
  // posts: Post[];
}
```

これはライブラリの機能をシンプルにし、挙動を予測可能にするための意図的な選択です (詳細は後述)。
そのため、 ActiveRecord などの ORM にあるような eager loading / lazy loading 機能もありません。
代わりに、関連を簡単に取得するためのユーティリティが用意されています。

```typescript
// If you want to load some relations from these users,
const users = await Users().load(conn);

// You can load them as 'Map<key, Model[]>' by 'rels' method.
const [postsByAuthor /*, ...other results */] = await Users()
  .rels(Users.posts /*, ...other relations */)
  .loadMaps(users, conn);

users.forEach(user => {
  const posts = postsByAuthor.get(user.id);
  console.log(user, posts);
});
```

## How to create Query Builders

前節までで見たように、 Tyql のクエリビルダーを使うと安全にクエリを構築する事ができます。
クエリビルダーは、モデルといくつかの付加情報、そしてリレーションの定義をする事で生成できます。
正直に言えば、ここが Tyql を使う上で一番面倒な部分です。しかしあなたがコード量の少なさよりも明示性と安全さを重視するなら、払う価値のある手間になるはずです。

先にコードを見てみましょう。以下は `User` モデルに対応する `Users` クエリビルダーを定義する例です。 `Explore` セクションでは省略しましたが、 `User` モデル自体に付加情報を持たせます。

```typescript
import {table, to} from 'tyql';
import {Post} from './models/posts';

export class User {
  constructor(
    public readonly id: number,
    public userName: string,
    public email: string,
    public createdAt: Date = new Date(),
  ) {}

  // First, you need to define a special static property 'tyql'.
  static tyql = {
    table: 'users',
    template: () => new User(0, '', '', new Date()),
  }
}

// Next, define the Users query builder with its relations.
export const Users = table(User, {
  posts: to(Post, 'authorId', 'id'),
});

// That's it.
```

まずモデルクラスの `tyql` プロパティで以下の2つを定義します:

- テーブル名
- モデルの雛形を返す `template` 関数

Tyql がクエリの結果をモデルにマッピングする際には、この `template` 関数を使ってレコードの雛形を作り、そこに実際の値をセットしていきます。

しかし、なぜ `template` のような関数が必要なのでしょうか？
もっとエレガントな方法は無いのでしょうか？  
実際これは暫定的な方法であり、我々もこれがベストだとは考えていません。しかし JS/TS という環境で型安全な ORM を作るには、このような方法しかまだ見つけられていない状況です。
詳細は `Why is template function necessary?` セクションに記していますが、もしより良い方法があればぜひ教えていただきたいです。

### Relation Definition

さて、面倒な `template` の定義さえ終われば後は簡単です。リレーションの定義を渡してモデルごとのクエリビルダーを生成しましょう。

```typescript
export const Users = table(User, {
  posts: to(Post, 'authorId', 'id'),
});

export const Posts = table(Post, {
  author: to(User, 'id', 'authorId'),
});

// Then you can write queries as you like.
Users().where(Users.email.isNull());
Posts().innerJoin(Posts.author).select(Posts.author(), Posts.title);
```

各リレーションの定義には以下の3つが必要です:

- 結合先のテーブルに対応するモデルクラス
    - 注意: テーブルのクエリビルダーではありません (use `User`, not `Users`)
- 結合先テーブルのカラム名
- 結合元テーブルのカラム名

(正確にはカラム名ではなく、対応するモデルのプロパティ名を使います)

これらをこの順序で `to` 関数に渡せば完了です。

```typescript
const relations = {
  posts: to(Post, 'authorId', 'id'),
};
```

プロパティ名は文字列で指定していますが、存在しないプロパティ名を指定するとコンパイルエラーになるので安全です。

また現時点では結合に使うプロパティ名を必ず指定する必要があります。その代り、カラム名に命名規約はありません。

## Policy on handling relations

前述したように、 Tyql ではモデル間のリレーションをプロパティとしては表現しません。そのため、 ActiveRecord などの ORM が提供してくれるような eager loading / lazy loading は存在しません。

以下は ActiveRecord と Tyql でリレーションを取得するコードの比較です:  
(`users` が `posts` に加えて `comments` というリレーションを持つとします)

```ruby
# ActiveRecord
users = User.includes(:posts, :comments)
users.each do |user|
  p [user.id, user.posts, user.comments]
end
```

```typescript
// Tyql
const users = await Users().load(conn);
const [posts, comments] = await Users()
  .rels(Users.posts, Users.comments)
  .loadMaps(users, conn);

users.forEach(user => {
  console.log(user.id, posts.get(user.id), comments.get(user.id));
});
```

どちらも全ユーザと、各ユーザが持つ全 `posts` と `comments` を取得しています。
残念ながら、ActiveRecord に比べると Tyql のコード量は多めです。
しかし、後者には以下のメリットがあります:

- クエリの走るタイミングが明確である。
- 自動でクエリが走らないので N+1 クエリ問題が起きない。

ActiveRecord の簡潔なインターフェイスは確かに非常に強力ではあるものの、効率的に使うためにはその裏側でどのようなクエリが走るのかを理解する必要があります。
例えばもし上記のコードで `comments` を `includes` 忘れても、コードは動作します:

```ruby
# ActiveRecord
users = User.includes(:posts) # :comments
users.each do |user|
  p [user.id, user.posts, user.comments]
end
```

これは `user.comments` が呼ばれるタイミングでそのユーザのコメント一覧を取得しているからです。しかしこれではユーザの数だけコメント一覧を取得するクエリが走ってしまい、非常に無駄です。
これがいわゆる N+1 クエリ問題ですが、 eager loading / lazy loading のない Tyql ではそもそもこの問題は起きようがありません。

このようにリッチな ORM では得てして、簡潔なコードの裏側でどんな風に DB アクセスがなされるのかを知る必要があります。 ActiveRecord でいえば `includes` や `joins`, `eager_load` などの似て非なるメソッドを状況に応じて使い分けるスキルが必要になるでしょう。

一方 Tyql では JOIN して一度にデータを取得するか、リレーションの定義を基に複数回のクエリに分けて取得するかの二択であり、その選択はコードとしてそのまま表現されます。
DB アクセスへの理解が必要になるのは変わりませんが、インターフェイスが暗に内部の理解を迫る事はありません。

またモデル自体がリレーションを持たない設計は、モデル同士をより疎結合にします。
モデル同士が独立しているので、クエリの結果として得られたリレーションをモデルのプロパティに落とし込む処理はありません。そのためテーブル形式で得られるクエリの結果が、オブジェクトのツリーへとどのようにマッピングされるのかを想像する必要もありません。

ActiveRecord に限らず、効率的な DB アクセスを意識するなら、どんな ORM を使っても SQL や DB の知識は必要になると思います。そういう意味で、 ORM は DB アクセスを隠蔽する抽象化手段というよりは、ある種のシンタックスシュガーとして捉えるのが良いかもしれません。
つまりはクエリの構築や結果のマッピングをその言語にふさわしいコードに落とし込むためのツールであり、それ以上のものではない、といった位置づけです。
Tyql もこの思想に基づいており、あくまで DB へのアクセスを型安全に記述するためのライブラリです。 DB アクセス自体を抽象・隠蔽したければ、あなたのアプリケーションに合う設計をあなた自身で行う必要があるでしょう。 Tyql はその手助けをしてくれます。

## Why is `template` function necessary?

クエリビルダーの生成において `template` 関数の定義が必須なのは完全に技術的な制約ゆえであり、何らライブラリデザインとしての意図はありません。
可能であるなら無くても済むようにしたいのですが、現状ではより良い方法が見つかっていません。

というのも、 Tyql が掲げる型安全なクエリの構築を実現するためには、対象となるテーブルのカラム一覧、つまりは対応するモデルのプロパティ一覧が必要になります。重要なのは、このカラム一覧の情報がコンパイル時と実行時の両方で必要になる点です。

```typescript
import {table} from 'tyql';

class User {
  id: number;
  name: string;
}

// Tyql extracts property data from a model class.
const Users = table(User);

// The extracted property data must be statically typed.
// And of course it must function in runtime.
console.log(Users.id, Users.name);
```

コンパイル時にプロパティ情報を取得するのは簡単で、モデルとなるクラスの定義さえあれば TypeScript の Mapped Types などを使って実現できます。

```typescript
class User {
  id: number;
  name: string;
}

type Columns<T> = {
  [P in keyof T]: Column<T[P]>;
}

type Users = Columns<User>;
// Users: { id: Column<number>, name: Column<string> };
```

しかし、 TypeScript はあくまで JavaScript のスーパーセットであり、コンパイル後はただの JavaScript になります。そのため、コンパイル時にあるようなクラスのプロパティ情報を実行時に取得する事は通常できません。

```javascript
// The User class defined above compiles into a function such as:
var User = /** @class */ (function () {
    function User() {
    }
    return User;
}());
// No property information remains.
```

つまり、クラス定義だけではコンパイル時にしかプロパティ情報にアクセスできません。

しかし実際に値がセットされたインスタンスがあれば、実行時にもプロパティ情報を得る事ができます。

```javascript
const user = User.tyql.template();
Object.keys(users); //=> ["id", "name"]
```

これが `template` 関数が必要となる理由です。実行時には、この関数が作るインスタンスからプロパティ情報を得ています。

### How about Decorators?

実は 実行時に一部の型情報を得る方法も (自分の知る限りでは) 1つだけ存在します。それが Decorator という experimental な機能です。
これをクラスの各プロパティに指定すると、実行時にプロパティ情報にアクセスすることができます。

```typescript
class User {
  @column
  id: number;

  @column
  name: string;
}
// Actually a decorator is just a function and
// the `column` function is called for each property at runtime.
```

そのため、この Decorator を使用すれば `template` 関数が不要になりそうです。しかし、この案は採用しませんでした。
というのも、例えばもし特定のプロパティに decorator を付与し忘れたらどうなるでしょう？

```typescript
class User {
  @column
  id: number;

  @column
  name: string;

  // Oops
  birthday: Date;
}
```

すると実行時に `@column` は `birthday` の存在を知ることができないため、 `User` のカラムは `id`, `name` のみと判断されます。
ところが、 `User` クラスを基に生成されるクエリビルダーは `id`, `name`, `birthday` の3つを全てカラムとして認識します。

```typescript
type Users = Columns<User>;
// Users: { id: Column<number>, name: Column<string>, birthday: Column<Date> };
```

すると実行時には存在しない `birthday` というカラムが、コンパイル時には存在する事になってしまいます。
これは、コンパイルは通るのに実行時に予期せぬエラーが起きるという、面倒なバグを生むでしょう。

つまり Decorator を使うにあたり問題なのは、「どのプロパティに decorator が付与されているか」は実行時にしかわからない点です。 Decorator の情報をコンパイル時にも使えるならこの方法が良さそうなのですが、現時点では (自分が知る限りだと) 出来ません。

よって、モデルクラスのプロパティ情報をコンパイル時と実行時の両方でズレなく得るためのシンプルな方法として、全てのプロパティを持ったインスタンスを返す `template` 関数を定義してもらう形にしました。

逆に言うと、 Tyql ではモデルクラスの (メソッドと private プロパティを除く) 全てのプロパティがカラムに対応している必要があります。特定のプロパティをマッピングの対象外とする事は現状できません。
