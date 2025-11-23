import { defineConfig } from '@vscode/test-cli';

/**
 * VS Code Extension Test Configuration
 * 
 * This configuration file defines how the extension tests should be run
 */

export default defineConfig({
	// Test files to run
	files: 'test/**/*.test.js',
	
	// VS Code version to use for testing
	version: 'stable',
	
	// Workspace to open during tests (optional)
	// workspaceFolder: './test-workspace',
	
	// Extension development options
	extensionDevelopmentPath: '.',
	
	// Test options
	mocha: {
		// Test timeout (ms)
		timeout: 30000,
		
		// Enable colors in output
		color: true,
		
		// Reporter to use
		reporter: 'spec',
		
		// Slow test threshold (ms)
		slow: 5000,
		
		// Require setup file before tests
		// require: ['test/setup.js'],
		
		// Grep pattern to filter tests
		// grep: 'Variable Extraction',
		
		// Invert grep pattern
		// invert: false,
		
		// Bail on first test failure
		// bail: false,
		
		// Number of retry attempts for failing tests
		retries: 0
	},
	
	// Launch options for VS Code
	launchArgs: [
		// Disable extensions during tests for isolation
		// '--disable-extensions',
		
		// Additional launch arguments
		'--disable-gpu',
		'--no-sandbox'
	],
	
	// Environment variables
	env: {
		// Set any environment variables needed for tests
	}
});
