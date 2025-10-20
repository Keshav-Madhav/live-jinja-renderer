const vscode = require('vscode');

/**
 * Register variable-related commands (save, load, delete presets)
 */
function registerVariableCommands(context, sidebarProvider, getCurrentPanel) {
  // Save Variables command
  const saveVariablesCommand = vscode.commands.registerCommand('live-jinja-tester.saveVariables', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    // Get current file name for default value
    const editor = vscode.window.activeTextEditor;
    let defaultName = 'Variables';
    if (editor) {
      const fileName = editor.document.fileName.split(/[/\\]/).pop();
      const baseName = fileName.replace(/\.(jinja|jinja2|j2|txt)$/i, '');
      defaultName = `${baseName} Variables`;
    }
    
    // Get the preset name from the user
    const presetName = await vscode.window.showInputBox({
      prompt: 'Enter a name for this variable preset',
      placeHolder: 'e.g., API Response Sample, Test Data 1',
      value: defaultName,
      valueSelection: [0, defaultName.length],
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Preset name cannot be empty';
        }
        return null;
      }
    });
    
    if (presetName && presetName.trim()) {
      targetView.webview.postMessage({ 
        type: 'requestVariables',
        presetName: presetName.trim()
      });
    }
  });
  context.subscriptions.push(saveVariablesCommand);
  
  // Load Variables command
  const loadVariablesCommand = vscode.commands.registerCommand('live-jinja-tester.loadVariables', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();
    
    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }
    
    const savedPresets = context.globalState.get('jinjaVariablePresets', {});
    const presetNames = Object.keys(savedPresets);
    
    if (presetNames.length === 0) {
      vscode.window.showInformationMessage('No saved variable presets found');
      return;
    }
    
    const selected = await vscode.window.showQuickPick(presetNames, {
      placeHolder: 'Select a variable preset to load'
    });
    
    if (selected) {
      const variables = savedPresets[selected];
      targetView.webview.postMessage({ 
        type: 'loadVariables',
        variables: variables
      });
      vscode.window.showInformationMessage(`Loaded preset: ${selected}`);
    }
  });
  context.subscriptions.push(loadVariablesCommand);
  
  // Delete Variables command
  const deleteVariablesCommand = vscode.commands.registerCommand('live-jinja-tester.deleteVariables', async () => {
    const savedPresets = context.globalState.get('jinjaVariablePresets', {});
    const presetNames = Object.keys(savedPresets);
    
    if (presetNames.length === 0) {
      vscode.window.showInformationMessage('No saved variable presets found');
      return;
    }
    
    const selected = await vscode.window.showQuickPick(presetNames, {
      placeHolder: 'Select a variable preset to delete'
    });
    
    if (selected) {
      const confirm = await vscode.window.showWarningMessage(
        `Delete preset "${selected}"?`,
        { modal: true },
        'Delete'
      );
      
      if (confirm === 'Delete') {
        delete savedPresets[selected];
        await context.globalState.update('jinjaVariablePresets', savedPresets);
        vscode.window.showInformationMessage(`Deleted preset: ${selected}`);
      }
    }
  });
  context.subscriptions.push(deleteVariablesCommand);
}

module.exports = {
  registerVariableCommands
};
