const vscode = require('vscode');
const { extractVariablesFromTemplate } = require('../utils/variableExtractor');

/**
 * Sets up webview with template rendering capabilities
 * @param {vscode.Webview} webview - The webview to set up
 * @param {vscode.TextEditor} editor - The active text editor
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {Object} selectionRange - Optional selection range {startLine, endLine}
 * @returns {vscode.Disposable} - The change document subscription
 */
function setupWebviewForEditor(webview, editor, context, selectionRange = null) {
  // If selection range provided, extract only that portion
  let templateContent;
  
  if (selectionRange && selectionRange.startLine !== undefined && selectionRange.endLine !== undefined) {
    const doc = editor.document;
    const startPos = new vscode.Position(selectionRange.startLine, 0);
    const endLine = Math.min(selectionRange.endLine, doc.lineCount - 1);
    const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
    const range = new vscode.Range(startPos, endPos);
    templateContent = doc.getText(range);
  } else {
    templateContent = editor.document.getText();
  }
  
  let lastTemplate = templateContent;
  let lastFileUri = editor.document.uri.toString(); // Track the file URI
  let lastSelectionRange = selectionRange; // Track the selection range
  let isInitialLoad = true; // Track if this is the first load
  let currentDecoration = null; // Track active highlight decoration
  let decorationDisposables = []; // Track event listeners for decoration removal
  let selectionRangeDecoration = null; // Track selection range highlight
  
  // Create subtle decoration for selection range highlighting
  const selectionRangeDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(100, 149, 237, 0.08)', // Very subtle blue tint
    isWholeLine: true,
    overviewRulerColor: 'rgba(100, 149, 237, 0.3)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
      backgroundColor: 'rgba(100, 149, 237, 0.05)' // Even more subtle in light theme
    },
    dark: {
      backgroundColor: 'rgba(100, 149, 237, 0.08)'
    }
  });
  
  // Apply selection range highlighting if applicable
  function applySelectionHighlight() {
    if (lastSelectionRange && lastSelectionRange.startLine !== undefined && lastSelectionRange.endLine !== undefined) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.toString() === lastFileUri) {
        const startPos = new vscode.Position(lastSelectionRange.startLine, 0);
        const endLine = Math.min(lastSelectionRange.endLine, activeEditor.document.lineCount - 1);
        const endPos = new vscode.Position(endLine, activeEditor.document.lineAt(endLine).text.length);
        const range = new vscode.Range(startPos, endPos);
        
        activeEditor.setDecorations(selectionRangeDecorationType, [range]);
        selectionRangeDecoration = selectionRangeDecorationType;
      }
    }
  }
  
  // Clear selection range highlighting
  function clearSelectionHighlight() {
    if (selectionRangeDecoration) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        activeEditor.setDecorations(selectionRangeDecoration, []);
      }
    }
  }
  
  // Apply initial highlight
  setTimeout(() => {
    applySelectionHighlight();
  }, 150);
  
  // Reapply highlight when switching back to this editor
  const activeEditorChangeSubscription = vscode.window.onDidChangeActiveTextEditor(activeEditor => {
    if (activeEditor && activeEditor.document.uri.toString() === lastFileUri) {
      // Small delay to ensure editor is fully active
      setTimeout(() => {
        applySelectionHighlight();
      }, 50);
    }
  });
  
  // Get current settings from VS Code configuration
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  
  // Try new setting names first, fallback to old names for backwards compatibility
  const settings = {
    enableMarkdown: config.get('rendering.enableMarkdown') ?? config.get('enableMarkdown', false),
    enableMermaid: config.get('rendering.enableMermaid') ?? config.get('enableMermaid', false),
    showWhitespace: config.get('rendering.showWhitespace') ?? config.get('showWhitespace', true),
    cullWhitespace: config.get('rendering.cullWhitespace') ?? config.get('cullWhitespace', false),
    autoRerender: config.get('rendering.autoRerender') ?? config.get('autoRerender', true),
    autoExtractVariables: config.get('variables.autoExtract', true),
    ghostSaveEnabled: config.get('advanced.ghostSave', true),
    historyEnabled: config.get('history.enabled', true),
    historySize: config.get('history.size', 5),
    selectionRange: lastSelectionRange // Include selection range in settings
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
      // Adjust selection range dynamically if changes occur within the selected range
      if (lastSelectionRange && lastSelectionRange.startLine !== undefined && lastSelectionRange.endLine !== undefined) {
        // Process each content change to adjust the selection range
        for (const change of e.contentChanges) {
          const changeStartLine = change.range.start.line;
          const changeStartCol = change.range.start.character;
          const changeEndLine = change.range.end.line;
          const newText = change.text;
          
          // Count lines in the change
          const oldLineCount = changeEndLine - changeStartLine;
          const newLineCount = (newText.match(/\n/g) || []).length;
          const lineDelta = newLineCount - oldLineCount;
          
          // Special case: change at the very start of the first line (column 0)
          // This should shift the selection, not expand it
          if (changeStartLine === lastSelectionRange.startLine && changeStartCol === 0 && lineDelta !== 0) {
            // Shift both start and end
            lastSelectionRange.startLine += lineDelta;
            lastSelectionRange.endLine += lineDelta;
          }
          // Change is within the selected range (but not at the very start) - expand/shrink
          else if (changeStartLine >= lastSelectionRange.startLine && changeStartLine <= lastSelectionRange.endLine) {
            // Change is within the selected range - adjust endLine
            lastSelectionRange.endLine = Math.max(
              lastSelectionRange.startLine,
              lastSelectionRange.endLine + lineDelta
            );
          } 
          // Change is before the selected range - shift both start and end
          else if (changeStartLine < lastSelectionRange.startLine) {
            lastSelectionRange.startLine += lineDelta;
            lastSelectionRange.endLine += lineDelta;
          }
        }
        
        // Ensure range is valid
        lastSelectionRange.endLine = Math.min(lastSelectionRange.endLine, e.document.lineCount - 1);
        lastSelectionRange.startLine = Math.max(0, lastSelectionRange.startLine);
        lastSelectionRange.startLine = Math.min(lastSelectionRange.startLine, lastSelectionRange.endLine);
      }
      
      // Extract only the selected range if applicable
      if (lastSelectionRange && lastSelectionRange.startLine !== undefined && lastSelectionRange.endLine !== undefined) {
        const doc = e.document;
        const startPos = new vscode.Position(lastSelectionRange.startLine, 0);
        const endLine = Math.min(lastSelectionRange.endLine, doc.lineCount - 1);
        const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
        const range = new vscode.Range(startPos, endPos);
        lastTemplate = doc.getText(range);
      } else {
        lastTemplate = e.document.getText();
      }
      
      // Clear error highlight on document change
      clearHighlight();
      
      // Reapply selection range highlight (if applicable)
      setTimeout(() => {
        applySelectionHighlight();
      }, 50);
      
      // Send updated template to the webview (without auto-extraction)
      webview.postMessage({ 
        type: 'updateTemplate',
        template: lastTemplate,
        fileUri: lastFileUri,
        selectionRange: lastSelectionRange
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
          // On initial load or forced refresh, auto-extract variables if enabled
          const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
          const autoExtract = config.get('variables.autoExtract', true);
          
          if ((isInitialLoad || message.force) && autoExtract) {
            const extractedVars = extractVariablesFromTemplate(lastTemplate);
            
            // Try to load ghost-saved variables for this file (with selection range)
            const ghostSaveEnabled = config.get('advanced.ghostSave', true);
            const ghostVariables = context.workspaceState.get('jinjaGhostVariables', {});
            const ghostKey = lastSelectionRange 
              ? `${lastFileUri}:${lastSelectionRange.startLine}-${lastSelectionRange.endLine}`
              : lastFileUri;
            const ghostVars = (ghostSaveEnabled && ghostVariables[ghostKey]) || null;
            
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              extractedVariables: extractedVars,
              ghostVariables: ghostVars,
              fileUri: lastFileUri,
              selectionRange: lastSelectionRange
            });
            // Only mark as no longer initial load if not forced
            // This allows repeated force refreshes to work
            if (!message.force) {
              isInitialLoad = false;
            }
          } else {
            // Subsequent loads or auto-extract disabled: just send template without extraction
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              fileUri: lastFileUri,
              selectionRange: lastSelectionRange
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
            // Check if ghost save is enabled
            const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
            const ghostSaveEnabled = config.get('advanced.ghostSave', true);
            
            if (!ghostSaveEnabled) {
              // Ghost save is disabled, skip silently
              return;
            }
            
            const fileUri = message.fileUri;
            const variables = message.variables;
            const msgSelectionRange = message.selectionRange;
            
            if (fileUri) {
              // Get existing ghost variables
              const ghostVariables = context.workspaceState.get('jinjaGhostVariables', {});
              
              // Create unique key: include selection range if present
              const ghostKey = msgSelectionRange 
                ? `${fileUri}:${msgSelectionRange.startLine}-${msgSelectionRange.endLine}`
                : fileUri;
              
              // Save variables for this file (with optional selection range)
              ghostVariables[ghostKey] = variables;
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
            const msgSelectionRange = message.selectionRange;
            
            if (typeof lineNumber === 'number' && lineNumber > 0 && fileUri) {
              // Adjust line number if we're rendering a selection
              const actualLineNumber = msgSelectionRange 
                ? lineNumber + msgSelectionRange.startLine - 1 
                : lineNumber;
              
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
              const lineIndex = Math.max(0, actualLineNumber - 1);
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
      clearHighlight(); // Clear error highlight when disposing
      clearSelectionHighlight(); // Clear selection range highlight
      selectionRangeDecorationType.dispose(); // Dispose decoration type
      changeDocumentSubscription.dispose();
      messageSubscription.dispose();
      activeEditorChangeSubscription.dispose(); // Dispose editor change listener
    }
  };
}

module.exports = {
  setupWebviewForEditor
};
