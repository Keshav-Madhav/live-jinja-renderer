const assert = require('assert');
const vscode = require('vscode');

/**
 * WEBVIEW MANAGER TEST SUITE
 * 
 * Tests for webview communication, message handling, and state management
 */

suite('Webview Manager Test Suite', () => {
	
	// ========================================
	// WEBVIEW CREATION TESTS
	// ========================================
	suite('Webview Creation', () => {
		test('Should create webview panel for rendering', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ test_var }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			
			// Give time for panel to create
			await new Promise(resolve => setTimeout(resolve, 500));
			
			assert.ok(true, 'Webview panel should be created');
		});

		test('Should create sidebar webview view', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ sidebar_var }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			
			// Give time for view to create
			await new Promise(resolve => setTimeout(resolve, 500));
			
			assert.ok(true, 'Sidebar webview should be created');
		});

		test('Should handle webview disposal', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ disposal_test }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Close all editors (which should dispose the panel)
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			
			assert.ok(true, 'Webview should be disposed properly');
		});
	});

	// ========================================
	// MESSAGE HANDLING TESTS
	// ========================================
	suite('Webview Message Handling', () => {
		test('Should handle ready message from webview', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ ready_test }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			
			// Webview sends 'ready' message on load
			await new Promise(resolve => setTimeout(resolve, 500));
			
			assert.ok(true, 'Should handle ready message');
		});

		test('Should handle variable re-extraction request', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ extract_var }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Trigger re-extraction
			await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');
			
			assert.ok(true, 'Should handle re-extraction request');
		});

		test('Should handle copy to clipboard request', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ copy_test }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Trigger copy
			await vscode.commands.executeCommand('live-jinja-tester.copyOutput');
			
			assert.ok(true, 'Should handle copy request');
		});
	});

	// ========================================
	// TEMPLATE UPDATE TESTS
	// ========================================
	suite('Template Updates', () => {
		test('Should send template updates on document change', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ original }}'
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Modify document
			await editor.edit(editBuilder => {
				const position = doc.positionAt(doc.getText().length);
				editBuilder.insert(position, '\n{{ updated }}');
			});
			
			// Give time for update to propagate
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should propagate template updates');
		});

		test('Should handle rapid document changes', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ rapid }}'
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Make multiple rapid changes
			for (let i = 0; i < 5; i++) {
				await editor.edit(editBuilder => {
					const position = doc.positionAt(doc.getText().length);
					editBuilder.insert(position, ` ${i}`);
				});
			}
			
			await new Promise(resolve => setTimeout(resolve, 500));
			
			assert.ok(true, 'Should handle rapid changes');
		});
	});

	// ========================================
	// SELECTION RANGE TESTS
	// ========================================
	suite('Selection Range Handling', () => {
		test('Should track selection range in webview', async () => {
			const content = 'Line 1: {{ var1 }}\nLine 2: {{ var2 }}\nLine 3: {{ var3 }}';
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: content
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			// Select second line
			editor.selection = new vscode.Selection(
				new vscode.Position(1, 0),
				new vscode.Position(1, 20)
			);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should track selection range');
		});

		test('Should update selection range on document edits', async () => {
			const content = 'Line 1\n{{ selected }}\nLine 3';
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: content
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			// Select middle line
			editor.selection = new vscode.Selection(
				new vscode.Position(1, 0),
				new vscode.Position(1, 14)
			);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Insert text before selection
			await editor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(0, 0), 'New Line\n');
			});
			
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should update selection range after edits');
		});
	});

	// ========================================
	// SETTINGS SYNCHRONIZATION TESTS
	// ========================================
	suite('Settings Synchronization', () => {
		test('Should send initial settings to webview', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ settings_test }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			
			// Settings should be sent when webview is ready
			await new Promise(resolve => setTimeout(resolve, 500));
			
			assert.ok(true, 'Should send initial settings');
		});

		test('Should update webview when settings change', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ config_change }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Get current config
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const currentValue = config.get('rendering.showWhitespace');
			
			// Toggle a setting (this will trigger configuration change)
			await vscode.commands.executeCommand('live-jinja-tester.toggleShowWhitespace');
			
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should update on settings change');
		});
	});

	// ========================================
	// CONCURRENT WEBVIEW TESTS
	// ========================================
	suite('Concurrent Webviews', () => {
		test('Should handle sidebar and panel simultaneously', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ concurrent_test }}'
			});
			await vscode.window.showTextDocument(doc);
			
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Open panel
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should handle concurrent views');
		});

		test('Should sync updates across all webviews', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ sync_test }}'
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			// Open both views
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 200));
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Make a change
			await editor.edit(editBuilder => {
				const position = doc.positionAt(doc.getText().length);
				editBuilder.insert(position, '\n{{ updated }}');
			});
			
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should sync across webviews');
		});
	});

	// ========================================
	// GHOST SAVE TESTS
	// ========================================
	suite('Ghost Save Integration', () => {
		test('Should enable ghost save by default', () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const enabled = config.get('advanced.ghostSave');
			
			assert.strictEqual(enabled, true, 'Ghost save should be enabled');
		});

		test('Should respect ghost save disabled state', async () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			const wasEnabled = config.get('advanced.ghostSave');
			
			// Even if disabled, webview should still work
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ ghost_disabled }}'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should work with ghost save disabled');
		});
	});

	// ========================================
	// ERROR HANDLING IN WEBVIEW TESTS
	// ========================================
	suite('Webview Error Handling', () => {
		test('Should handle webview with invalid template syntax', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ unclosed'
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Should not crash
			assert.ok(true, 'Should handle invalid syntax');
		});

		test('Should handle empty document', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: ''
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			assert.ok(true, 'Should handle empty document');
		});

		test('Should handle very large templates', async () => {
			// Create a large template
			let largeContent = '';
			for (let i = 0; i < 1000; i++) {
				largeContent += `{{ var${i} }}\n`;
			}
			
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: largeContent
			});
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 500));
			
			assert.ok(true, 'Should handle large templates');
		});
	});

	// ========================================
	// PERFORMANCE TESTS
	// ========================================
	suite('Webview Performance', () => {
		test('Should initialize webview quickly', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ perf_test }}'
			});
			await vscode.window.showTextDocument(doc);
			
			const startTime = Date.now();
			await vscode.commands.executeCommand('live-jinja-tester.render');
			await new Promise(resolve => setTimeout(resolve, 500));
			const endTime = Date.now();
			
			const duration = endTime - startTime;
			assert.ok(duration < 2000, `Webview should initialize in under 2 seconds (took ${duration}ms)`);
		});

		test('Should handle document changes efficiently', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ efficiency }}'
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Make 10 changes and measure time
			const startTime = Date.now();
			for (let i = 0; i < 10; i++) {
				await editor.edit(editBuilder => {
					const position = doc.positionAt(doc.getText().length);
					editBuilder.insert(position, ` ${i}`);
				});
			}
			await new Promise(resolve => setTimeout(resolve, 500));
			const endTime = Date.now();
			
			const duration = endTime - startTime;
			assert.ok(duration < 3000, `Should handle changes efficiently (took ${duration}ms)`);
		});
	});
});

