const vscode = require('vscode');

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
    if (sidebarProvider && sidebarProvider._view) {
      sidebarProvider._view.webview.postMessage({ type: 'reextractVariables' });
      vscode.window.showInformationMessage('Variables extracted from template');
    } else {
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
    if (sidebarProvider && sidebarProvider.updateForCurrentFile()) {
      const editor = vscode.window.activeTextEditor;
      const fileName = editor ? editor.document.fileName.split(/[/\\]/).pop() : 'current file';
      vscode.window.showInformationMessage(`Updated for: ${fileName}`);
    } else {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
    }
  });
  context.subscriptions.push(updateForCurrentFileCommand);
}

module.exports = {
  registerActionCommands
};
