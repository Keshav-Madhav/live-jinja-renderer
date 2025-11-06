const vscode = require('vscode');
const { extractVariablesFromTemplate } = require('../utils/variableExtractor');

/**
 * Sets up webview with template rendering capabilities
 * @param {vscode.Webview} webview - The webview to set up
 * @param {vscode.TextEditor} editor - The active text editor
 * @param {vscode.ExtensionContext} context - Extension context
 * @returns {vscode.Disposable} - The change document subscription
 */
function setupWebviewForEditor(webview, editor, context) {
  const templateContent = editor.document.getText();
  let lastTemplate = templateContent;
  let lastFileUri = editor.document.uri.toString(); // Track the file URI
  let isInitialLoad = true; // Track if this is the first load
  let currentDecoration = null; // Track active highlight decoration
  let decorationDisposables = []; // Track event listeners for decoration removal
  
  // Get current settings from VS Code configuration
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  const settings = {
    enableMarkdown: config.get('enableMarkdown', false),
    enableMermaid: config.get('enableMermaid', false),
    showWhitespace: config.get('showWhitespace', false),
    cullWhitespace: config.get('cullWhitespace', true),
    autoRerender: config.get('autoRerender', true)
  };
  
  // Send initial settings to webview
  setTimeout(() => {
    webview.postMessage({
      type: 'updateSettings',
      settings: settings
    });
  }, 100);
  
  // Update template if the original file changes
  // The webview will decide whether to auto-render based on autoRerender setting
  const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
    if (e.document.uri.toString() === editor.document.uri.toString()) {
      lastTemplate = e.document.getText();
      
      // Clear highlight on document change
      clearHighlight();
      
      // Send updated template to the webview (without auto-extraction)
      webview.postMessage({ 
        type: 'updateTemplate',
        template: lastTemplate,
        fileUri: lastFileUri
      });
    }
  });
  
  // Helper function to clear the current highlight
  function clearHighlight() {
    if (currentDecoration) {
      currentDecoration.dispose();
      currentDecoration = null;
    }
    // Dispose all decoration-related event listeners
    decorationDisposables.forEach(d => d.dispose());
    decorationDisposables = [];
  }
  
  // Handle messages from the webview
  const messageSubscription = webview.onDidReceiveMessage(
    async message => {
      switch (message.type) {
        case 'ready':
          // On initial load or forced refresh, auto-extract variables
          if (isInitialLoad || message.force) {
            const extractedVars = extractVariablesFromTemplate(lastTemplate);
            
            // Try to load ghost-saved variables for this file
            const ghostVariables = context.workspaceState.get('jinjaGhostVariables', {});
            const ghostVars = ghostVariables[lastFileUri] || null;
            
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              extractedVariables: extractedVars,
              ghostVariables: ghostVars,
              fileUri: lastFileUri
            });
            // Only mark as no longer initial load if not forced
            // This allows repeated force refreshes to work
            if (!message.force) {
              isInitialLoad = false;
            }
          } else {
            // Subsequent loads: just send template without extraction
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              fileUri: lastFileUri
            });
          }
          return;
        
        case 'reextractVariables':
          // Extract variables from the current template
          const reextractedVars = extractVariablesFromTemplate(lastTemplate);
          
          // Send fresh extraction (this will replace existing variables)
          webview.postMessage({
            type: 'replaceVariables',
            extractedVariables: reextractedVars
          });
          return;
        
        case 'copyToClipboard':
          // Copy text to clipboard (sent from webview)
          try {
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Output copied to clipboard');
          } catch (err) {
            vscode.window.showErrorMessage('Failed to copy output to clipboard');
            console.error('Copy failed:', err);
          }
          return;
        
        case 'outputCopied':
          // Legacy message - show confirmation when output is copied
          vscode.window.showInformationMessage('Output copied to clipboard');
          return;
        
        case 'saveVariables':
          // Save variables preset
          try {
            const presetName = message.presetName;
            const variables = message.variables;
            
            // Get existing presets
            const savedPresets = context.globalState.get('jinjaVariablePresets', {});
            
            // Save new preset
            savedPresets[presetName] = variables;
            await context.globalState.update('jinjaVariablePresets', savedPresets);
            
            vscode.window.showInformationMessage(`Saved preset: ${presetName}`);
          } catch (err) {
            vscode.window.showErrorMessage('Failed to save variables preset');
            console.error('Save failed:', err);
          }
          return;
        
        case 'ghostSaveVariables':
          // Ghost save variables for the current file (automatic background save)
          try {
            const fileUri = message.fileUri;
            const variables = message.variables;
            
            if (fileUri) {
              // Get existing ghost variables
              const ghostVariables = context.workspaceState.get('jinjaGhostVariables', {});
              
              // Save variables for this file
              ghostVariables[fileUri] = variables;
              await context.workspaceState.update('jinjaGhostVariables', ghostVariables);
              
              // Silent save - no notification
            }
          } catch (err) {
            console.error('Ghost save failed:', err);
          }
          return;
        
        case 'showError':
          // Show error message from webview
          vscode.window.showErrorMessage(message.message || 'An error occurred');
          return;
        
        case 'executeCommand':
          // Execute a VS Code command from webview
          if (message.command) {
            try {
              await vscode.commands.executeCommand(message.command);
            } catch (err) {
              console.error('Failed to execute command:', message.command, err);
            }
          }
          return;
        
        case 'goToLine':
          // Navigate to specific line in the editor
          try {
            const lineNumber = message.line;
            const fileUri = message.fileUri;
            
            if (typeof lineNumber === 'number' && lineNumber > 0 && fileUri) {
              // Clear any existing highlight
              clearHighlight();
              
              // Parse the URI and open the document
              const documentUri = vscode.Uri.parse(fileUri);
              const document = await vscode.workspace.openTextDocument(documentUri);
              
              // Show the document and get the active editor
              const activeEditor = await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
                preview: false
              });
              
              // Wait a bit for the editor to be ready
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Create a position for the line (0-indexed)
              const lineIndex = Math.max(0, lineNumber - 1);
              const position = new vscode.Position(lineIndex, 0);
              
              // Create a range for the entire line
              const line = activeEditor.document.lineAt(lineIndex);
              const range = line.range;
              
              // Move cursor to the beginning of the line
              activeEditor.selection = new vscode.Selection(position, position);
              
              // Scroll to show the line in the center
              activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
              
              // Wait a bit for cursor movement to complete before adding highlight
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Highlight the line with a more visible color
              currentDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(255, 100, 100, 0.3)',
                isWholeLine: true,
                border: '2px solid rgba(255, 0, 0, 0.5)'
              });
              
              activeEditor.setDecorations(currentDecoration, [range]);
              
              // Remove highlight when cursor moves AWAY from the highlighted line
              const cursorChangeDisposable = vscode.window.onDidChangeTextEditorSelection(e => {
                if (e.textEditor === activeEditor) {
                  const cursorLine = e.selections[0].active.line;
                  // If cursor moves away from the highlighted line, clear the highlight
                  if (cursorLine !== lineIndex) {
                    clearHighlight();
                  }
                }
              });
              
              decorationDisposables.push(cursorChangeDisposable);
            }
          } catch (err) {
            console.error('Failed to navigate to line:', err);
            vscode.window.showErrorMessage('Failed to navigate to error line');
          }
          return;
      }
    },
    undefined,
    context.subscriptions
  );
  
  return {
    dispose: () => {
      clearHighlight(); // Clear highlight when disposing
      changeDocumentSubscription.dispose();
      messageSubscription.dispose();
    }
  };
}

module.exports = {
  setupWebviewForEditor
};
