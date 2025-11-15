const vscode = require('vscode');
const { JinjaCompletionProvider } = require('./jinjaCompletionProvider');

/**
 * Manages IntelliSense providers for Jinja templates
 */
class JinjaIntelliSenseManager {
  constructor(context) {
    this.context = context;
    this.completionProvider = new JinjaCompletionProvider();
    this.disposables = [];
    
    this.registerProviders();
  }

  /**
   * Register completion provider for Jinja files
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
    
    console.log('✅ Jinja IntelliSense completion provider registered with enhanced triggers');
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
