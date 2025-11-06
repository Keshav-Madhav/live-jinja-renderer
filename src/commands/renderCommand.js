const vscode = require('vscode');
const { setupWebviewForEditor } = require('../webview/webviewManager');
const { getWebviewContent } = require('../webview/webviewContent');

// Global reference to the current panel (will be managed by the extension)
let currentPanel = null;

/**
 * Get the current panel reference
 */
function getCurrentPanel() {
  return currentPanel;
}

/**
 * Register the render panel command
 */
function registerRenderCommand(context, sidebarProvider) {
  const renderPanelCommand = vscode.commands.registerCommand('live-jinja-tester.render', function () {
    console.log('✅ Render panel command triggered!');
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor. Open a file to render.');
      return;
    }

    // Get the text from the active file
    const fileName = editor.document.fileName.split(/[/\\]/).pop();

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      'jinjaRenderer', // Internal ID
      `Render: ${fileName}`, // Title
      vscode.ViewColumn.Beside, // Open in a new tab to the side
      {
        enableScripts: true // Allow JavaScript to run in the webview
      }
    );
    
    // Store panel reference globally for settings updates
    currentPanel = panel;

    // Set the webview's HTML content (panel mode)
    panel.webview.html = getWebviewContent(false); // false = panel mode

    // Set up the webview for the current editor
    const subscription = setupWebviewForEditor(panel.webview, editor, context);
    
    // Clean up the subscription when the panel is closed
    panel.onDidDispose(() => {
      subscription.dispose();
      currentPanel = null; // Clear reference
    }, null, context.subscriptions);
  });

  context.subscriptions.push(renderPanelCommand);
}

/**
 * Register configuration change listener
 */
function registerConfigurationListener(context, sidebarProvider) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('liveJinjaRenderer')) {
        // Get updated settings
        const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
        const settings = {
          enableMarkdown: config.get('enableMarkdown', false),
          enableMermaid: config.get('enableMermaid', false),
          showWhitespace: config.get('showWhitespace', false),
          cullWhitespace: config.get('cullWhitespace', true),
          autoRerender: config.get('autoRerender', true)
        };
        
        // Update sidebar webview if active
        if (sidebarProvider && sidebarProvider._view) {
          sidebarProvider._view.webview.postMessage({
            type: 'updateSettings',
            settings: settings
          });
        }
        
        // Update panel webview if active
        if (currentPanel) {
          currentPanel.webview.postMessage({
            type: 'updateSettings',
            settings: settings
          });
        }
      }
    })
  );
}

module.exports = {
  registerRenderCommand,
  registerConfigurationListener,
  getCurrentPanel
};
