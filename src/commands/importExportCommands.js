const vscode = require('vscode');
const path = require('path');

/**
 * Register import/export commands for variables
 */
function registerImportExportCommands(context, sidebarProvider, getCurrentPanel) {
  
  // Export variables to JSON file
  const exportToFileCommand = vscode.commands.registerCommand('live-jinja-tester.exportVariablesToFile', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    // Request current variables from webview
    targetView.webview.postMessage({ 
      type: 'requestVariablesForExport',
      exportType: 'file'
    });
  });
  context.subscriptions.push(exportToFileCommand);
  
  // Export variables to clipboard as JSON
  const exportToClipboardCommand = vscode.commands.registerCommand('live-jinja-tester.exportVariablesToClipboard', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    // Request current variables from webview
    targetView.webview.postMessage({ 
      type: 'requestVariablesForExport',
      exportType: 'clipboard'
    });
  });
  context.subscriptions.push(exportToClipboardCommand);
  
  // Import variables from JSON file
  const importFromFileCommand = vscode.commands.registerCommand('live-jinja-tester.importVariablesFromFile', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    // Show file picker
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      },
      openLabel: 'Import Variables',
      defaultUri: workspaceFolders ? workspaceFolders[0].uri : undefined
    });
    
    if (!fileUris || fileUris.length === 0) {
      return;
    }
    
    const fileUri = fileUris[0];
    
    try {
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const jsonString = Buffer.from(fileContent).toString('utf8');
      
      // Validate JSON
      let variables;
      try {
        variables = JSON.parse(jsonString);
      } catch (parseError) {
        vscode.window.showErrorMessage(
          `Invalid JSON file: ${parseError.message}\n\n` +
          `Please ensure the file contains valid JSON with a structure like:\n` +
          `{ "variableName": "value", "anotherVar": "value" }`
        );
        return;
      }
      
      // Check if it's an object
      if (typeof variables !== 'object' || Array.isArray(variables)) {
        const proceed = await vscode.window.showWarningMessage(
          'The JSON file does not contain an object. Import anyway?',
          'Yes', 'No'
        );
        
        if (proceed !== 'Yes') {
          return;
        }
      }
      
      // Send to webview
      targetView.webview.postMessage({ 
        type: 'loadVariables',
        variables: variables
      });
      
      const fileName = path.basename(fileUri.fsPath);
      vscode.window.showInformationMessage(`Variables imported from: ${fileName}`);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import variables: ${error.message}`);
    }
  });
  context.subscriptions.push(importFromFileCommand);
  
  // Import variables from active editor
  const importFromEditorCommand = vscode.commands.registerCommand('live-jinja-tester.importVariablesFromEditor', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }
    
    // Get selected text or entire document
    const selection = editor.selection;
    let jsonText;
    
    if (!selection.isEmpty) {
      jsonText = editor.document.getText(selection);
    } else {
      jsonText = editor.document.getText();
    }
    
    // Validate JSON
    let variables;
    try {
      variables = JSON.parse(jsonText);
    } catch (parseError) {
      vscode.window.showErrorMessage(`Invalid JSON in editor: ${parseError.message}`);
      return;
    }
    
    // Check if it's an object
    if (typeof variables !== 'object' || Array.isArray(variables)) {
      const proceed = await vscode.window.showWarningMessage(
        'The selected JSON is not an object. Import anyway?',
        'Yes', 'No'
      );
      
      if (proceed !== 'Yes') {
        return;
      }
    }
    
    // Send to webview
    targetView.webview.postMessage({ 
      type: 'loadVariables',
      variables: variables
    });
    
    const source = selection.isEmpty ? 'active editor' : 'selection';
    vscode.window.showInformationMessage(`Variables imported from ${source}`);
  });
  context.subscriptions.push(importFromEditorCommand);
  
  // Import from opened JSON files in workspace
  const importFromWorkspaceCommand = vscode.commands.registerCommand('live-jinja-tester.importVariablesFromWorkspace', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    // Find all JSON files in workspace
    const jsonFiles = await vscode.workspace.findFiles('**/*.json', '**/node_modules/**', 100);
    
    if (jsonFiles.length === 0) {
      vscode.window.showInformationMessage('No JSON files found in workspace');
      return;
    }
    
    // Create quick pick items
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const items = jsonFiles.map(uri => {
      const relativePath = workspaceFolders.length > 0 
        ? vscode.workspace.asRelativePath(uri)
        : path.basename(uri.fsPath);
      
      return {
        label: path.basename(uri.fsPath),
        description: relativePath,
        uri: uri
      };
    });
    
    // Show quick pick
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a JSON file to import variables from',
      matchOnDescription: true
    });
    
    if (!selected) {
      return;
    }
    
    try {
      const fileContent = await vscode.workspace.fs.readFile(selected.uri);
      const jsonString = Buffer.from(fileContent).toString('utf8');
      
      // Validate JSON
      let variables;
      try {
        variables = JSON.parse(jsonString);
      } catch (parseError) {
        vscode.window.showErrorMessage(`Invalid JSON file: ${parseError.message}`);
        return;
      }
      
      // Check if it's an object
      if (typeof variables !== 'object' || Array.isArray(variables)) {
        const proceed = await vscode.window.showWarningMessage(
          'The JSON file does not contain an object. Import anyway?',
          'Yes', 'No'
        );
        
        if (proceed !== 'Yes') {
          return;
        }
      }
      
      // Send to webview
      targetView.webview.postMessage({ 
        type: 'loadVariables',
        variables: variables
      });
      
      vscode.window.showInformationMessage(`Variables imported from: ${selected.label}`);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import variables: ${error.message}`);
    }
  });
  context.subscriptions.push(importFromWorkspaceCommand);
}

/**
 * Handle export variables request from webview
 */
async function handleExportVariables(variables, exportType, currentFileUri) {
  if (exportType === 'clipboard') {
    // Export to clipboard
    try {
      const jsonString = JSON.stringify(variables, null, 2);
      await vscode.env.clipboard.writeText(jsonString);
      vscode.window.showInformationMessage('Variables copied to clipboard as JSON');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to copy to clipboard: ${error.message}`);
    }
  } else if (exportType === 'file') {
    // Export to file
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    // Generate default file name
    let defaultName = 'variables.json';
    if (currentFileUri) {
      try {
        const templateFileName = path.basename(currentFileUri);
        const baseName = templateFileName.replace(/\.(jinja|jinja2|j2|txt)$/i, '');
        defaultName = `${baseName}-variables.json`;
      } catch {
        // Use default name if extraction fails
      }
    }
    
    // Show save dialog
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: workspaceFolders 
        ? vscode.Uri.joinPath(workspaceFolders[0].uri, defaultName)
        : vscode.Uri.file(defaultName),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      },
      saveLabel: 'Export Variables'
    });
    
    if (!saveUri) {
      return;
    }
    
    try {
      const jsonString = JSON.stringify(variables, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');
      await vscode.workspace.fs.writeFile(saveUri, buffer);
      
      const fileName = path.basename(saveUri.fsPath);
      const openFile = await vscode.window.showInformationMessage(
        `Variables exported to: ${fileName}`,
        'Open File'
      );
      
      if (openFile === 'Open File') {
        const doc = await vscode.workspace.openTextDocument(saveUri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export variables: ${error.message}`);
    }
  }
}

module.exports = {
  registerImportExportCommands,
  handleExportVariables
};
