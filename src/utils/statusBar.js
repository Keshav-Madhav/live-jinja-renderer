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
  
  // Read from new settings first, then fallback to old settings
  let markdown = config.get('rendering.enableMarkdown');
  if (markdown === undefined) markdown = config.get('enableMarkdown', false);
  
  let mermaid = config.get('rendering.enableMermaid');
  if (mermaid === undefined) mermaid = config.get('enableMermaid', false);
  
  let showWhitespace = config.get('rendering.showWhitespace');
  if (showWhitespace === undefined) showWhitespace = config.get('showWhitespace', true);
  
  let cullWhitespace = config.get('rendering.cullWhitespace');
  if (cullWhitespace === undefined) cullWhitespace = config.get('cullWhitespace', false);
  
  let autoRerender = config.get('rendering.autoRerender');
  if (autoRerender === undefined) autoRerender = config.get('autoRerender', true);
  
  const autoExtract = config.get('variables.autoExtract', true);
  const historyEnabled = config.get('history.enabled', true);
  const historySize = config.get('history.size', 5);
  const ghostSave = config.get('advanced.ghostSave', true);
  
  // Extensions
  const extensions = config.get('extensions', {
    i18n: false,
    do: false,
    loopcontrols: false,
    with: false,
    autoescape: false,
    debug: false,
    custom: ''
  });
  
  // Count enabled extensions
  const enabledExtCount = [extensions.i18n, extensions.do, extensions.loopcontrols, extensions.with, extensions.autoescape, extensions.debug].filter(Boolean).length;
  const customExtCount = extensions.custom ? extensions.custom.split(',').filter(e => e.trim()).length : 0;
  const totalExtCount = enabledExtCount + customExtCount;
  
  // Simple text display with extension count
  statusBarItem.text = totalExtCount > 0 ? `Jinja Renderer (${totalExtCount} ext)` : 'Jinja Renderer';
  
  // Detailed tooltip with all settings
  const tooltip = new vscode.MarkdownString();
  tooltip.appendMarkdown('**Live Jinja Renderer Settings**\n\n');
  tooltip.appendMarkdown('**Rendering**\n\n');
  tooltip.appendMarkdown(`${markdown ? '✓' : '○'} Markdown Rendering\n\n`);
  tooltip.appendMarkdown(`${mermaid ? '✓' : '○'} Mermaid Diagrams\n\n`);
  tooltip.appendMarkdown(`${showWhitespace ? '✓' : '○'} Show Whitespace\n\n`);
  tooltip.appendMarkdown(`${cullWhitespace ? '✓' : '○'} Cull Whitespace\n\n`);
  tooltip.appendMarkdown(`${autoRerender ? '✓' : '○'} Auto Re-render\n\n`);
  tooltip.appendMarkdown('**Variables**\n\n');
  tooltip.appendMarkdown(`${autoExtract ? '✓' : '○'} Auto Extract Variables\n\n`);
  tooltip.appendMarkdown('**History**\n\n');
  tooltip.appendMarkdown(`${historyEnabled ? '✓' : '○'} History Enabled${historyEnabled ? ` (${historySize} files)` : ''}\n\n`);
  tooltip.appendMarkdown('**Advanced**\n\n');
  tooltip.appendMarkdown(`${ghostSave ? '✓' : '○'} Ghost Save Variables\n\n`);
  tooltip.appendMarkdown('**Extensions**\n\n');
  tooltip.appendMarkdown(`${extensions.i18n ? '✓' : '○'} i18n (Internationalization)\n\n`);
  tooltip.appendMarkdown(`${extensions.do ? '✓' : '○'} do (Statements)\n\n`);
  tooltip.appendMarkdown(`${extensions.loopcontrols ? '✓' : '○'} loopcontrols (break/continue)\n\n`);
  tooltip.appendMarkdown(`${extensions.with ? '✓' : '○'} with (Context)\n\n`);
  tooltip.appendMarkdown(`${extensions.autoescape ? '✓' : '○'} autoescape (HTML Escaping)\n\n`);
  tooltip.appendMarkdown(`${extensions.debug ? '✓' : '○'} debug (Debug Tag)\n\n`);
  if (extensions.custom) {
    tooltip.appendMarkdown(`✓ Custom: ${extensions.custom}\n\n`);
  }
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
