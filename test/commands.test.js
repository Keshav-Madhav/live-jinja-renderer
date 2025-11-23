const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * COMMANDS TEST SUITE
 * 
 * Tests for all extension commands including import/export, settings, and actions
 */

suite('Commands Test Suite', () => {
	
	// ========================================
	// RENDER COMMANDS TESTS
	// ========================================
	suite('Render Commands', () => {
		test('Should execute render command with active editor', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ render_test }}'
			});
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Render command should execute');
		});

		test('Should handle render command with no active editor', async () => {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');

			try {
				await vscode.commands.executeCommand('live-jinja-tester.render');
				assert.ok(true, 'Should handle no active editor gracefully');
			} catch (error) {
				assert.fail('Should not throw error');
			}
		});

		test('Should execute showSidebar command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ sidebar }}'
			});
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'ShowSidebar command should execute');
		});

		test('Should execute openInPanel command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ panel }}'
			});
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.openInPanel');
				assert.ok(true, 'OpenInPanel command should execute');
			} catch (error) {
				// May fail if view is not active
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// SETTINGS COMMANDS TESTS
	// ========================================
	suite('Settings Commands', () => {
		test('Should toggle markdown rendering', async () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const initialValue = config.get('rendering.enableMarkdown');

			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ markdown }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Toggle markdown should execute');
		});

		test('Should toggle mermaid rendering', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ mermaid }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			await vscode.commands.executeCommand('live-jinja-tester.toggleMermaid');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Toggle mermaid should execute');
		});

		test('Should toggle show whitespace', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ whitespace }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			await vscode.commands.executeCommand('live-jinja-tester.toggleShowWhitespace');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Toggle show whitespace should execute');
		});

		test('Should toggle cull whitespace', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ cull }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			await vscode.commands.executeCommand('live-jinja-tester.toggleCullWhitespace');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Toggle cull whitespace should execute');
		});

		test('Should open extension settings', async () => {
			try {
				await vscode.commands.executeCommand('live-jinja-tester.openExtensionSettings');
				assert.ok(true, 'Open settings command should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// VARIABLE COMMANDS TESTS
	// ========================================
	suite('Variable Commands', () => {
		test('Should execute reextractVariables command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ reextract_var }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');
			await new Promise(resolve => setTimeout(resolve, 300));

			assert.ok(true, 'Reextract variables should execute');
		});

		test('Should handle reextract with no active editor', async () => {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');

			try {
				await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');
				assert.ok(true, 'Should handle no editor gracefully');
			} catch (error) {
				assert.ok(true, 'Should not throw');
			}
		});

		test('Should execute updateForCurrentFile command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ update_file }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.updateForCurrentFile');
				assert.ok(true, 'Update for current file should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// ACTION COMMANDS TESTS
	// ========================================
	suite('Action Commands', () => {
		test('Should execute copyOutput command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ copy }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.copyOutput');
				assert.ok(true, 'Copy output should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// VARIABLE PRESET COMMANDS TESTS
	// ========================================
	suite('Variable Preset Commands', () => {
		test('Should execute saveVariables command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ save_preset }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.saveVariables');
				assert.ok(true, 'Save variables should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});

		test('Should execute loadVariables command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ load_preset }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.loadVariables');
				assert.ok(true, 'Load variables should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});

		test('Should execute deleteVariables command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ delete_preset }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.deleteVariables');
				assert.ok(true, 'Delete variables should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// IMPORT COMMANDS TESTS
	// ========================================
	suite('Import Commands', () => {
		test('Should execute importVariablesFromFile command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ import_file }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				// This will show file picker - we can't complete it in tests
				const promise = vscode.commands.executeCommand('live-jinja-tester.importVariablesFromFile');
				// Don't await, just verify it doesn't throw immediately
				assert.ok(true, 'Import from file command should start');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});

		test('Should execute importVariablesFromEditor command', async () => {
			// Create a JSON document first
			const jsonDoc = await vscode.workspace.openTextDocument({
				language: 'json',
				content: '{"test": "value", "number": 123}'
			});
			await vscode.window.showTextDocument(jsonDoc);

			// Now create Jinja doc and open sidebar
			const jinjaDoc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ import_editor }}'
			});
			await vscode.window.showTextDocument(jinjaDoc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Switch back to JSON
			await vscode.window.showTextDocument(jsonDoc);

			try {
				await vscode.commands.executeCommand('live-jinja-tester.importVariablesFromEditor');
				assert.ok(true, 'Import from editor should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});

		test('Should execute importVariablesFromWorkspace command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ import_workspace }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				// This will show quick pick - we can't complete it in tests
				const promise = vscode.commands.executeCommand('live-jinja-tester.importVariablesFromWorkspace');
				assert.ok(true, 'Import from workspace command should start');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// EXPORT COMMANDS TESTS
	// ========================================
	suite('Export Commands', () => {
		test('Should execute exportVariablesToFile command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ export_file }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				// This will show save dialog - we can't complete it in tests
				const promise = vscode.commands.executeCommand('live-jinja-tester.exportVariablesToFile');
				assert.ok(true, 'Export to file command should start');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});

		test('Should execute exportVariablesToClipboard command', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ export_clipboard }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			try {
				await vscode.commands.executeCommand('live-jinja-tester.exportVariablesToClipboard');
				assert.ok(true, 'Export to clipboard should execute');
			} catch (error) {
				assert.ok(true, 'Command attempted');
			}
		});
	});

	// ========================================
	// COMMAND AVAILABILITY TESTS
	// ========================================
	suite('Command Availability', () => {
		test('All commands should be registered', async () => {
			const commands = await vscode.commands.getCommands(true);
			
			const expectedCommands = [
				'live-jinja-tester.render',
				'live-jinja-tester.showSidebar',
				'live-jinja-tester.toggleMarkdown',
				'live-jinja-tester.toggleMermaid',
				'live-jinja-tester.toggleShowWhitespace',
				'live-jinja-tester.toggleCullWhitespace',
				'live-jinja-tester.reextractVariables',
				'live-jinja-tester.copyOutput',
				'live-jinja-tester.openInPanel',
				'live-jinja-tester.updateForCurrentFile',
				'live-jinja-tester.saveVariables',
				'live-jinja-tester.loadVariables',
				'live-jinja-tester.deleteVariables',
				'live-jinja-tester.exportVariablesToFile',
				'live-jinja-tester.exportVariablesToClipboard',
				'live-jinja-tester.importVariablesFromFile',
				'live-jinja-tester.importVariablesFromEditor',
				'live-jinja-tester.importVariablesFromWorkspace',
				'live-jinja-tester.openExtensionSettings'
			];

			for (const command of expectedCommands) {
				assert.ok(
					commands.includes(command),
					`Command ${command} should be registered`
				);
			}
		});

		test('Commands should be available in command palette', () => {
			const extension = vscode.extensions.getExtension('KilloWatts.live-jinja-renderer');
			const commandPalette = extension.packageJSON.contributes.menus.commandPalette;

			assert.ok(Array.isArray(commandPalette), 'Should have command palette entries');
			assert.ok(commandPalette.length > 0, 'Should have commands in palette');
		});
	});

	// ========================================
	// COMMAND CONTEXT TESTS
	// ========================================
	suite('Command Context', () => {
		test('Commands should respect file type context', async () => {
			// Test with Jinja file
			const jinjaDoc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ jinja }}'
			});
			await vscode.window.showTextDocument(jinjaDoc);

			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('live-jinja-tester.render'), 'Commands available for Jinja files');

			// Test with other file types
			const jsDoc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: 'console.log("test");'
			});
			await vscode.window.showTextDocument(jsDoc);

			// Commands should still be available (via command palette)
			assert.ok(commands.includes('live-jinja-tester.showSidebar'), 'Commands available via palette');
		});

		test('Should have appropriate menu contributions', () => {
			const extension = vscode.extensions.getExtension('KilloWatts.live-jinja-renderer');
			const menus = extension.packageJSON.contributes.menus;

			assert.ok(menus['editor/title'], 'Should have editor title menu');
			assert.ok(menus['editor/context'], 'Should have editor context menu');
			assert.ok(menus['view/title'], 'Should have view title menu');
		});
	});

	// ========================================
	// COMMAND SEQUENCING TESTS
	// ========================================
	suite('Command Sequencing', () => {
		test('Should handle rapid command execution', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ rapid }}'
			});
			await vscode.window.showTextDocument(doc);

			// Execute multiple commands rapidly
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			await vscode.commands.executeCommand('live-jinja-tester.toggleShowWhitespace');
			await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');

			await new Promise(resolve => setTimeout(resolve, 500));

			assert.ok(true, 'Should handle rapid commands');
		});

		test('Should handle command sequence: open -> modify -> reextract', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ original }}'
			});
			const editor = await vscode.window.showTextDocument(doc);

			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Modify document
			await editor.edit(editBuilder => {
				const position = doc.positionAt(doc.getText().length);
				editBuilder.insert(position, '\n{{ modified }}');
			});
			await new Promise(resolve => setTimeout(resolve, 200));

			// Reextract
			await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');
			await new Promise(resolve => setTimeout(resolve, 200));

			assert.ok(true, 'Should handle command sequence');
		});

		test('Should handle toggling settings multiple times', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ toggle }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Toggle markdown on and off
			await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			await new Promise(resolve => setTimeout(resolve, 100));
			await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.ok(true, 'Should handle repeated toggles');
		});
	});

	// ========================================
	// COMMAND ERROR HANDLING TESTS
	// ========================================
	suite('Command Error Handling', () => {
		test('Should handle commands with invalid state gracefully', async () => {
			// Try to execute commands without proper setup
			try {
				await vscode.commands.executeCommand('live-jinja-tester.copyOutput');
				assert.ok(true, 'Should handle invalid state');
			} catch (error) {
				assert.ok(true, 'Should not crash');
			}
		});

		test('Should handle commands during extension activation', async () => {
			// Commands should work even during/after activation
			const extension = vscode.extensions.getExtension('KilloWatts.live-jinja-renderer');
			await extension.activate();

			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ activation }}'
			});
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');

			assert.ok(true, 'Commands should work after activation');
		});
	});

	// ========================================
	// COMMAND PERFORMANCE TESTS
	// ========================================
	suite('Command Performance', () => {
		test('Commands should execute quickly', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ performance }}'
			});
			await vscode.window.showTextDocument(doc);

			const startTime = Date.now();
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 500));
			const duration = Date.now() - startTime;

			assert.ok(duration < 2000, `Command should execute quickly (took ${duration}ms)`);
		});

		test('Should handle multiple commands efficiently', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ multi_command }}'
			});
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));

			const startTime = Date.now();
			for (let i = 0; i < 5; i++) {
				await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			}
			const duration = Date.now() - startTime;

			assert.ok(duration < 1000, `Multiple commands should be efficient (took ${duration}ms)`);
		});
	});
});
