// All of the type defenitions here are taken from this article. Thank you!!
// https://qiita.com/kgtkr/items/2a8290d1b1314063a524

type And<A extends boolean, B extends boolean> = A extends true
  ? (B extends true ? true : false)
  : false;

type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : (B extends true ? true : false);

type Not<X extends boolean> = X extends true ? false : true;

type Extends<A, B> = A extends B ? true : false;

// Becomes true if A and B is a same type.
// But this does not work well for union types and `any` types.
type EqualsExceptUnion<A, B> = And<Extends<A, B>, Extends<B, A>>;

// Becomes true if A and B is a same type. This works for union types as well,
// but does not for `any` types.
//   Extends<A | B, A>     -> boolean (true | false)
//   Extends<[A | B], [A]> -> false
// (I don't understand the details of this behavior)
type EqualsExceptAny<A, B> = EqualsExceptUnion<[A], [B]>;

// Becomes true if T is an `any` type.
// We infer that if it equals two deferrent types.
type IsAny<T> = And<EqualsExceptAny<T, 1>, EqualsExceptAny<T, 2>>;
type IsNotAny<T> = Not<IsAny<T>>;

// Becomes true if A and B is a same type.
export type Equals<A, B> = Or<
  And<IsAny<A>, IsAny<B>>,
  And<And<IsNotAny<A>, IsNotAny<B>>, EqualsExceptAny<A, B>>
>;

// An empty function just for type checking.
// This does compiles only if the given type becomes true.
// Example usage:
//   assertType<Equals<typeof expected, typeof actual>>();
export function assertType<_T extends true>() {}

// An empty function just for type checking.
// This does compiles only if the given type becomes false.
export function assertNotType<_T extends false>() {}
