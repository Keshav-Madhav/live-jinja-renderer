const vscode = require('vscode');
const { setupWebviewForEditor } = require('../webview/webviewManager');
const { getWebviewContent } = require('../webview/webviewContent');

// Global reference to the current panel (will be managed by the extension)
let currentPanel = null;
// Global reference to detached panels (mapped by file URI)
const detachedPanels = new Map(); // Map<string, vscode.WebviewPanel[]>

/**
 * Get the current panel reference
 */
function getCurrentPanel() {
  return currentPanel;
}

/**
 * Notify detached panels for a specific file
 */
function notifyDetachedPanels(fileUri, message) {
    if (detachedPanels.has(fileUri)) {
        const panels = detachedPanels.get(fileUri);
        panels.forEach(panel => {
            panel.webview.postMessage(message);
        });
    }
}

/**
 * Notify main windows (sidebar/panel) about detached panel state
 */
function notifyMainWindows(fileUri, isDetachedActive) {
    // Notify sidebar if active
    const sidebarProvider = global.sidebarProvider;
    if (sidebarProvider && sidebarProvider._view) {
        sidebarProvider._view.webview.postMessage({
            type: isDetachedActive ? 'hideOutput' : 'showOutput',
            fileUri: fileUri
        });
    }
    
    // Notify current panel if active and matches the file
    if (currentPanel) {
        currentPanel.webview.postMessage({
            type: isDetachedActive ? 'hideOutput' : 'showOutput',
            fileUri: fileUri
        });
    }
}

/**
 * Close all detached panels for a specific file
 */
function closeDetachedPanels(fileUri) {
    console.log('[RenderCommand] closeDetachedPanels called for:', fileUri);
    console.log('[RenderCommand] Current detached panels:', Array.from(detachedPanels.keys()));
    
    if (detachedPanels.has(fileUri)) {
        const panels = detachedPanels.get(fileUri);
        console.log('[RenderCommand] Found', panels.length, 'detached panel(s) to close');
        // Create a copy of the array since dispose will modify the original
        const panelsCopy = [...panels];
        panelsCopy.forEach(panel => {
            panel.dispose();
        });
        detachedPanels.delete(fileUri);
        console.log('[RenderCommand] Detached panels closed');
    } else {
        console.log('[RenderCommand] No detached panels found for this file URI');
    }
}

/**
 * Register the render panel command
 */
function registerRenderCommand(context, intelliSenseManager = null, sidebarProvider = null) {
  // Store sidebar provider globally for notifications
  global.sidebarProvider = sidebarProvider;
  // Command to notify detached panels (internal use)
  context.subscriptions.push(vscode.commands.registerCommand('live-jinja-tester.notifyDetached', (fileUri, variables) => {
      notifyDetachedPanels(fileUri, { type: 'replaceVariables', extractedVariables: variables });
  }));
  
  // Command to close detached panels for a specific file (internal use)
  context.subscriptions.push(vscode.commands.registerCommand('live-jinja-tester.closeDetachedForFile', (fileUri) => {
      closeDetachedPanels(fileUri);
  }));

  // Command to open detached output
  context.subscriptions.push(vscode.commands.registerCommand('live-jinja-tester.openDetached', async (fileUri, variables) => {
      if (!fileUri) return;
      
      const documentUri = vscode.Uri.parse(fileUri);
      let fileName = 'Untitled';
      try {
          // Try to get document to get clean filename
          const doc = await vscode.workspace.openTextDocument(documentUri);
          fileName = doc.fileName.split(/[/\\]/).pop();
      } catch (e) {
          fileName = fileUri.split('/').pop();
      }

      const panel = vscode.window.createWebviewPanel(
          'jinjaRendererDetached',
          `Output: ${fileName}`,
          vscode.ViewColumn.Beside,
          {
              enableScripts: true,
              localResourceRoots: [vscode.Uri.file(context.extensionPath)]
          }
      );

      panel.webview.html = getWebviewContent(false, true); // panel mode, detached

      // Add to detached panels list
      if (!detachedPanels.has(fileUri)) {
          detachedPanels.set(fileUri, []);
      }
      detachedPanels.get(fileUri).push(panel);
      
      // Notify main windows to hide their output
      notifyMainWindows(fileUri, true);

      // Setup listeners
      // We need to setup basic editor listeners for file changes
      // But we might not have an active editor for this file right now if it was triggered from sidebar
      // However, setupWebviewForEditor expects an editor.
      // If the file is open (which it likely is if we are rendering it), we can find it.
      
      const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === fileUri);
      let subscription;
      
      if (editor) {
          subscription = setupWebviewForEditor(panel.webview, editor, context, null, intelliSenseManager);
          
          // Initial variable load
          if (variables) {
             setTimeout(() => {
                 panel.webview.postMessage({
                     type: 'replaceVariables',
                     extractedVariables: variables
                 });
                 // Force a render
                 panel.webview.postMessage({ type: 'forceRender' });
             }, 500);
          }
      } else {
          // If no editor is visible for this file, we can't easily setup the live listeners using existing function
          // But usually there is one. If not, we might need to just open the doc.
          // For now, assume editor exists or show warning.
           vscode.window.showWarningMessage('Please keep the source file open to receive updates.');
      }

      // Cleanup
      panel.onDidDispose(() => {
          if (subscription) subscription.dispose();
          
          const panels = detachedPanels.get(fileUri);
          if (panels) {
              const index = panels.indexOf(panel);
              if (index > -1) {
                  panels.splice(index, 1);
              }
              if (panels.length === 0) {
                  detachedPanels.delete(fileUri);
                  // When the last detached panel is closed, show output again in main windows
                  notifyMainWindows(fileUri, false);
              }
          }
      }, null, context.subscriptions);
  }));

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
        enableScripts: true // Allow JavaScript to run in the webview
      }
    );
    
    // Store panel reference globally for settings updates
    currentPanel = panel;

    // Set the webview's HTML content (panel mode)
    panel.webview.html = getWebviewContent(false); // false = panel mode

    // Set up the webview for the current editor (with selection range)
    const subscription = setupWebviewForEditor(panel.webview, editor, context, selectionRange, intelliSenseManager);
    
    // Clean up the subscription when the panel is closed
    panel.onDidDispose(() => {
      console.log('[Panel] Panel disposed');
      subscription.dispose();
      currentPanel = null; // Clear reference
      
      // Close any detached panels for this file
      const fileUri = editor.document.uri.toString();
      console.log('[Panel] Closing detached panels for:', fileUri);
      closeDetachedPanels(fileUri);
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

        // Update detached panels
        detachedPanels.forEach(panels => {
            panels.forEach(panel => {
                panel.webview.postMessage({
                    type: 'updateSettings',
                    settings: settings
                });
            });
        });
      }
    })
  );
}

module.exports = {
  registerRenderCommand,
  registerConfigurationListener,
  getCurrentPanel
};
