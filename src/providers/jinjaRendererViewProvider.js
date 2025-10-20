const vscode = require('vscode');
const { setupWebviewForEditor } = require('../webview/webviewManager');
const { getWebviewContent } = require('../webview/webviewContent');

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
        const subscription = setupWebviewForEditor(this._view.webview, editor, this._context);
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
    if (this._updateForActiveEditor) {
      this._updateForActiveEditor();
      return true;
    }
    return false;
  }
}

module.exports = {
  JinjaRendererViewProvider
};
