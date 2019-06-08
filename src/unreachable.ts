// https://patrickdesjardins.com/blog/typescript-exhaustive-check
// You can use this to do exhaustive check in compile time.
export const unreachable = (_value: never): never => {
  throw new Error('unreachable');
};
