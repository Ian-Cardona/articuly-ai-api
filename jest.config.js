export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
    '^firebase-admin$': '<rootDir>/__mocks__/firebase-admin.js',
    '^firebase-admin/firestore$': '<rootDir>/__mocks__/firebase-admin/firestore.js',
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__', '<rootDir>/tests-dist'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests-dist/**/*.test.js',
    '**/tests-dist/**/*.spec.js',
    '**/tests-dist/?(*.)+(spec|test).js',
    '**/tests-dist/**/*.test.mjs',
    '**/tests-dist/**/*.spec.mjs',
    '**/tests-dist/?(*.)+(spec|test).mjs'
  ],
  transform: {
    '^.+\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(ts-jest)/)',
  ],
}; 