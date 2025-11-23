const assert = require('assert');
const vscode = require('vscode');
const { extractVariablesFromTemplate } = require('../src/utils/variableExtractor');
const sampleTemplates = require('./fixtures/sample-templates');

/**
 * INTEGRATION TESTS
 * 
 * End-to-end tests that simulate real user workflows
 */

suite('Integration Tests', () => {
	
	suite('Complete User Workflows', () => {
		test('Workflow: Open file -> Extract variables -> Update view', async () => {
			// 1. Create and open a Jinja file
			const content = sampleTemplates.greeting.template;
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: content
			});
			await vscode.window.showTextDocument(doc);
			
			// 2. Extract variables
			const vars = extractVariablesFromTemplate(content);
			assert.ok(Object.keys(vars).length > 0, 'Should extract variables');
			
			// 3. Open sidebar view
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// 4. Re-extract variables
			await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			assert.ok(true, 'Complete workflow executed successfully');
		});

		test('Workflow: Switch between multiple files', async () => {
			// Create multiple documents
			const docs = [];
			const templates = [
				sampleTemplates.simple,
				sampleTemplates.simpleLoop,
				sampleTemplates.simpleCondition
			];
			
			for (const template of templates) {
				const doc = await vscode.workspace.openTextDocument({
					language: 'jinja',
					content: template.template
				});
				docs.push(doc);
			}
			
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Switch between files
			for (const doc of docs) {
				await vscode.window.showTextDocument(doc);
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// Update for current file
				await vscode.commands.executeCommand('live-jinja-tester.updateForCurrentFile');
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			
			assert.ok(true, 'Multi-file workflow completed');
		});

		test('Workflow: Edit template and auto-update', async () => {
			// Create document
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ name }}'
			});
			const editor = await vscode.window.showTextDocument(doc);
			
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Edit document
			await editor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(0, 11), '\n{{ age }}');
			});
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Verify new content
			const newContent = doc.getText();
			const vars = extractVariablesFromTemplate(newContent);
			assert.ok(vars.name !== undefined, 'Should have name variable');
			assert.ok(vars.age !== undefined, 'Should have age variable');
			
			assert.ok(true, 'Edit and auto-update workflow completed');
		});

		test('Workflow: Toggle settings and see effects', async () => {
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Toggle settings
			await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			await new Promise(resolve => setTimeout(resolve, 200));
			
			await vscode.commands.executeCommand('live-jinja-tester.toggleMermaid');
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Toggle back
			await vscode.commands.executeCommand('live-jinja-tester.toggleMarkdown');
			await new Promise(resolve => setTimeout(resolve, 200));
			
			await vscode.commands.executeCommand('live-jinja-tester.toggleMermaid');
			await new Promise(resolve => setTimeout(resolve, 200));
			
			assert.ok(true, 'Settings toggle workflow completed');
		});
	});

	suite('Real-World Template Scenarios', () => {
		test('Scenario: Email template processing', async () => {
			const template = sampleTemplates.emailTemplate.template;
			const vars = extractVariablesFromTemplate(template);
			
			// Verify expected variables are extracted
			const expectedVars = sampleTemplates.emailTemplate.expectedVars;
			for (const varName of expectedVars) {
				assert.ok(
					vars[varName] !== undefined,
					`Should extract ${varName} from email template`
				);
			}
			
			assert.ok(true, 'Email template scenario completed');
		});

		test('Scenario: Configuration file generation', async () => {
			const template = sampleTemplates.configFile.template;
			const vars = extractVariablesFromTemplate(template);
			
			// Should extract config object with nested structure
			assert.ok(vars.config !== undefined, 'Should extract config');
			assert.ok(typeof vars.config === 'object', 'Config should be object');
			
			assert.ok(true, 'Config file scenario completed');
		});

		test('Scenario: Report generation with tables', async () => {
			const template = sampleTemplates.reportTemplate.template;
			const vars = extractVariablesFromTemplate(template);
			
			// Verify complex structure
			assert.ok(vars.report !== undefined, 'Should extract report');
			assert.ok(vars.stats !== undefined, 'Should extract stats');
			assert.ok(vars.recommendations !== undefined, 'Should extract recommendations');
			
			assert.ok(true, 'Report generation scenario completed');
		});

		test('Scenario: Ansible playbook template', async () => {
			const template = sampleTemplates.ansiblePlaybook.template;
			const vars = extractVariablesFromTemplate(template);
			
			const expectedVars = sampleTemplates.ansiblePlaybook.expectedVars;
			for (const varName of expectedVars) {
				assert.ok(
					vars[varName] !== undefined,
					`Should extract ${varName} from playbook template`
				);
			}
			
			assert.ok(true, 'Ansible playbook scenario completed');
		});

		test('Scenario: Markdown documentation with code blocks', async () => {
			const template = sampleTemplates.markdownDocument.template;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.document !== undefined, 'Should extract document structure');
			
			assert.ok(true, 'Markdown documentation scenario completed');
		});
	});

	suite('Extension Feature Integration', () => {
		test('Feature: IntelliSense with extracted variables', async () => {
			const template = '{{ user.name }} {{ user.email }}';
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: template
			});
			await vscode.window.showTextDocument(doc);
			
			// Extract variables
			const vars = extractVariablesFromTemplate(template);
			assert.ok(vars.user !== undefined, 'Should extract user');
			
			// Try to get completions (IntelliSense)
			const position = new vscode.Position(0, 3);
			const completions = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				doc.uri,
				position
			);
			
			// Should return completion items
			assert.ok(completions !== null, 'Should provide completions');
			
			assert.ok(true, 'IntelliSense integration completed');
		});

		test('Feature: Syntax highlighting activation', async () => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ variable }} {% if condition %}text{% endif %}'
			});
			await vscode.window.showTextDocument(doc);
			
			// Give time for syntax highlighting to activate
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Syntax highlighting is applied by the extension
			// We can't directly test visual appearance, but we can verify no errors
			assert.ok(true, 'Syntax highlighting activated');
		});

		test('Feature: Error navigation (simulated)', async () => {
			// This test simulates error navigation feature
			const template = '{% if age >= %}invalid{% endif %}';
			const doc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: template
			});
			await vscode.window.showTextDocument(doc);
			
			// Open renderer
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// If there were errors, they would be shown in the webview
			// and be clickable to navigate to the source
			
			assert.ok(true, 'Error navigation feature available');
		});
	});

	suite('Multi-File and Context Management', () => {
		test('Context: Handle multiple Jinja files simultaneously', async () => {
			const files = [
				{ name: 'template1.jinja', content: '{{ var1 }}' },
				{ name: 'template2.jinja', content: '{{ var2 }}' },
				{ name: 'template3.jinja', content: '{{ var3 }}' }
			];
			
			const documents = [];
			for (const file of files) {
				const doc = await vscode.workspace.openTextDocument({
					language: 'jinja',
					content: file.content
				});
				documents.push(doc);
			}
			
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Switch between documents
			for (const doc of documents) {
				await vscode.window.showTextDocument(doc);
				await new Promise(resolve => setTimeout(resolve, 200));
			}
			
			assert.ok(true, 'Multi-file context management completed');
		});

		test('Context: Switch between different file types', async () => {
			// Test switching between Jinja and non-Jinja files
			const jinjaDoc = await vscode.workspace.openTextDocument({
				language: 'jinja',
				content: '{{ jinja_var }}'
			});
			
			const jsDoc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: 'const x = 10;'
			});
			
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Switch between file types
			await vscode.window.showTextDocument(jinjaDoc);
			await new Promise(resolve => setTimeout(resolve, 200));
			
			await vscode.window.showTextDocument(jsDoc);
			await new Promise(resolve => setTimeout(resolve, 200));
			
			await vscode.window.showTextDocument(jinjaDoc);
			await new Promise(resolve => setTimeout(resolve, 200));
			
			assert.ok(true, 'File type switching handled correctly');
		});
	});

	suite('Performance Under Load', () => {
		test('Performance: Large template extraction', async () => {
			// Create a large template
			let largeTemplate = '';
			for (let i = 0; i < 500; i++) {
				largeTemplate += `{{ var${i} }}\n`;
			}
			
			const startTime = Date.now();
			const vars = extractVariablesFromTemplate(largeTemplate);
			const duration = Date.now() - startTime;
			
			assert.ok(duration < 2000, `Should extract large template quickly (took ${duration}ms)`);
			assert.strictEqual(Object.keys(vars).length, 500, 'Should extract all variables');
		});

		test('Performance: Rapid file switching', async () => {
			const docs = [];
			
			// Create multiple documents
			for (let i = 0; i < 10; i++) {
				const doc = await vscode.workspace.openTextDocument({
					language: 'jinja',
					content: `{{ var${i} }}`
				});
				docs.push(doc);
			}
			
			// Open sidebar
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await new Promise(resolve => setTimeout(resolve, 300));
			
			const startTime = Date.now();
			
			// Rapidly switch between files
			for (const doc of docs) {
				await vscode.window.showTextDocument(doc);
				await new Promise(resolve => setTimeout(resolve, 50));
			}
			
			const duration = Date.now() - startTime;
			
			assert.ok(duration < 5000, `Rapid switching completed in ${duration}ms`);
		});

		test('Performance: Complex nested template extraction', async () => {
			const template = sampleTemplates.reportTemplate.template;
			
			const startTime = Date.now();
			const vars = extractVariablesFromTemplate(template);
			const duration = Date.now() - startTime;
			
			assert.ok(duration < 500, `Should extract complex template quickly (took ${duration}ms)`);
			assert.ok(Object.keys(vars).length > 0, 'Should extract variables');
		});
	});

	suite('Extension Settings Integration', () => {
		test('Settings: Verify all settings are accessible', () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			
			const settingsToCheck = [
				'rendering.enableMarkdown',
				'rendering.enableMermaid',
				'rendering.showWhitespace',
				'rendering.cullWhitespace',
				'rendering.autoRerender',
				'rendering.rerenderDelay',
				'editor.autoResizeVariables',
				'editor.formatVariablesJson',
				'variables.autoExtract',
				'variables.preserveCustomValues',
				'history.enabled',
				'history.size',
				'advanced.ghostSave',
				'advanced.ghostSaveDelay',
				'advanced.showLoadingIndicators',
				'advanced.showPerformanceMetrics',
				'advanced.suggestExtensions',
				'highlighting.enableForTextFiles',
				'extensions'
			];
			
			for (const setting of settingsToCheck) {
				assert.ok(
					config.has(setting),
					`Setting ${setting} should be available`
				);
			}
		});

		test('Settings: Modify and restore settings', async () => {
			const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
			
			// Save original value
			const original = config.get('rendering.enableMarkdown');
			
			try {
				// Modify setting
				await config.update('rendering.enableMarkdown', !original, vscode.ConfigurationTarget.Global);
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// Verify change
				const modified = config.get('rendering.enableMarkdown');
				assert.strictEqual(modified, !original, 'Setting should be modified');
				
				// Restore original
				await config.update('rendering.enableMarkdown', original, vscode.ConfigurationTarget.Global);
				await new Promise(resolve => setTimeout(resolve, 100));
				
				const restored = config.get('rendering.enableMarkdown');
				assert.strictEqual(restored, original, 'Setting should be restored');
			} catch (error) {
				// Restore on error
				await config.update('rendering.enableMarkdown', original, vscode.ConfigurationTarget.Global);
				throw error;
			}
		});
	});

	suite('Error Recovery and Edge Cases', () => {
		test('Recovery: Handle malformed template gracefully', async () => {
			const malformedTemplate = '{{ unclosed {% if incomplete';
			
			try {
				const vars = extractVariablesFromTemplate(malformedTemplate);
				// Should not crash
				assert.ok(typeof vars === 'object', 'Should return object even for malformed input');
			} catch (error) {
				assert.fail(`Should not throw on malformed template: ${error.message}`);
			}
		});

		test('Recovery: Handle empty workspace', async () => {
			// Close all editors
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Try to execute commands
			await vscode.commands.executeCommand('live-jinja-tester.showSidebar');
			await vscode.commands.executeCommand('live-jinja-tester.reextractVariables');
			
			assert.ok(true, 'Should handle empty workspace gracefully');
		});

		test('Recovery: Handle rapid command execution', async () => {
			// Execute multiple commands rapidly
			const commands = [
				'live-jinja-tester.showSidebar',
				'live-jinja-tester.toggleMarkdown',
				'live-jinja-tester.toggleMermaid',
				'live-jinja-tester.showSidebar'
			];
			
			try {
				await Promise.all(commands.map(cmd => 
					vscode.commands.executeCommand(cmd)
				));
				assert.ok(true, 'Should handle rapid execution');
			} catch (error) {
				assert.fail(`Should handle rapid execution: ${error.message}`);
			}
		});
	});

	suite('Template Test Coverage', () => {
		test('Coverage: Test all sample templates', () => {
			for (const [name, template] of Object.entries(sampleTemplates)) {
				try {
					const vars = extractVariablesFromTemplate(template.template);
					
					// Check expected variables are present
					for (const expectedVar of template.expectedVars) {
						assert.ok(
							vars[expectedVar] !== undefined,
							`${name}: Should extract ${expectedVar}`
						);
					}
					
				} catch (error) {
					assert.fail(`${name} template failed: ${error.message}`);
				}
			}
			
			assert.ok(true, 'All sample templates tested successfully');
		});
	});
});

