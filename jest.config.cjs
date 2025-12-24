/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    displayName: 'api',
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',

    // ESM support
    extensionsToTreatAsEsm: ['.ts'],

    // Test file patterns
    roots: ['<rootDir>/api'],
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/*.test.ts'
    ],

    // TypeScript configuration for ESM
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            useESM: true,
        }]
    },

    // Module resolution for ESM
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js extensions in imports
    },

    // Coverage configuration
    collectCoverageFrom: [
        'api/**/*.ts',
        '!api/**/*.d.ts',
        '!api/**/__tests__/**',
        '!api/scripts/**'
    ],
    coverageDirectory: '<rootDir>/coverage/api',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/api/__tests__/setup.ts'],

    // Test timeout
    testTimeout: 30000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Global setup/teardown
    globalSetup: '<rootDir>/api/__tests__/globalSetup.ts',
    globalTeardown: '<rootDir>/api/__tests__/globalTeardown.ts'
};
