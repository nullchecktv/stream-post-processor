module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'functions/**/*.mjs',
    '!functions/**/*.test.mjs',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.mjs'
  ],
  transform: {
    '^.+\\.mjs$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'mjs'],
  transformIgnorePatterns: [
    'node_modules/(?!(aws-sdk-client-mock)/)'
  ]
};
