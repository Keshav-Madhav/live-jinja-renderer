const vscode = require('vscode');
const { updateStatusBar } = require('../utils/statusBar');

/**
 * Update context keys based on configuration
 */
async function updateContextKeys() {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  
  // Try new setting names first, fallback to old names for backwards compatibility
  const markdownEnabled = config.get('rendering.enableMarkdown') ?? config.get('enableMarkdown', false);
  const mermaidEnabled = config.get('rendering.enableMermaid') ?? config.get('enableMermaid', false);
  const showWhitespaceEnabled = config.get('rendering.showWhitespace') ?? config.get('showWhitespace', true);
  const cullWhitespaceEnabled = config.get('rendering.cullWhitespace') ?? config.get('cullWhitespace', false);
  
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
    const currentValue = config.get('rendering.enableMarkdown') ?? config.get('enableMarkdown', false);
    await config.update('rendering.enableMarkdown', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMarkdownCommand);
  
  // Toggle Mermaid
  const toggleMermaidCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMermaid', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('rendering.enableMermaid') ?? config.get('enableMermaid', false);
    await config.update('rendering.enableMermaid', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMermaidCommand);
  
  // Toggle Show Whitespace
  const toggleShowWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleShowWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('rendering.showWhitespace') ?? config.get('showWhitespace', true);
    await config.update('rendering.showWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleShowWhitespaceCommand);
  
  // Toggle Cull Whitespace
  const toggleCullWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleCullWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('rendering.cullWhitespace') ?? config.get('cullWhitespace', false);
    await config.update('rendering.cullWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleCullWhitespaceCommand);
}

module.exports = {
  registerSettingsCommands
};
