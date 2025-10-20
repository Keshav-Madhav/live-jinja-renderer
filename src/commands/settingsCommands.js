const vscode = require('vscode');

/**
 * Register commands for toggling settings
 */
function registerSettingsCommands(context) {
  // Toggle Markdown
  const toggleMarkdownCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMarkdown', () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('enableMarkdown', false);
    config.update('enableMarkdown', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMarkdownCommand);
  
  // Toggle Mermaid
  const toggleMermaidCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMermaid', () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('enableMermaid', false);
    config.update('enableMermaid', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMermaidCommand);
  
  // Toggle Show Whitespace
  const toggleShowWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleShowWhitespace', () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('showWhitespace', false);
    config.update('showWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleShowWhitespaceCommand);
  
  // Toggle Cull Whitespace
  const toggleCullWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleCullWhitespace', () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('cullWhitespace', true);
    config.update('cullWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleCullWhitespaceCommand);
}

module.exports = {
  registerSettingsCommands
};
