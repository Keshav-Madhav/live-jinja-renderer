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
function registerRenderCommand(context, intelliSenseManager = null) {
  const renderPanelCommand = vscode.commands.registerCommand('live-jinja-tester.render', function () {
    console.log('✅ Render panel command triggered!');
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor. Open a file to render.');
      return;
    }

    // Get the text from the active file
    const fileName = editor.document.fileName.split(/[/\\]/).pop();
    
    // Capture selection range if any
    const selection = editor.selection;
    let selectionRange = null;
    let titleSuffix = '';
    
    if (!selection.isEmpty) {
      const startLine = selection.start.line;
      const endLine = selection.end.line;
      const totalLines = editor.document.lineCount;
      
      // Check if the entire file is selected
      // Consider it "entire file" if selection starts at line 0 and ends at/includes the last line
      const isEntireFile = (
        startLine === 0 && 
        endLine >= totalLines - 1
      );
      
      if (!isEntireFile) {
        selectionRange = {
          startLine: startLine,
          endLine: endLine
        };
        // Add line range to title (1-indexed for user display)
        titleSuffix = ` (Lines ${selectionRange.startLine + 1}-${selectionRange.endLine + 1})`;
      }
      // If entire file is selected, leave selectionRange as null and titleSuffix empty
    }

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      'jinjaRenderer', // Internal ID
      `Render: ${fileName}${titleSuffix}`, // Title with optional line range
      vscode.ViewColumn.Beside, // Open in a new tab to the side
      {
        enableScripts: true, // Allow JavaScript to run in the webview
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'assets'),
          vscode.Uri.joinPath(context.extensionUri, 'resources', 'vendor')
        ]
      }
    );
    
    // Store panel reference globally for settings updates
    currentPanel = panel;

    // Set the webview's HTML content (panel mode)
    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, false); // false = panel mode

    // Set up the webview for the current editor (with selection range)
    const subscription = setupWebviewForEditor(panel.webview, editor, context, selectionRange, intelliSenseManager);
    
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
        
        // Try new setting names first, fallback to old names for backwards compatibility
        let enableMarkdown = config.get('rendering.enableMarkdown');
        if (enableMarkdown === undefined) enableMarkdown = config.get('enableMarkdown', false);
        
        let enableMermaid = config.get('rendering.enableMermaid');
        if (enableMermaid === undefined) enableMermaid = config.get('enableMermaid', false);
        
        let showWhitespace = config.get('rendering.showWhitespace');
        if (showWhitespace === undefined) showWhitespace = config.get('showWhitespace', true);
        
        let cullWhitespace = config.get('rendering.cullWhitespace');
        if (cullWhitespace === undefined) cullWhitespace = config.get('cullWhitespace', false);
        
        let autoRerender = config.get('rendering.autoRerender');
        if (autoRerender === undefined) autoRerender = config.get('autoRerender', true);
        
        const settings = {
          enableMarkdown,
          enableMermaid,
          showWhitespace,
          cullWhitespace,
          autoRerender,
          autoExtractVariables: config.get('variables.autoExtract', true),
          ghostSaveEnabled: config.get('advanced.ghostSave', true),
          historyEnabled: config.get('history.enabled', true),
          historySize: config.get('history.size', 5),
          showPerformanceMetrics: config.get('advanced.showPerformanceMetrics', true),
          suggestExtensions: config.get('advanced.suggestExtensions', true),
          extensions: config.get('extensions', {
            i18n: false,
            do: false,
            loopcontrols: false,
            with: false,
            autoescape: false,
            debug: false,
            custom: ''
          })
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
