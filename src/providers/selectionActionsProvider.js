const vscode = require('vscode');

/**
 * Provides code actions (quick actions) when text is selected in Jinja/text files
 * Shows lightbulb/action buttons similar to GitHub Copilot
 */
class SelectionActionsProvider {
  /**
   * @param {vscode.TextDocument} document 
   * @param {vscode.Range | vscode.Selection} range 
   * @param {vscode.CodeActionContext} _context 
   * @param {vscode.CancellationToken} _token 
   * @returns {vscode.CodeAction[] | undefined}
   */
  provideCodeActions(document, range, _context, _token) {
    // Only show actions when there's an actual selection (not just cursor position)
    if (range.isEmpty) {
      return undefined;
    }

    const actions = [];

    // Action 1: Render Selection in Sidebar
    const renderSidebarAction = new vscode.CodeAction(
      '$(layout-sidebar-left) Render Selection in Sidebar',
      vscode.CodeActionKind.Empty
    );
    renderSidebarAction.command = {
      command: 'live-jinja-tester.showSidebar',
      title: 'Render Selection in Sidebar',
      arguments: []
    };
    renderSidebarAction.isPreferred = true; // Shows first in the list
    actions.push(renderSidebarAction);

    // Action 2: Render Selection in Editor Pane
    const renderPanelAction = new vscode.CodeAction(
      '$(open-preview) Render Selection in Editor Pane',
      vscode.CodeActionKind.Empty
    );
    renderPanelAction.command = {
      command: 'live-jinja-tester.render',
      title: 'Render Selection in Editor Pane',
      arguments: []
    };
    actions.push(renderPanelAction);

    return actions;
  }
}

/**
 * Register the selection actions provider
 * @param {vscode.ExtensionContext} context 
 */
function registerSelectionActionsProvider(context) {
  // Register for Jinja and text files
  const selector = [
    { scheme: 'file', language: 'jinja' },
    { scheme: 'file', language: 'jinja2' },
    { scheme: 'file', language: 'jinja-html' },
    { scheme: 'file', language: 'plaintext' },
    { scheme: 'file', pattern: '**/*.jinja' },
    { scheme: 'file', pattern: '**/*.j2' },
    { scheme: 'file', pattern: '**/*.txt' }
  ];

  const provider = new SelectionActionsProvider();
  
  const disposable = vscode.languages.registerCodeActionsProvider(
    selector,
    provider,
    {
      providedCodeActionKinds: [vscode.CodeActionKind.Empty]
    }
  );

  context.subscriptions.push(disposable);
  console.log('✅ Selection actions provider registered');
}

module.exports = {
  SelectionActionsProvider,
  registerSelectionActionsProvider
};
