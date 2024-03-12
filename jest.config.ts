import type { Config } from '@jest/types'

const options: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.(spec|test|e2e-spec)\\.ts$',
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['**/lib/*.ts'],
  globalSetup: '<rootDir>/test/setup/globalSetup.js',
  globalTeardown: '<rootDir>/test/setup/globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/test/setup/setupApplication.ts'],
  moduleNameMapper: {
    '@lib(.*)': '<rootDir>/lib$1',
  },
}

export default options
