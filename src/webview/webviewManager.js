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
  let isInitialLoad = true; // Track if this is the first load
  
  // Get current settings from VS Code configuration
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  const settings = {
    enableMarkdown: config.get('enableMarkdown', false),
    enableMermaid: config.get('enableMermaid', false),
    showWhitespace: config.get('showWhitespace', false),
    cullWhitespace: config.get('cullWhitespace', true)
  };
  
  // Send initial settings to webview
  setTimeout(() => {
    webview.postMessage({
      type: 'updateSettings',
      settings: settings
    });
  }, 100);
  
  // Update template if the original file changes
  const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
    if (e.document.uri.toString() === editor.document.uri.toString()) {
      lastTemplate = e.document.getText();
      
      // Send updated template to the webview (without auto-extraction)
      webview.postMessage({ 
        type: 'updateTemplate',
        template: lastTemplate
      });
    }
  });
  
  // Handle messages from the webview
  const messageSubscription = webview.onDidReceiveMessage(
    async message => {
      switch (message.type) {
        case 'ready':
          // On initial load or forced refresh, auto-extract variables
          if (isInitialLoad || message.force) {
            const extractedVars = extractVariablesFromTemplate(lastTemplate);
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              extractedVariables: extractedVars
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
              template: lastTemplate
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
        
        case 'showError':
          // Show error message from webview
          vscode.window.showErrorMessage(message.message || 'An error occurred');
          return;
      }
    },
    undefined,
    context.subscriptions
  );
  
  return {
    dispose: () => {
      changeDocumentSubscription.dispose();
      messageSubscription.dispose();
    }
  };
}

module.exports = {
  setupWebviewForEditor
};
