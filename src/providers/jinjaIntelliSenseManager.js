const vscode = require('vscode');
const { JinjaCompletionProvider } = require('./jinjaCompletionProvider');
const { JinjaHoverProvider } = require('./jinjaHoverProvider');

/**
 * Manages IntelliSense providers for Jinja templates
 */
class JinjaIntelliSenseManager {
  constructor(context) {
    this.context = context;
    this.completionProvider = new JinjaCompletionProvider();
    this.hoverProvider = new JinjaHoverProvider();
    this.disposables = [];
    
    this.registerProviders();
  }

  /**
   * Register completion and hover providers for Jinja files
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

    // Register completion provider
    const completionDisposable = vscode.languages.registerCompletionItemProvider(
      jinjaDocumentSelector,
      this.completionProvider,
      '.', // Trigger on dot for nested properties
      '|'  // Trigger on pipe for filters
    );
    
    // Register hover provider
    const hoverDisposable = vscode.languages.registerHoverProvider(
      jinjaDocumentSelector,
      this.hoverProvider
    );

    this.disposables.push(completionDisposable, hoverDisposable);
    this.context.subscriptions.push(completionDisposable, hoverDisposable);
    
    console.log('✅ Jinja IntelliSense providers registered');
  }

  /**
   * Update variables for all providers
   * @param {Object} variables - Variables extracted from the template
   */
  updateVariables(variables) {
    this.completionProvider.updateVariables(variables);
    this.hoverProvider.updateVariables(variables);
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
