import * as TC from '@ktb/type-compare';

export type Equals<A, B> = TC.Equals<A, B, true, false>;

// An empty function just for type checking.
// This does compiles only if the given type becomes true.
// Example usage:
//   assertType<Equals<typeof expected, typeof actual>>();
export function assertType<_T extends true>() {}

// An empty function just for type checking.
// This does compiles only if the given type becomes false.
export function assertNotType<_T extends false>() {}
