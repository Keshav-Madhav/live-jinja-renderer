const vscode = require('vscode');
const { updateStatusBar } = require('../utils/statusBar');

/**
 * Update context keys based on configuration
 */
async function updateContextKeys() {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  
  const markdownEnabled = config.get('enableMarkdown', false);
  const mermaidEnabled = config.get('enableMermaid', false);
  const showWhitespaceEnabled = config.get('showWhitespace', false);
  const cullWhitespaceEnabled = config.get('cullWhitespace', true);
  
  // Update context keys for when clauses
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.markdownEnabled', markdownEnabled);
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.mermaidEnabled', mermaidEnabled);
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.showWhitespaceEnabled', showWhitespaceEnabled);
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.cullWhitespaceEnabled', cullWhitespaceEnabled);
  
  // Update status bar
  updateStatusBar();
}

/**
 * Register commands for toggling settings
 */
function registerSettingsCommands(context) {
  // Initialize context keys
  updateContextKeys();
  
  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('liveJinjaRenderer')) {
        updateContextKeys();
      }
    })
  );
  
  // Toggle Markdown
  const toggleMarkdownCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMarkdown', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('enableMarkdown', false);
    await config.update('enableMarkdown', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMarkdownCommand);
  
  // Toggle Mermaid
  const toggleMermaidCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMermaid', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('enableMermaid', false);
    await config.update('enableMermaid', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMermaidCommand);
  
  // Toggle Show Whitespace
  const toggleShowWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleShowWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('showWhitespace', false);
    await config.update('showWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleShowWhitespaceCommand);
  
  // Toggle Cull Whitespace
  const toggleCullWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleCullWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('cullWhitespace', true);
    await config.update('cullWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleCullWhitespaceCommand);
}

module.exports = {
  registerSettingsCommands
};
