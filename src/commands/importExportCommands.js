const vscode = require('vscode');
const path = require('path');
const jsyaml = require('js-yaml');
const TOML = require('smol-toml');

/**
 * Get the current variables format from configuration
 */
function getVariablesFormat() {
  return vscode.workspace.getConfiguration('liveJinjaRenderer').get('variables.format', 'json');
}

/**
 * Get file extension for a format
 */
function getFormatExtension(format) {
  switch (format) {
    case 'yaml': return 'yaml';
    case 'toml': return 'toml';
    case 'json':
    default: return 'json';
  }
}

/**
 * Serialize a JS object to the given format
 */
function serializeForFormat(obj, format) {
  switch (format) {
    case 'yaml':
      return jsyaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true }).trimEnd();
    case 'toml':
      return TOML.stringify(obj).trimEnd();
    case 'json':
    default:
      return JSON.stringify(obj, null, 2);
  }
}

/**
 * Try to parse text as any supported format (JSON, YAML, TOML)
 * Returns { variables, detectedFormat } or throws
 */
function parseAnyFormat(text, fileName) {
  const ext = fileName ? path.extname(fileName).toLowerCase() : '';

  // Try based on file extension first
  if (ext === '.yaml' || ext === '.yml') {
    const result = jsyaml.load(text);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return { variables: result, detectedFormat: 'yaml' };
    }
  }
  if (ext === '.toml') {
    return { variables: TOML.parse(text), detectedFormat: 'toml' };
  }
  if (ext === '.json') {
    return { variables: JSON.parse(text), detectedFormat: 'json' };
  }

  // No known extension — try each format
  // JSON first (most strict)
  try {
    const result = JSON.parse(text);
    if (result && typeof result === 'object') {
      return { variables: result, detectedFormat: 'json' };
    }
  } catch { /* not JSON */ }

  // YAML (accepts almost everything so try TOML first)
  try {
    const result = TOML.parse(text);
    if (result && typeof result === 'object') {
      return { variables: result, detectedFormat: 'toml' };
    }
  } catch { /* not TOML */ }

  try {
    const result = jsyaml.load(text);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return { variables: result, detectedFormat: 'yaml' };
    }
  } catch { /* not YAML */ }

  throw new Error('Could not parse file as JSON, YAML, or TOML');
}

/**
 * Register import/export commands for variables
 */
function registerImportExportCommands(context, sidebarProvider, getCurrentPanel) {

  // Export variables to file
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

  // Export variables to clipboard
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

  // Import variables from file
  const importFromFileCommand = vscode.commands.registerCommand('live-jinja-tester.importVariablesFromFile', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();

    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }

    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Show file picker — accept all variable file types
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'Variable Files': ['json', 'yaml', 'yml', 'toml'],
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
      const text = Buffer.from(fileContent).toString('utf8');
      const fileName = path.basename(fileUri.fsPath);

      let variables;
      try {
        const parsed = parseAnyFormat(text, fileName);
        variables = parsed.variables;
      } catch (parseError) {
        vscode.window.showErrorMessage(`Failed to parse ${fileName}: ${parseError.message}`);
        return;
      }

      // Check if it's an object
      if (typeof variables !== 'object' || Array.isArray(variables)) {
        const proceed = await vscode.window.showWarningMessage(
          'The file does not contain an object/mapping. Import anyway?',
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
    let text;

    if (!selection.isEmpty) {
      text = editor.document.getText(selection);
    } else {
      text = editor.document.getText();
    }

    const fileName = path.basename(editor.document.fileName);

    let variables;
    try {
      const parsed = parseAnyFormat(text, fileName);
      variables = parsed.variables;
    } catch (parseError) {
      vscode.window.showErrorMessage(`Failed to parse variables: ${parseError.message}`);
      return;
    }

    // Check if it's an object
    if (typeof variables !== 'object' || Array.isArray(variables)) {
      const proceed = await vscode.window.showWarningMessage(
        'The content is not an object/mapping. Import anyway?',
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

  // Import from variable files in workspace
  const importFromWorkspaceCommand = vscode.commands.registerCommand('live-jinja-tester.importVariablesFromWorkspace', async () => {
    const targetView = sidebarProvider && sidebarProvider._view ? sidebarProvider._view : getCurrentPanel();

    if (!targetView) {
      vscode.window.showWarningMessage('Jinja Renderer view is not active');
      return;
    }

    // Find all variable files in workspace
    const varFiles = await vscode.workspace.findFiles('**/*.{json,yaml,yml,toml}', '**/node_modules/**', 100);

    if (varFiles.length === 0) {
      vscode.window.showInformationMessage('No JSON, YAML, or TOML files found in workspace');
      return;
    }

    // Create quick pick items
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const items = varFiles.map(uri => {
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
      placeHolder: 'Select a file to import variables from',
      matchOnDescription: true
    });

    if (!selected) {
      return;
    }

    try {
      const fileContent = await vscode.workspace.fs.readFile(selected.uri);
      const text = Buffer.from(fileContent).toString('utf8');
      const fileName = path.basename(selected.uri.fsPath);

      let variables;
      try {
        const parsed = parseAnyFormat(text, fileName);
        variables = parsed.variables;
      } catch (parseError) {
        vscode.window.showErrorMessage(`Failed to parse ${fileName}: ${parseError.message}`);
        return;
      }

      // Check if it's an object
      if (typeof variables !== 'object' || Array.isArray(variables)) {
        const proceed = await vscode.window.showWarningMessage(
          'The file does not contain an object/mapping. Import anyway?',
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
  const format = getVariablesFormat();
  const ext = getFormatExtension(format);
  const formatLabel = format.toUpperCase();

  if (exportType === 'clipboard') {
    // Export to clipboard in current format
    try {
      const text = serializeForFormat(variables, format);
      await vscode.env.clipboard.writeText(text);
      vscode.window.showInformationMessage(`Variables copied to clipboard as ${formatLabel}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to copy to clipboard: ${error.message}`);
    }
  } else if (exportType === 'file') {
    // Export to file in current format
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Generate default file name
    let defaultName = `variables.${ext}`;
    if (currentFileUri) {
      try {
        const templateFileName = path.basename(currentFileUri);
        const baseName = templateFileName.replace(/\.(jinja|jinja2|j2|txt)$/i, '');
        defaultName = `${baseName}-variables.${ext}`;
      } catch {
        // Use default name if extraction fails
      }
    }

    // Show save dialog with format-appropriate filters
    const filters = {};
    filters[`${formatLabel} Files`] = [ext];
    filters['All Files'] = ['*'];

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: workspaceFolders
        ? vscode.Uri.joinPath(workspaceFolders[0].uri, defaultName)
        : vscode.Uri.file(defaultName),
      filters: filters,
      saveLabel: 'Export Variables'
    });

    if (!saveUri) {
      return;
    }

    try {
      const text = serializeForFormat(variables, format);
      const buffer = Buffer.from(text, 'utf8');
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
