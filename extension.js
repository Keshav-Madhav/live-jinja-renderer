const vscode = require('vscode');
const { JinjaRendererViewProvider } = require('./src/providers/jinjaRendererViewProvider');
const { registerSettingsCommands } = require('./src/commands/settingsCommands');
const { registerVariableCommands } = require('./src/commands/variableCommands');
const { registerActionCommands } = require('./src/commands/actionCommands');
const { registerRenderCommand, registerConfigurationListener, getCurrentPanel } = require('./src/commands/renderCommand');
const { createStatusBarItem, updateStatusBar } = require('./src/utils/statusBar');

/**
 * This method is called when your extension is activated
 */
function activate(context) {
  try {
    console.log('🚀 live-jinja-renderer extension is now ACTIVE!');
    console.log('Extension path:', context.extensionPath);

    const currentVersion = context.extension.packageJSON.version;
    const previousVersion = context.globalState.get('extensionVersion');

    if (previousVersion !== currentVersion) {
      context.globalState.update('extensionVersion', currentVersion);

      if (previousVersion) {
        const message = `Live Jinja Renderer updated to v${currentVersion}! 🎉\n\n✨ New in this version:\n• Enhanced settings with clear categories (Rendering, Editor, Variables, History, Advanced)\n• 8 new customization options for better control\n\nCheck the settings for all new options!`;
        vscode.window.showInformationMessage(
          message,
          'View Release Notes',
          'Open Settings',
          'Dismiss'
        ).then(result => {
          if (result === 'View Release Notes') {
            vscode.env.openExternal(vscode.Uri.parse(
              'https://github.com/Keshav-Madhav/live-jinja-renderer/blob/main/CHANGELOG.md'
            ));
          } else if (result === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:KilloWatts.live-jinja-renderer');
          }
        });
      }
    }

    // Show a notification to confirm activation
    vscode.window.showInformationMessage('✅ Live Jinja Renderer is now active!');
    
    // Create status bar item
    createStatusBarItem(context);
    
    // Register the sidebar webview view provider
    const sidebarProvider = new JinjaRendererViewProvider(context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('jinjaRendererView', sidebarProvider)
    );
    
    // Register all commands
    registerSettingsCommands(context);
    registerVariableCommands(context, sidebarProvider, getCurrentPanel);
    registerActionCommands(context, sidebarProvider, getCurrentPanel);
    registerRenderCommand(context);
    
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
