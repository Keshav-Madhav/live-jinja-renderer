const vscode = require('vscode');

/**
 * Test Helper Utilities
 * 
 * Common functions and utilities for testing the Live Jinja Renderer extension
 */

/**
 * Creates a temporary Jinja document for testing
 * @param {string} content - Template content
 * @param {string} language - Language ID (default: 'jinja')
 * @returns {Promise<vscode.TextDocument>}
 */
async function createTestDocument(content, language = 'jinja') {
	return await vscode.workspace.openTextDocument({
		language: language,
		content: content
	});
}

/**
 * Opens a document in the editor
 * @param {vscode.TextDocument} doc - Document to open
 * @returns {Promise<vscode.TextEditor>}
 */
async function openDocument(doc) {
	return await vscode.window.showTextDocument(doc);
}

/**
 * Creates and opens a test document
 * @param {string} content - Template content
 * @param {string} language - Language ID
 * @returns {Promise<vscode.TextEditor>}
 */
async function createAndOpenDocument(content, language = 'jinja') {
	const doc = await createTestDocument(content, language);
	return await openDocument(doc);
}

/**
 * Waits for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for the sidebar view to be ready
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<void>}
 */
async function waitForSidebarReady(timeout = 1000) {
	await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
	await sleep(timeout);
}

/**
 * Executes a command and waits for it to complete
 * @param {string} command - Command ID
 * @param {number} delay - Delay after execution in ms
 * @returns {Promise<any>}
 */
async function executeCommand(command, delay = 100) {
	const result = await vscode.commands.executeCommand(command);
	await sleep(delay);
	return result;
}

/**
 * Gets extension configuration
 * @param {string} section - Configuration section
 * @returns {vscode.WorkspaceConfiguration}
 */
function getConfig(section = 'liveJinjaRenderer') {
	return vscode.workspace.getConfiguration(section);
}

/**
 * Updates a configuration setting
 * @param {string} key - Setting key
 * @param {any} value - New value
 * @param {vscode.ConfigurationTarget} target - Configuration target
 * @returns {Promise<void>}
 */
async function updateConfig(key, value, target = vscode.ConfigurationTarget.Global) {
	const config = getConfig();
	await config.update(key, value, target);
	await sleep(100);
}

/**
 * Saves and restores a configuration setting
 * @param {string} key - Setting key
 * @param {Function} callback - Function to execute with modified setting
 * @returns {Promise<any>}
 */
async function withConfigValue(key, value, callback) {
	const config = getConfig();
	const original = config.get(key);
	
	try {
		await updateConfig(key, value);
		return await callback();
	} finally {
		await updateConfig(key, original);
	}
}

/**
 * Closes all open editors
 * @returns {Promise<void>}
 */
async function closeAllEditors() {
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	await sleep(100);
}

/**
 * Gets the extension instance
 * @returns {vscode.Extension}
 */
function getExtension() {
	return vscode.extensions.getExtension('KilloWatts.live-jinja-renderer');
}

/**
 * Activates the extension if not already active
 * @returns {Promise<any>}
 */
async function activateExtension() {
	const extension = getExtension();
	if (!extension.isActive) {
		await extension.activate();
	}
	return extension;
}

/**
 * Creates a temporary JSON file for testing
 * @param {Object} data - JSON data
 * @returns {Promise<vscode.TextDocument>}
 */
async function createJsonDocument(data) {
	const content = JSON.stringify(data, null, 2);
	return await vscode.workspace.openTextDocument({
		language: 'json',
		content: content
	});
}

/**
 * Simulates typing text into the editor
 * @param {vscode.TextEditor} editor - Editor instance
 * @param {string} text - Text to type
 * @param {vscode.Position} position - Position to insert (default: end of document)
 * @returns {Promise<boolean>}
 */
async function typeText(editor, text, position = null) {
	const pos = position || editor.document.lineAt(editor.document.lineCount - 1).range.end;
	return await editor.edit(editBuilder => {
		editBuilder.insert(pos, text);
	});
}

/**
 * Replaces text in the editor
 * @param {vscode.TextEditor} editor - Editor instance
 * @param {vscode.Range} range - Range to replace
 * @param {string} text - New text
 * @returns {Promise<boolean>}
 */
async function replaceText(editor, range, text) {
	return await editor.edit(editBuilder => {
		editBuilder.replace(range, text);
	});
}

/**
 * Gets the full text of the active editor
 * @returns {string|null}
 */
function getActiveEditorText() {
	const editor = vscode.window.activeTextEditor;
	return editor ? editor.document.getText() : null;
}

/**
 * Checks if a command is registered
 * @param {string} commandId - Command ID
 * @returns {Promise<boolean>}
 */
async function isCommandRegistered(commandId) {
	const commands = await vscode.commands.getCommands(true);
	return commands.includes(commandId);
}

/**
 * Gets all extension commands
 * @returns {Promise<string[]>}
 */
async function getExtensionCommands() {
	const allCommands = await vscode.commands.getCommands(true);
	return allCommands.filter(cmd => cmd.startsWith('live-jinja-tester.'));
}

/**
 * Executes multiple commands in sequence
 * @param {string[]} commands - Array of command IDs
 * @param {number} delay - Delay between commands in ms
 * @returns {Promise<any[]>}
 */
async function executeCommands(commands, delay = 100) {
	const results = [];
	for (const cmd of commands) {
		results.push(await executeCommand(cmd, delay));
	}
	return results;
}

/**
 * Measures execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
async function measureTime(fn) {
	const start = Date.now();
	const result = await fn();
	const duration = Date.now() - start;
	return { result, duration };
}

/**
 * Retries a function until it succeeds or timeout
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} delay - Delay between attempts in ms
 * @returns {Promise<any>}
 */
async function retry(fn, maxAttempts = 3, delay = 500) {
	let lastError;
	for (let i = 0; i < maxAttempts; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (i < maxAttempts - 1) {
				await sleep(delay);
			}
		}
	}
	throw lastError;
}

/**
 * Waits for a condition to become true
 * @param {Function} condition - Condition function returning boolean
 * @param {number} timeout - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>}
 */
async function waitForCondition(condition, timeout = 5000, interval = 100) {
	const startTime = Date.now();
	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return true;
		}
		await sleep(interval);
	}
	return false;
}

/**
 * Creates multiple test documents
 * @param {string[]} contents - Array of template contents
 * @param {string} language - Language ID
 * @returns {Promise<vscode.TextDocument[]>}
 */
async function createMultipleDocuments(contents, language = 'jinja') {
	const documents = [];
	for (const content of contents) {
		documents.push(await createTestDocument(content, language));
	}
	return documents;
}

/**
 * Toggles a boolean setting and returns to original value
 * @param {string} key - Setting key
 * @param {Function} callback - Function to execute with toggled setting
 * @returns {Promise<any>}
 */
async function withToggledSetting(key, callback) {
	const config = getConfig();
	const original = config.get(key);
	const toggled = !original;
	
	return await withConfigValue(key, toggled, callback);
}

/**
 * Gets completion items at a position
 * @param {vscode.TextDocument} doc - Document
 * @param {vscode.Position} position - Position
 * @returns {Promise<vscode.CompletionList>}
 */
async function getCompletions(doc, position) {
	return await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		doc.uri,
		position
	);
}

/**
 * Creates a mock webview for testing
 * @returns {Object}
 */
function createMockWebview() {
	const listeners = {};
	return {
		postMessage: async (message) => {
			// Simulate message handling
			return true;
		},
		onDidReceiveMessage: (callback) => {
			listeners.message = callback;
			return { dispose: () => delete listeners.message };
		},
		html: '',
		options: {},
		cspSource: 'mock-csp',
		asWebviewUri: (uri) => uri
	};
}

/**
 * Test assertion helpers
 */
const assertions = {
	/**
	 * Asserts that a variable exists in extracted variables
	 * @param {Object} vars - Extracted variables
	 * @param {string} varName - Variable name to check
	 * @param {string} msg - Assertion message
	 */
	hasVariable(vars, varName, msg) {
		if (!vars[varName]) {
			throw new Error(msg || `Expected variable "${varName}" to exist`);
		}
	},

	/**
	 * Asserts that a variable has a specific type
	 * @param {Object} vars - Extracted variables
	 * @param {string} varName - Variable name
	 * @param {string} type - Expected type
	 * @param {string} msg - Assertion message
	 */
	hasType(vars, varName, type, msg) {
		const actualType = typeof vars[varName];
		if (actualType !== type) {
			throw new Error(
				msg || `Expected "${varName}" to be ${type}, got ${actualType}`
			);
		}
	},

	/**
	 * Asserts that an array variable has items
	 * @param {Object} vars - Extracted variables
	 * @param {string} varName - Variable name
	 * @param {string} msg - Assertion message
	 */
	isArray(vars, varName, msg) {
		if (!Array.isArray(vars[varName])) {
			throw new Error(msg || `Expected "${varName}" to be an array`);
		}
	},

	/**
	 * Asserts that a nested property exists
	 * @param {Object} vars - Extracted variables
	 * @param {string} path - Property path (e.g., 'user.name')
	 * @param {string} msg - Assertion message
	 */
	hasNestedProperty(vars, path, msg) {
		const parts = path.split('.');
		let current = vars;
		for (const part of parts) {
			if (!current || current[part] === undefined) {
				throw new Error(
					msg || `Expected nested property "${path}" to exist`
				);
			}
			current = current[part];
		}
	}
};

/**
 * Performance measurement helpers
 */
const performance = {
	/**
	 * Measures average execution time over multiple runs
	 * @param {Function} fn - Function to measure
	 * @param {number} iterations - Number of iterations
	 * @returns {Promise<{average: number, min: number, max: number}>}
	 */
	async measureAverage(fn, iterations = 10) {
		const times = [];
		for (let i = 0; i < iterations; i++) {
			const { duration } = await measureTime(fn);
			times.push(duration);
		}
		return {
			average: times.reduce((a, b) => a + b) / times.length,
			min: Math.min(...times),
			max: Math.max(...times)
		};
	},

	/**
	 * Benchmarks multiple functions and compares
	 * @param {Object} functions - Object with named functions to benchmark
	 * @param {number} iterations - Number of iterations per function
	 * @returns {Promise<Object>}
	 */
	async benchmark(functions, iterations = 10) {
		const results = {};
		for (const [name, fn] of Object.entries(functions)) {
			results[name] = await this.measureAverage(fn, iterations);
		}
		return results;
	}
};

module.exports = {
	// Document helpers
	createTestDocument,
	openDocument,
	createAndOpenDocument,
	createJsonDocument,
	createMultipleDocuments,
	closeAllEditors,
	
	// Editor helpers
	typeText,
	replaceText,
	getActiveEditorText,
	
	// Command helpers
	executeCommand,
	executeCommands,
	isCommandRegistered,
	getExtensionCommands,
	
	// Configuration helpers
	getConfig,
	updateConfig,
	withConfigValue,
	withToggledSetting,
	
	// Extension helpers
	getExtension,
	activateExtension,
	waitForSidebarReady,
	
	// IntelliSense helpers
	getCompletions,
	
	// Utility helpers
	sleep,
	measureTime,
	retry,
	waitForCondition,
	
	// Mock helpers
	createMockWebview,
	
	// Assertions
	assertions,
	
	// Performance
	performance
};

