const vscode = require('vscode');
const { JinjaRendererViewProvider } = require('./src/providers/jinjaRendererViewProvider');
const { registerSelectionActionsProvider } = require('./src/providers/selectionActionsProvider');
const { JinjaIntelliSenseManager } = require('./src/providers/jinjaIntelliSenseManager');
const { JinjaSyntaxDecorator } = require('./src/providers/jinjaSyntaxDecorator');
const { registerSettingsCommands } = require('./src/commands/settingsCommands');
const { registerVariableCommands } = require('./src/commands/variableCommands');
const { registerImportExportCommands } = require('./src/commands/importExportCommands');
const { registerActionCommands } = require('./src/commands/actionCommands');
const { registerRenderCommand, registerConfigurationListener, getCurrentPanel } = require('./src/commands/renderCommand');
const { createStatusBarItem, updateStatusBar } = require('./src/utils/statusBar');

/**
 * Migrate old settings to new categorized settings
 */
async function migrateSettings() {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  const inspect = (key) => config.inspect(key);
  
  // Mapping of old settings to new settings
  const migrations = [
    { old: 'enableMarkdown', new: 'rendering.enableMarkdown' },
    { old: 'enableMermaid', new: 'rendering.enableMermaid' },
    { old: 'showWhitespace', new: 'rendering.showWhitespace' },
    { old: 'cullWhitespace', new: 'rendering.cullWhitespace' },
    { old: 'autoRerender', new: 'rendering.autoRerender' }
  ];
  
  let migrated = false;
  
  for (const { old, new: newKey } of migrations) {
    const oldInspect = inspect(old);
    const newInspect = inspect(newKey);
    
    // Check if old setting exists in user settings
    if (oldInspect && (oldInspect.globalValue !== undefined || oldInspect.workspaceValue !== undefined)) {
      // Only migrate if new setting doesn't exist yet
      if (newInspect.globalValue === undefined && newInspect.workspaceValue === undefined) {
        // Migrate global value
        if (oldInspect.globalValue !== undefined) {
          await config.update(newKey, oldInspect.globalValue, vscode.ConfigurationTarget.Global);
          await config.update(old, undefined, vscode.ConfigurationTarget.Global); // Remove old setting
          migrated = true;
        }
        
        // Migrate workspace value
        if (oldInspect.workspaceValue !== undefined) {
          await config.update(newKey, oldInspect.workspaceValue, vscode.ConfigurationTarget.Workspace);
          await config.update(old, undefined, vscode.ConfigurationTarget.Workspace); // Remove old setting
          migrated = true;
        }
      } else {
        // New settings exist - just remove old ones without migrating
        if (oldInspect.globalValue !== undefined) {
          await config.update(old, undefined, vscode.ConfigurationTarget.Global);
        }
        if (oldInspect.workspaceValue !== undefined) {
          await config.update(old, undefined, vscode.ConfigurationTarget.Workspace);
        }
      }
    }
  }
  
  if (migrated) {
    console.log('✅ Settings migrated to new categorized format');
  }
}

/**
 * This method is called when your extension is activated
 */
async function activate(context) {
  try {
    console.log('🚀 live-jinja-renderer extension is now ACTIVE!');
    console.log('Extension path:', context.extensionPath);

    // Migrate old settings to new format
    await migrateSettings();

    const currentVersion = context.extension.packageJSON.version;
    const previousVersion = context.globalState.get('extensionVersion');

    if (previousVersion !== currentVersion) {
      context.globalState.update('extensionVersion', currentVersion);

      if (previousVersion) {
        const message = `🎉 Live Jinja Renderer updated to v${currentVersion}!\n\n🐛 FIXED: Snippet Completions\n• Restored broken code snippets (jif, jfor, jvar, etc.)\n• Fixed corrupted package.json (was 0 bytes)\n• All 30 Jinja2 snippets now working\n• No more bracket/percentage duplication`;
        vscode.window.showInformationMessage(
          message,
          'View Release Notes',
          'Dismiss'
        ).then(result => {
          if (result === 'View Release Notes') {
            vscode.env.openExternal(vscode.Uri.parse(
              'https://github.com/Keshav-Madhav/live-jinja-renderer/blob/main/CHANGELOG.md'
            ));
          }
        });
      }
    }

    // Show a notification to confirm activation
    vscode.window.showInformationMessage('✅ Live Jinja Renderer is now active!');
    
    // Create status bar item
    createStatusBarItem(context);
    
    // Initialize IntelliSense manager
    const intelliSenseManager = new JinjaIntelliSenseManager(context);
    
    // Initialize Jinja syntax decorator
    const syntaxDecorator = new JinjaSyntaxDecorator();
    context.subscriptions.push({
      dispose: () => syntaxDecorator.dispose()
    });

    // Set up syntax highlighting for active editor
    if (vscode.window.activeTextEditor) {
      syntaxDecorator.activeEditor = vscode.window.activeTextEditor;
      syntaxDecorator.updateDecorations();
    }

    // Listen for editor changes
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        syntaxDecorator.activeEditor = editor;
        if (editor) {
          syntaxDecorator.updateDecorations();
        }
      })
    );

    // Listen for document changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        if (syntaxDecorator.activeEditor && event.document === syntaxDecorator.activeEditor.document) {
          syntaxDecorator.triggerUpdateDecorations();
        }
      })
    );

    // Listen for configuration changes to update highlighting
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('liveJinjaRenderer.highlighting')) {
          if (syntaxDecorator.activeEditor) {
            syntaxDecorator.updateDecorations();
          }
        }
      })
    );
    
    // Register the sidebar webview view provider
    const sidebarProvider = new JinjaRendererViewProvider(context, intelliSenseManager);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('jinjaRendererView', sidebarProvider)
    );
    
    // Register selection actions provider (lightbulb actions on text selection)
    registerSelectionActionsProvider(context);
    
    // Register all commands
    registerSettingsCommands(context);
    registerVariableCommands(context, sidebarProvider, getCurrentPanel);
    registerImportExportCommands(context, sidebarProvider, getCurrentPanel);
    registerActionCommands(context, sidebarProvider, getCurrentPanel);
    registerRenderCommand(context, intelliSenseManager, sidebarProvider);
    
    // Register configuration listener
    registerConfigurationListener(context, sidebarProvider);
    
    // Listen for configuration changes to update status bar
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('liveJinjaRenderer')) {
          updateStatusBar();
        }
      })
    );
    
    console.log('✅ Commands registered successfully!');
  
  } catch (error) {
    console.error('❌ Error during extension activation:', error);
    vscode.window.showErrorMessage('Failed to activate Live Jinja Renderer: ' + error.message);
  }
}

/**
 * This method is called when your extension is deactivated
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
