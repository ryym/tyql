module.exports = {
  roots: ['src'],

  verbose: true,

  moduleFileExtensions: ['js', 'ts'],

  preset: 'ts-jest',

  testMatch: ['**/*_test.ts'],

  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json',
    },
  },
};
