const vscode = require('vscode');

let statusBarItem;

/**
 * Create and initialize the status bar item
 */
function createStatusBarItem(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);
  
  updateStatusBar();
  return statusBarItem;
}

/**
 * Update the status bar with current settings
 */
function updateStatusBar() {
  if (!statusBarItem) return;
  
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  const markdown = config.get('enableMarkdown', false);
  const mermaid = config.get('enableMermaid', false);
  const showWhitespace = config.get('showWhitespace', false);
  const cullWhitespace = config.get('cullWhitespace', true);
  const autoRerender = config.get('autoRerender', true);
  
  // Simple text display
  statusBarItem.text = 'Jinja Renderer';
  
  // Detailed tooltip with all settings
  const tooltip = new vscode.MarkdownString();
  tooltip.appendMarkdown('**Live Jinja Renderer Settings**\n\n');
  tooltip.appendMarkdown(`${markdown ? '✓' : '○'} Markdown Rendering\n\n`);
  tooltip.appendMarkdown(`${mermaid ? '✓' : '○'} Mermaid Diagrams\n\n`);
  tooltip.appendMarkdown(`${showWhitespace ? '✓' : '○'} Show Whitespace\n\n`);
  tooltip.appendMarkdown(`${cullWhitespace ? '✓' : '○'} Cull Whitespace\n\n`);
  tooltip.appendMarkdown(`${autoRerender ? '✓' : '○'} Auto Re-render\n\n`);
  tooltip.appendMarkdown('---\n\n');
  tooltip.appendMarkdown('*Click to open settings*');
  
  statusBarItem.tooltip = tooltip;
  statusBarItem.command = {
    command: 'workbench.action.openSettings',
    arguments: ['@ext:KilloWatts.live-jinja-renderer'],
    title: 'Open Live Jinja Renderer Settings'
  };
  statusBarItem.backgroundColor = undefined; // No special color
  
  statusBarItem.show();
}

module.exports = {
  createStatusBarItem,
  updateStatusBar
};
