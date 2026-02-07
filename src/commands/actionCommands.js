const vscode = require('vscode');
const { extractVariablesFromTemplate } = require('../utils/variableExtractor');

/**
 * Register action commands (reextract, copy, update, etc.)
 */
function registerActionCommands(context, sidebarProvider, getCurrentPanel) {
  // Show Sidebar
  const showSidebarCommand = vscode.commands.registerCommand('live-jinja-tester.showSidebar', () => {
    vscode.commands.executeCommand('jinjaRendererView.focus');
  });
  context.subscriptions.push(showSidebarCommand);
  
  // Reextract Variables
  const reextractVariablesCommand = vscode.commands.registerCommand('live-jinja-tester.reextractVariables', () => {
    const currentPanel = getCurrentPanel();
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }
    
    // Extract variables from the current template
    const templateContent = editor.document.getText();
    const extractedVars = extractVariablesFromTemplate(templateContent);
    
    // Send to sidebar if visible
    if (sidebarProvider && sidebarProvider._view && sidebarProvider._view.visible) {
      sidebarProvider._view.webview.postMessage({ 
        type: 'replaceVariables',
        extractedVariables: extractedVars
      });
      vscode.window.showInformationMessage('Variables extracted from template');
    } 
    // Send to panel if active
    else if (currentPanel) {
      currentPanel.webview.postMessage({ 
        type: 'replaceVariables',
        extractedVariables: extractedVars
      });
      vscode.window.showInformationMessage('Variables extracted from template');
    } 
    else {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
    }
  });
  context.subscriptions.push(reextractVariablesCommand);
  
  // Copy Output
  const copyOutputCommand = vscode.commands.registerCommand('live-jinja-tester.copyOutput', () => {
    const currentPanel = getCurrentPanel();
    if (sidebarProvider && sidebarProvider._view) {
      sidebarProvider._view.webview.postMessage({ type: 'copyOutput' });
    } else if (currentPanel) {
      currentPanel.webview.postMessage({ type: 'copyOutput' });
    } else {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
    }
  });
  context.subscriptions.push(copyOutputCommand);
  
  // Open in Panel
  const openInPanelCommand = vscode.commands.registerCommand('live-jinja-tester.openInPanel', () => {
    vscode.commands.executeCommand('live-jinja-tester.render');
  });
  context.subscriptions.push(openInPanelCommand);
  
  // Update for Current File
  const updateForCurrentFileCommand = vscode.commands.registerCommand('live-jinja-tester.updateForCurrentFile', () => {
    const editor = vscode.window.activeTextEditor;
    const fileName = editor ? editor.document.fileName.split(/[/\\]/).pop() : 'current file';
    
    // Try sidebar first
    if (sidebarProvider && sidebarProvider.updateForCurrentFile()) {
      vscode.window.showInformationMessage(`Updated for: ${fileName}`);
      return;
    }
    
    // Try panel if sidebar didn't work
    const currentPanel = getCurrentPanel();
    if (currentPanel && editor) {
      // Extract variables from the current template
      const templateContent = editor.document.getText();
      const extractedVars = extractVariablesFromTemplate(templateContent);
      
      currentPanel.webview.postMessage({ 
        type: 'replaceVariables',
        extractedVariables: extractedVars
      });
      vscode.window.showInformationMessage(`Updated for: ${fileName}`);
      return;
    }
    
    // If neither sidebar nor panel is active, show warning
    vscode.window.showWarningMessage('Jinja Renderer view is not active');
  });
  context.subscriptions.push(updateForCurrentFileCommand);
  
  // Show Dependency Graph
  const showDependencyGraphCommand = vscode.commands.registerCommand('live-jinja-tester.showDependencyGraph', () => {
    const currentPanel = getCurrentPanel();
    
    if (sidebarProvider && sidebarProvider._view && sidebarProvider._view.visible) {
      sidebarProvider._view.webview.postMessage({ type: 'requestDependencyGraph' });
    } else if (currentPanel) {
      currentPanel.webview.postMessage({ type: 'requestDependencyGraph' });
    } else {
      vscode.window.showWarningMessage('Jinja Renderer view is not active. Please open the sidebar or panel first.');
    }
  });
  context.subscriptions.push(showDependencyGraphCommand);
  
  // Show Variable Inspector
  const showVariableInspectorCommand = vscode.commands.registerCommand('live-jinja-tester.showVariableInspector', () => {
    const currentPanel = getCurrentPanel();
    
    // Send message to webview to open inspector
    if (sidebarProvider && sidebarProvider._view && sidebarProvider._view.visible) {
      sidebarProvider._view.webview.postMessage({ type: 'showVariableInspector' });
    } else if (currentPanel) {
      currentPanel.webview.postMessage({ type: 'showVariableInspector' });
    } else {
      vscode.window.showWarningMessage('Jinja Renderer view is not active. Please open the sidebar or panel first.');
    }
  });
  context.subscriptions.push(showVariableInspectorCommand);
}

module.exports = {
  registerActionCommands
};

