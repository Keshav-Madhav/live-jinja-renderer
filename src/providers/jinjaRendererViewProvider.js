const vscode = require('vscode');
const { setupWebviewForEditor } = require('../webview/webviewManager');
const { getWebviewContent } = require('../webview/webviewContent');
const { extractVariablesFromTemplate } = require('../utils/variableExtractor');

/**
 * Webview View Provider for sidebar
 */
class JinjaRendererViewProvider {
  constructor(context) {
    this._context = context;
    this._view = undefined;
    this._currentEditor = undefined;
    this._disposables = [];
  }
  
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true
    };
    
    webviewView.webview.html = getWebviewContent(true); // true = sidebar mode
    
    // Track the active editor and update when it changes
    const updateForActiveEditor = () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && this._view) {
        // Clean up previous subscriptions
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        
        this._currentEditor = editor;
        
        // Capture selection range if any
        const selection = editor.selection;
        let selectionRange = null;
        
        if (!selection.isEmpty) {
          selectionRange = {
            startLine: selection.start.line,
            endLine: selection.end.line
          };
        }
        
        const subscription = setupWebviewForEditor(this._view.webview, editor, this._context, selectionRange);
        this._disposables.push(subscription);
      }
    };
    
    // Store the update function for external access
    this._updateForActiveEditor = updateForActiveEditor;
    
    // Update immediately
    updateForActiveEditor();
    
    // Update when active editor changes
    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        updateForActiveEditor();
      })
    );
    
    // Clean up when view is disposed
    webviewView.onDidDispose(() => {
      this._disposables.forEach(d => d.dispose());
      this._disposables = [];
    });
  }
  
  /**
   * Manually trigger an update for the current active file
   */
  updateForCurrentFile() {
    if (this._view && this._view.webview) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // Clean up previous subscriptions
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        
        // Capture selection range if any
        const selection = editor.selection;
        let selectionRange = null;
        
        if (!selection.isEmpty) {
          selectionRange = {
            startLine: selection.start.line,
            endLine: selection.end.line
          };
        }
        
        // Set up new subscription for the current editor
        this._currentEditor = editor;
        const subscription = setupWebviewForEditor(this._view.webview, editor, this._context, selectionRange);
        this._disposables.push(subscription);
        
        // Get the current template content (or selection)
        let templateContent;
        if (selectionRange) {
          const doc = editor.document;
          const startPos = new vscode.Position(selectionRange.startLine, 0);
          const endLine = Math.min(selectionRange.endLine, doc.lineCount - 1);
          const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
          const range = new vscode.Range(startPos, endPos);
          templateContent = doc.getText(range);
        } else {
          templateContent = editor.document.getText();
        }
        
        // Wait 100ms for setup to complete, then extract variables and trigger update
        setTimeout(() => {
          if (this._view && this._view.webview && editor && editor.document) {
            // Extract variables directly
            const extractedVars = extractVariablesFromTemplate(templateContent);
            
            // Send extraction to webview
            this._view.webview.postMessage({
              type: 'replaceVariables',
              extractedVariables: extractedVars
            });
            
            // Wait another 50ms then trigger re-render by simulating a document change
            setTimeout(async () => {
              if (editor && editor.document) {
                const document = editor.document;
                const position = document.positionAt(document.getText().length);
                
                // Add a space and remove it to trigger auto-render
                await editor.edit(editBuilder => {
                  editBuilder.insert(position, ' ');
                });
                
                await editor.edit(editBuilder => {
                  const endPosition = document.positionAt(document.getText().length);
                  const rangeToDelete = new vscode.Range(
                    new vscode.Position(endPosition.line, endPosition.character - 1),
                    endPosition
                  );
                  editBuilder.delete(rangeToDelete);
                });
              }
            }, 50);
          }
        }, 100);
        
        return true;
      }
    }
    return false;
  }
}

module.exports = {
  JinjaRendererViewProvider
};
