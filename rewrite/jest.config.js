/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: [
		'**/*.steps.ts'
	],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/built/'
	]
};
