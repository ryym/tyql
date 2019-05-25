import { tableDef, schema } from './tyql';

class User {
  static tableDef = () => tableDef('users');

  static template = () => new User('alice', 20);

  constructor(public name: string, public age: number) {}
}

const t = {
  users: schema(User),
};

console.log(t);
