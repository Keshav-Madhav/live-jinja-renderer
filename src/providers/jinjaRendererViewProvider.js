const vscode = require('vscode');
const { setupWebviewForEditor } = require('../webview/webviewManager');
const { getWebviewContent } = require('../webview/webviewContent');
const { extractVariablesFromTemplate } = require('../utils/variableExtractor');

/**
 * Webview View Provider for sidebar
 */
class JinjaRendererViewProvider {
  constructor(context, intelliSenseManager = null) {
    this._context = context;
    this._intelliSenseManager = intelliSenseManager;
    this._view = undefined;
    this._currentEditor = undefined;
    this._disposables = [];
    this._fileHistory = []; // Track file contexts
    this._currentHistoryIndex = -1; // Index of currently active history item
    
    // Get initial history size from settings
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    this._maxHistorySize = config.get('history.size', 5);
  }
  
  /**
   * Update max history size from settings
   */
  _updateHistorySize() {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const newSize = config.get('history.size', 5);
    
    if (newSize !== this._maxHistorySize) {
      this._maxHistorySize = newSize;
      
      // Trim history if it's now too large
      if (this._fileHistory.length > this._maxHistorySize) {
        this._fileHistory = this._fileHistory.slice(0, this._maxHistorySize);
        
        // Adjust current index if needed
        if (this._currentHistoryIndex >= this._maxHistorySize) {
          this._currentHistoryIndex = this._maxHistorySize - 1;
        }
        
        // Update webview with trimmed history
        this._sendHistoryToWebview();
      }
    }
  }
  
  /**
   * Add a file context to history
   */
  _addToHistory(editor, selectionRange) {
    // Check if history is enabled
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const historyEnabled = config.get('history.enabled', true);
    
    if (!historyEnabled) {
      // Clear history when disabled
      this._fileHistory = [];
      this._currentHistoryIndex = -1;
      this._sendHistoryToWebview();
      return;
    }
    
    // Update history size from settings
    this._updateHistorySize();
    
    const fileUri = editor.document.uri.toString();
    const fileName = editor.document.fileName.split(/[/\\]/).pop();
    
    // Create unique key for this context
    const contextKey = selectionRange 
      ? `${fileUri}:${selectionRange.startLine}-${selectionRange.endLine}`
      : fileUri;
    
    // Check if this context already exists in history
    const existingIndex = this._fileHistory.findIndex(item => item.contextKey === contextKey);
    
    if (existingIndex !== -1) {
      // If we're already viewing this history item, don't re-add it
      if (this._currentHistoryIndex === existingIndex) {
        return;
      }
      
      // Move existing item to front
      const [existing] = this._fileHistory.splice(existingIndex, 1);
      this._fileHistory.unshift(existing);
      this._currentHistoryIndex = 0;
    } else {
      // Add new context to front
      const newContext = {
        contextKey,
        fileUri,
        fileName,
        selectionRange,
        editor
      };
      
      this._fileHistory.unshift(newContext);
      
      // Keep only up to max history size
      if (this._fileHistory.length > this._maxHistorySize) {
        this._fileHistory.pop();
      }
      
      this._currentHistoryIndex = 0;
    }
    
    // Send updated history to webview
    this._sendHistoryToWebview();
  }
  
  /**
   * Send file history to webview
   */
  _sendHistoryToWebview() {
    if (!this._view) return;
    
    // Check if history is enabled
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const historyEnabled = config.get('history.enabled', true);
    
    if (!historyEnabled) {
      // Send empty history when disabled
      this._view.webview.postMessage({
        type: 'updateFileHistory',
        history: [],
        historyEnabled: false
      });
      return;
    }
    
    const historyItems = this._fileHistory.map((item, index) => ({
      label: item.fileName + (item.selectionRange 
        ? ` (Lines ${item.selectionRange.startLine + 1}-${item.selectionRange.endLine + 1})`
        : ''),
      index,
      isActive: index === this._currentHistoryIndex
    }));
    
    this._view.webview.postMessage({
      type: 'updateFileHistory',
      history: historyItems,
      historyEnabled: true
    });
  }
  
  /**
   * Switch to a specific history item by index
   */
  async _switchToHistoryItem(index) {
    if (index < 0 || index >= this._fileHistory.length) {
      return;
    }
    
    const historyItem = this._fileHistory[index];
    
    try {
      // Parse the URI and open the document
      const documentUri = vscode.Uri.parse(historyItem.fileUri);
      const document = await vscode.workspace.openTextDocument(documentUri);
      
      // Find the text editor for this document, or create one
      let editor = vscode.window.visibleTextEditors.find(
        e => e.document.uri.toString() === historyItem.fileUri
      );
      
      if (!editor) {
        // Show the document to get an editor
        editor = await vscode.window.showTextDocument(document, {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: true,
          preview: false
        });
      }
      
      // Update the stored editor reference
      historyItem.editor = editor;
      
      // Clean up previous subscriptions
      this._disposables.forEach(d => d.dispose());
      this._disposables = [];
      
      // Set up for the history item's editor
      this._currentEditor = editor;
      
      // Update the current history index BEFORE setting up the webview
      // This prevents the item from being re-added to history
      this._currentHistoryIndex = index;
      
      const subscription = setupWebviewForEditor(
        this._view.webview, 
        editor, 
        this._context, 
        historyItem.selectionRange,
        this._intelliSenseManager
      );
      this._disposables.push(subscription);
      
      // Manually trigger variable extraction and rendering after a short delay
      setTimeout(() => {
        const { extractVariablesFromTemplate } = require('../utils/variableExtractor');
        
        // Get template content based on selection range
        let templateContent;
        if (historyItem.selectionRange && historyItem.selectionRange.startLine !== undefined) {
          const doc = editor.document;
          const startPos = new vscode.Position(historyItem.selectionRange.startLine, 0);
          const endLine = Math.min(historyItem.selectionRange.endLine, doc.lineCount - 1);
          const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
          const range = new vscode.Range(startPos, endPos);
          templateContent = doc.getText(range);
        } else {
          templateContent = editor.document.getText();
        }
        
        // Extract variables
        const extractedVars = extractVariablesFromTemplate(templateContent);
        
        // Update IntelliSense providers with extracted variables
        if (this._intelliSenseManager && extractedVars) {
          this._intelliSenseManager.updateVariables(extractedVars);
        }
        
        // Load ghost variables for this context
        const ghostVariables = this._context.workspaceState.get('jinjaGhostVariables', {});
        const ghostKey = historyItem.selectionRange
          ? `${historyItem.fileUri}:${historyItem.selectionRange.startLine}-${historyItem.selectionRange.endLine}`
          : historyItem.fileUri;
        const ghostVars = ghostVariables[ghostKey] || null;
        
        // Send update to webview
        this._view.webview.postMessage({
          type: 'updateTemplate',
          template: templateContent,
          extractedVariables: extractedVars,
          ghostVariables: ghostVars,
          fileUri: historyItem.fileUri,
          selectionRange: historyItem.selectionRange
        });
      }, 50);
      
      // Update history display to show the new active item
      this._sendHistoryToWebview();
      
    } catch (error) {
      console.error('Failed to switch to history item:', error);
      vscode.window.showErrorMessage(`Failed to open file: ${historyItem.fileName}`);
    }
  }
  
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true
    };
    
    webviewView.webview.html = getWebviewContent(true); // true = sidebar mode
    
    // Flag to prevent double-updating when switching history
    let isUpdatingFromHistory = false;
    
    // Track the active editor and update when it changes
    const updateForActiveEditor = () => {
      // Don't update if we're currently switching history items
      if (isUpdatingFromHistory) {
        return;
      }
      
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
          }
          // If entire file is selected, leave selectionRange as null
        }
        
        // Add to history
        this._addToHistory(editor, selectionRange);
        
        const subscription = setupWebviewForEditor(this._view.webview, editor, this._context, selectionRange, this._intelliSenseManager);
        this._disposables.push(subscription);
      }
    };
    
    // Store the update function for external access
    this._updateForActiveEditor = updateForActiveEditor;
    
    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.type) {
          case 'switchToHistoryItem':
            isUpdatingFromHistory = true;
            await this._switchToHistoryItem(message.index);
            // Reset flag after a short delay to allow the switch to complete
            setTimeout(() => {
              isUpdatingFromHistory = false;
            }, 100);
            break;
          
          case 'enableExtension':
            // Enable an extension from the webview suggestion
            try {
              const extensionKey = message.extension;
              const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
              const currentExtensions = config.get('extensions', {});
              
              // Enable the requested extension
              currentExtensions[extensionKey] = true;
              
              await config.update('extensions', currentExtensions, vscode.ConfigurationTarget.Global);
              
              // Send updated settings back to webview
              webviewView.webview.postMessage({
                type: 'extensionEnabled',
                extension: extensionKey,
                settings: {
                  extensions: currentExtensions
                }
              });
              
              vscode.window.showInformationMessage(`✅ Enabled ${extensionKey} extension`);
            } catch (err) {
              vscode.window.showErrorMessage(`Failed to enable extension: ${err.message}`);
              console.error('Enable extension failed:', err);
            }
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );
    
    // Update immediately
    updateForActiveEditor();
    
    // Update when active editor changes
    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        updateForActiveEditor();
      })
    );
    
    // Listen for configuration changes
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('liveJinjaRenderer.history')) {
          // Update history size or enabled state
          this._updateHistorySize();
          this._sendHistoryToWebview();
        }
      })
    );
    
    // Clean up when view is disposed
    webviewView.onDidDispose(() => {
      this._disposables.forEach(d => d.dispose());
      this._disposables = [];
    });
    
    // Clean up highlights when view becomes hidden
    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        // View is hidden, clean up decorations
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
      } else {
        // View is visible again, re-setup for active editor
        updateForActiveEditor();
      }
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
        
        // Check if we have a current history entry for this file
        let selectionRange = null;
        const fileUri = editor.document.uri.toString();
        
        // Get the current cursor position
        const cursorLine = editor.selection.active.line;
        
        // Check if there's an active history item for this file
        if (this._currentHistoryIndex >= 0 && this._currentHistoryIndex < this._fileHistory.length) {
          const currentHistory = this._fileHistory[this._currentHistoryIndex];
          
          // Only consider the history if it's for the same file
          if (currentHistory.fileUri === fileUri && currentHistory.selectionRange) {
            const historyRange = currentHistory.selectionRange;
            
            // Check if cursor is within the previously rendered range
            if (cursorLine >= historyRange.startLine && cursorLine <= historyRange.endLine) {
              // Cursor is within the rendered range - keep the same range
              selectionRange = historyRange;
            }
            // If cursor is outside the range, selectionRange stays null (whole file)
          }
        }
        
        // If no selection range determined yet, check for current selection
        if (!selectionRange) {
          const selection = editor.selection;
          
          if (!selection.isEmpty) {
            const startLine = selection.start.line;
            const endLine = selection.end.line;
            const totalLines = editor.document.lineCount;
            
            // Check if the entire file is selected
            // Consider it "entire file" if:
            // 1. Selection starts at line 0
            // 2. Selection ends at or includes the last line
            // 3. Start is at beginning of first line and end is at end of last line
            const isEntireFile = (
              startLine === 0 && 
              endLine >= totalLines - 1
            );
            
            if (!isEntireFile) {
              selectionRange = {
                startLine: startLine,
                endLine: endLine
              };
            }
            // If entire file is selected, leave selectionRange as null
          }
        }
        
        // Add to history
        this._addToHistory(editor, selectionRange);
        
        // Set up new subscription for the current editor
        this._currentEditor = editor;
        const subscription = setupWebviewForEditor(this._view.webview, editor, this._context, selectionRange, this._intelliSenseManager);
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
            
            // Update IntelliSense providers with extracted variables
            if (this._intelliSenseManager && extractedVars) {
              this._intelliSenseManager.updateVariables(extractedVars);
            }
            
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
