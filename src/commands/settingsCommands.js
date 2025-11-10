const vscode = require('vscode');
const { updateStatusBar } = require('../utils/statusBar');

/**
 * Update context keys based on configuration
 */
async function updateContextKeys() {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  
  // Read from new settings first, then fallback to old settings
  let markdownEnabled = config.get('rendering.enableMarkdown');
  if (markdownEnabled === undefined) {
    markdownEnabled = config.get('enableMarkdown', false);
  }
  
  let mermaidEnabled = config.get('rendering.enableMermaid');
  if (mermaidEnabled === undefined) {
    mermaidEnabled = config.get('enableMermaid', false);
  }
  
  let showWhitespaceEnabled = config.get('rendering.showWhitespace');
  if (showWhitespaceEnabled === undefined) {
    showWhitespaceEnabled = config.get('showWhitespace', true);
  }
  
  let cullWhitespaceEnabled = config.get('rendering.cullWhitespace');
  if (cullWhitespaceEnabled === undefined) {
    cullWhitespaceEnabled = config.get('cullWhitespace', false);
  }
  
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
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.enableMarkdown');
    if (currentValue === undefined) {
      currentValue = config.get('enableMarkdown', false);
    }
    
    // Always write to new setting
    await config.update('rendering.enableMarkdown', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMarkdownCommand);
  
  // Toggle Mermaid
  const toggleMermaidCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMermaid', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.enableMermaid');
    if (currentValue === undefined) {
      currentValue = config.get('enableMermaid', false);
    }
    
    // Always write to new setting
    await config.update('rendering.enableMermaid', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMermaidCommand);
  
  // Toggle Show Whitespace
  const toggleShowWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleShowWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.showWhitespace');
    if (currentValue === undefined) {
      currentValue = config.get('showWhitespace', true);
    }
    
    // Always write to new setting
    await config.update('rendering.showWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleShowWhitespaceCommand);
  
  // Toggle Cull Whitespace
  const toggleCullWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleCullWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.cullWhitespace');
    if (currentValue === undefined) {
      currentValue = config.get('cullWhitespace', false);
    }
    
    // Always write to new setting
    await config.update('rendering.cullWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleCullWhitespaceCommand);
}

module.exports = {
  registerSettingsCommands
};
