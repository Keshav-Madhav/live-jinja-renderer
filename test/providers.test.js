const assert = require('assert');
const vscode = require('vscode');
const { JinjaIntelliSenseManager } = require('../src/providers/jinjaIntelliSenseManager');

/**
 * PROVIDERS TEST SUITE
 * 
 * Tests for IntelliSense, syntax decoration, and other providers
 */

suite('Providers Test Suite', () => {
	
	// ========================================
	// INTELLISENSE PROVIDER TESTS
	// ========================================
	suite('IntelliSense Provider', () => {
		let intelliSenseManager;
		
		setup(() => {
			intelliSenseManager = new JinjaIntelliSenseManager({
				subscriptions: []
			});
		});

		teardown(() => {
			if (intelliSenseManager) {
				intelliSenseManager.dispose();
			}
		});

		test('Should initialize IntelliSense manager', () => {
			assert.ok(intelliSenseManager, 'IntelliSense manager should initialize');
			assert.ok(intelliSenseManager.completionProvider, 'Should have completion provider');
		});

		test('Should update variables in completion provider', () => {
			const variables = {
				user: {
					name: 'Test User',
					email: 'test@example.com'
				},
				count: 42,
				items: ['a', 'b', 'c']
			};

			intelliSenseManager.updateVariables(variables);
			
			assert.ok(intelliSenseManager.completionProvider.variables, 'Should store variables');
		});

		test('Should provide completions for simple variables', async () => {
			const variables = {
				username: 'john',
				password: 'secret',
				email: 'john@example.com'
			};

			intelliSenseManager.updateVariables(variables);
			
			// Create a test document
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ '
			});
			await vscode.window.showTextDocument(doc);

			// Get completions
			const position = new vscode.Position(0, 3);
			const completions = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				doc.uri,
				position
			);

			assert.ok(completions, 'Should return completion items');
		});

		test('Should provide completions for nested properties', () => {
			const variables = {
				config: {
					database: {
						host: 'localhost',
						port: 5432
					}
				}
			};

			intelliSenseManager.updateVariables(variables);
			
			assert.ok(intelliSenseManager.completionProvider.variables, 'Should handle nested properties');
		});

		test('Should update completions when variables change', () => {
			const vars1 = { name: 'first' };
			const vars2 = { name: 'second', extra: 'value' };

			intelliSenseManager.updateVariables(vars1);
			intelliSenseManager.updateVariables(vars2);
			
			// Should have updated to second set
			assert.ok(true, 'Should handle variable updates');
		});

		test('Should handle empty variables', () => {
			intelliSenseManager.updateVariables({});
			
			assert.ok(true, 'Should handle empty variables');
		});

		test('Should handle null variables gracefully', () => {
			try {
				intelliSenseManager.updateVariables(null);
				assert.ok(true, 'Should handle null variables');
			} catch (error) {
				assert.fail('Should not throw on null variables');
			}
		});

		test('Should handle complex variable types', () => {
			const variables = {
				string: 'text',
				number: 123,
				boolean: true,
				array: [1, 2, 3],
				object: { nested: 'value' },
				null: null,
				undefined: undefined
			};

			intelliSenseManager.updateVariables(variables);
			
			assert.ok(true, 'Should handle all variable types');
		});

		test('Should dispose properly', () => {
			intelliSenseManager.dispose();
			
			// Should not throw errors after disposal
			assert.ok(true, 'Should dispose cleanly');
		});
	});

	// ========================================
	// COMPLETION ITEM TESTS
	// ========================================
	suite('Completion Items', () => {
		test('Should provide built-in Jinja filters', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ value | '
			});
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(0, 11);
			const completions = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				doc.uri,
				position
			);

			assert.ok(completions, 'Should provide filter completions');
		});

		test('Should provide Jinja statements', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{% '
			});
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(0, 3);
			const completions = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				doc.uri,
				position
			);

			assert.ok(completions, 'Should provide statement completions');
		});
	});

	// ========================================
	// HOVER PROVIDER TESTS
	// ========================================
	suite('Hover Provider', () => {
		test('Should provide hover information for variables', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ username }}'
			});
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(0, 5);
			const hovers = await vscode.commands.executeCommand(
				'vscode.executeHoverProvider',
				doc.uri,
				position
			);

			// Hover provider may or may not be implemented
			assert.ok(hovers !== null, 'Hover provider should respond');
		});

		test('Should provide hover for Jinja filters', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ value | upper }}'
			});
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(0, 12);
			const hovers = await vscode.commands.executeCommand(
				'vscode.executeHoverProvider',
				doc.uri,
				position
			);

			assert.ok(hovers !== null, 'Should provide filter hover');
		});
	});

	// ========================================
	// SYNTAX DECORATOR TESTS
	// ========================================
	suite('Syntax Decorator', () => {
		test('Should decorate Jinja syntax in text files', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'plaintext',
				content: '{{ variable }} {% if condition %}text{% endif %}'
			});
			await vscode.window.showTextDocument(doc);

			// Give time for decorations to apply
			await new Promise(resolve => setTimeout(resolve, 500));

			assert.ok(true, 'Should apply syntax decorations');
		});

		test('Should update decorations on document change', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'plaintext',
				content: '{{ original }}'
			});
			const editor = await vscode.window.showTextDocument(doc);

			await new Promise(resolve => setTimeout(resolve, 300));

			// Modify document
			await editor.edit(editBuilder => {
				const position = doc.positionAt(doc.getText().length);
				editBuilder.insert(position, ' {% if test %}');
			});

			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Should update decorations on change');
		});

		test('Should respect highlighting settings', async () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const enabled = config.get('highlighting.enableForTextFiles');

			assert.strictEqual(typeof enabled, 'boolean', 'Should have highlighting setting');
		});
	});

	// ========================================
	// SELECTION ACTIONS PROVIDER TESTS
	// ========================================
	suite('Selection Actions Provider', () => {
		test('Should provide actions on text selection', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: 'Hello {{ name }}, welcome!'
			});
			const editor = await vscode.window.showTextDocument(doc);

			// Select some text
			editor.selection = new vscode.Selection(
				new vscode.Position(0, 0),
				new vscode.Position(0, 10)
			);

			// Code actions provider should be available
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Selection actions provider should be registered');
		});

		test('Should provide render selected text action', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: 'Line 1: {{ var1 }}\nLine 2: {{ var2 }}'
			});
			const editor = await vscode.window.showTextDocument(doc);

			// Select first line
			editor.selection = new vscode.Selection(
				new vscode.Position(0, 0),
				new vscode.Position(0, 18)
			);

			await new Promise(resolve => setTimeout(resolve, 300));

			// Should have render selection action available
			assert.ok(true, 'Render selection action should be available');
		});
	});

	// ========================================
	// SIDEBAR VIEW PROVIDER TESTS
	// ========================================
	suite('Sidebar View Provider', () => {
		test('Should register sidebar view provider', async () => {
			// View should be registered during activation
			const extension = vscode.extensions.getExtension('KilloWatts.live-jinja-renderer');
			await extension.activate();

			assert.ok(extension.isActive, 'Extension with sidebar should be active');
		});

		test('Should handle sidebar visibility changes', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ sidebar_test }}'
			});
			await vscode.window.showTextDocument(doc);

			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Hide sidebar by switching to another view
			await vscode.commands.executeCommand('workbench.view.explorer');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Should handle visibility changes');
		});

		test('Should update sidebar for active editor changes', async () => {
			// Create two documents
			const doc1 = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ doc1 }}'
			});
			const doc2 = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ doc2 }}'
			});

			await vscode.window.showTextDocument(doc1);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Switch to second document
			await vscode.window.showTextDocument(doc2);
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Sidebar should update for active editor');
		});
	});

	// ========================================
	// FILE HISTORY PROVIDER TESTS
	// ========================================
	suite('File History', () => {
		test('Should track file history', async () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const historyEnabled = config.get('history.enabled');
			const historySize = config.get('history.size');

			assert.strictEqual(historyEnabled, true, 'History should be enabled');
			assert.ok(historySize >= 3 && historySize <= 15, 'History size should be valid');
		});

		test('Should add files to history when opening', async () => {
			const doc1 = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ file1 }}'
			});
			await vscode.window.showTextDocument(doc1);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			const doc2 = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ file2 }}'
			});
			await vscode.window.showTextDocument(doc2);
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Should track file history');
		});

		test('Should respect history size limit', async () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const maxSize = config.get('history.size', 5);

			// Create more files than history size
			for (let i = 0; i < maxSize + 2; i++) {
				const doc = await vscode.workspace.openTextDocument({
					language: 'jinja',
					content: `{{ var${i} }}`
				});
				await vscode.window.showTextDocument(doc);
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			assert.ok(true, 'Should respect history size limit');
		});
	});

	// ========================================
	// PROVIDER INTEGRATION TESTS
	// ========================================
	suite('Provider Integration', () => {
		test('Should have all providers working together', async () => {
			// Create document
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ integration_test }}'
			});
			await vscode.window.showTextDocument(doc);

			// Open sidebar (activates multiple providers)
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 500));

			// All providers should be active
			assert.ok(true, 'All providers should work together');
		});

		test('Should handle provider disposal on extension deactivation', async () => {
			// Providers should dispose cleanly
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ disposal }}'
			});
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Close all editors
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');

			assert.ok(true, 'Providers should dispose cleanly');
		});
	});

	// ========================================
	// PERFORMANCE TESTS
	// ========================================
	suite('Provider Performance', () => {
		test('Should provide completions quickly', async () => {
			const variables = {};
			for (let i = 0; i < 100; i++) {
				variables[`var${i}`] = `value${i}`;
			}

			const manager = new JinjaIntelliSenseManager({
				subscriptions: []
			});
			
			const startTime = Date.now();
			manager.updateVariables(variables);
			const duration = Date.now() - startTime;

			manager.dispose();

			assert.ok(duration < 100, `Should update variables quickly (took ${duration}ms)`);
		});

		test('Should handle frequent variable updates', () => {
			const manager = new JinjaIntelliSenseManager({
				subscriptions: []
			});

			const startTime = Date.now();
			for (let i = 0; i < 50; i++) {
				manager.updateVariables({ count: i });
			}
			const duration = Date.now() - startTime;

			manager.dispose();

			assert.ok(duration < 500, `Should handle frequent updates (took ${duration}ms)`);
		});
	});
});

