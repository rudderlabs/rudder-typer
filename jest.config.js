export default {
  verbose: true,
  rootDir: './',
  roots: ['<rootDir>'],
  prettierPath: 'prettier',
  coverageDirectory: '<rootDir>/reports/coverage',
  coverageReporters: [['lcov', { projectRoot: '/' }], 'text', 'text-summary', 'clover', 'html'],
  reporters: ['default'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        isolatedModules: true,
        sourceMap: true,
        inlineSourceMap: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/reports/', '<rootDir>/node_modules/'],
  testMatch: [
    '<rootDir>/tests/**/*.(spec|test).(j|t)s?(x)',
    '<rootDir>/src/**/*.(spec|test).(j|t)s?(x)',
  ],
  testPathIgnorePatterns: [
    '__mocks__',
    '__fixtures__',
    '<rootDir>/node_modules/',
    '<rootDir>/example',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,ts,tsx}',
    '!<rootDir>/**/types.ts',
    '!<rootDir>/**/*.d.*',
    '!<rootDir>/**/*.test.js',
    '!<rootDir>/**/test/*.js',
  ],
  coveragePathIgnorePatterns: [
    '\\\\node_modules\\\\',
    '<rootDir>/node_modules/',
    '\\\\dist\\\\',
    '\\\\tests\\\\',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  setupFilesAfterEnv: ['jest-expect-message'],
  cacheDirectory: '../../node_modules/.cache/unit-tests',
  clearMocks: true,
  modulePaths: ['<rootDir>/'],
};
