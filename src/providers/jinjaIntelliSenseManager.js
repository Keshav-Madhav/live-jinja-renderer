const vscode = require('vscode');
const { JinjaCompletionProvider } = require('./jinjaCompletionProvider');
const { JinjaDefinitionProvider } = require('./jinjaDefinitionProvider');
const { JinjaHoverProvider } = require('./jinjaHoverProvider');

/**
 * Manages IntelliSense providers for Jinja templates
 */
class JinjaIntelliSenseManager {
  constructor(context) {
    this.context = context;
    this.completionProvider = new JinjaCompletionProvider();
    this.definitionProvider = new JinjaDefinitionProvider();
    this.hoverProvider = new JinjaHoverProvider();
    this.disposables = [];
    
    this.registerProviders();
  }

  /**
   * Register completion and definition providers for Jinja files
   */
  registerProviders() {
    // File patterns that should have IntelliSense
    const jinjaDocumentSelector = [
      { language: 'jinja' },
      { language: 'jinja-html' },
      { pattern: '**/*.jinja' },
      { pattern: '**/*.jinja2' },
      { pattern: '**/*.j2' },
      { language: 'plaintext', pattern: '**/*.txt' }
    ];

    // Register completion provider with comprehensive trigger characters
    const completionDisposable = vscode.languages.registerCompletionItemProvider(
      jinjaDocumentSelector,
      this.completionProvider,
      '{', // Trigger on opening brace
      '%', // Trigger on percent (for {% %})
      '.', // Trigger on dot for nested properties
      '|', // Trigger on pipe for filters
      ' '  // Trigger on space for keywords after 'is', 'for', 'if', etc.
    );

    this.disposables.push(completionDisposable);
    this.context.subscriptions.push(completionDisposable);

    // Register definition provider for "Go to Definition" (Ctrl/Cmd+Click)
    const definitionDisposable = vscode.languages.registerDefinitionProvider(
      jinjaDocumentSelector,
      this.definitionProvider
    );

    this.disposables.push(definitionDisposable);
    this.context.subscriptions.push(definitionDisposable);

    // Register hover provider for documentation on hover
    const hoverDisposable = vscode.languages.registerHoverProvider(
      jinjaDocumentSelector,
      this.hoverProvider
    );

    this.disposables.push(hoverDisposable);
    this.context.subscriptions.push(hoverDisposable);

    // Watch for file changes to clear definition cache
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{jinja,jinja2,j2,html,txt}');
    fileWatcher.onDidChange(() => this.definitionProvider.clearCache());
    fileWatcher.onDidCreate(() => this.definitionProvider.clearCache());
    fileWatcher.onDidDelete(() => this.definitionProvider.clearCache());
    
    this.disposables.push(fileWatcher);
    this.context.subscriptions.push(fileWatcher);
  }

  /**
   * Update variables for the completion provider
   * @param {Object} variables - Variables extracted from the template
   */
  updateVariables(variables) {
    this.completionProvider.updateVariables(variables);
  }

  /**
   * Dispose all providers
   */
  dispose() {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}

module.exports = { JinjaIntelliSenseManager };
