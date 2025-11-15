const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

/**
 * Generates the webview HTML content by combining template, styles, and script
 * Version 1.4.5 - Refactored to use separate HTML, CSS, and JS files for better readability
 * 
 * @param {vscode.Webview} webview - Target webview used for URI generation
 * @param {vscode.Uri} extensionUri - Root URI of the extension
 * @param {boolean} isSidebar - Whether this is for sidebar or panel view
 * @returns {string} Complete HTML content for the webview
 */
function getWebviewContent(webview, extensionUri, isSidebar = false) {
    const ensureTrailingSlash = (uriString) => uriString.endsWith('/') ? uriString : `${uriString}/`;
    const asWebviewUri = (...segments) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...segments)).toString();

  // Read the separate files
  const templatePath = path.join(__dirname, 'assets', 'template.html');
  const stylesPath = path.join(__dirname, 'assets', 'styles.css');
  const scriptPath = path.join(__dirname, 'assets', 'webview.js');
  
  let template = fs.readFileSync(templatePath, 'utf8');
  const styles = fs.readFileSync(stylesPath, 'utf8');
  const script = fs.readFileSync(scriptPath, 'utf8');
  
    // Compute local asset URIs
    const pyodideScriptUri = asWebviewUri('resources', 'vendor', 'pyodide', 'pyodide.js');
    const pyodideBaseUrl = ensureTrailingSlash(pyodideScriptUri.slice(0, pyodideScriptUri.lastIndexOf('/') + 1));
    const markedScriptUri = asWebviewUri('resources', 'vendor', 'marked', 'marked.min.js');
    const mermaidScriptUri = asWebviewUri('resources', 'vendor', 'mermaid', 'mermaid.min.js');
    const codiconsCssUri = asWebviewUri('resources', 'vendor', 'codicons', 'dist', 'codicon.css');

  // Prepare conditional UI elements based on sidebar/panel mode
  const fileHistoryDropdown = isSidebar ? `
    <div class="file-history-dropdown" id="file-history-dropdown" title="Recent files">
        <i class="codicon codicon-chevron-down"></i>
    </div>
    <div class="file-history-menu" id="file-history-menu">
        <!-- History items will be populated here -->
    </div>
  ` : '';
  
  const autoRerenderToggle = isSidebar ? `
    <div class="header-actions">
        <div class="auto-rerender-toggle" id="auto-rerender-toggle" title="Toggle Auto-rerender">
            <i class="codicon codicon-debug-start"></i>
        </div>
    </div>
  ` : '';
  
  const panelControls = !isSidebar ? `
    <!-- Panel mode: Toggle switches -->
    <div class="controls">
        <div class="control-group">
            <span class="control-label">Markdown</span>
            <label class="switch">
                <input type="checkbox" id="markdown-toggle">
                <span class="slider"></span>
            </label>
        </div>
        <div class="control-group">
            <span class="control-label">Mermaid</span>
            <label class="switch">
                <input type="checkbox" id="mermaid-toggle">
                <span class="slider"></span>
            </label>
        </div>
        <div class="control-group">
            <span class="control-label">Show Whitespace</span>
            <label class="switch">
                <input type="checkbox" id="show-whitespace-toggle">
                <span class="slider"></span>
            </label>
        </div>
        <div class="control-group">
            <span class="control-label">Cull Whitespace</span>
            <label class="switch">
                <input type="checkbox" id="cull-whitespace-toggle" checked>
                <span class="slider"></span>
            </label>
        </div>
    </div>
  ` : '';
  
  const outputFooter = !isSidebar ? `
    <div class="output-footer">
        <button class="footer-btn" id="reextract-variables-btn" title="Extract variables from template">↻ Extract Variables</button>
        <div class="footer-spacer"></div>
        <button class="footer-btn" id="rerender-btn" title="Manually trigger re-render">▶ Rerender</button>
        <button class="footer-btn" id="copy-output-btn" title="Copy output to clipboard">⎘ Copy Output</button>
    </div>
  ` : '';
  
  // Replace placeholders in template
    template = template.replace('{{STYLES}}', `<style>\n${styles}\n</style>`);
    template = template.replace('{{PYODIDE_SCRIPT}}', `<script src="${pyodideScriptUri}"></script>`);
    template = template.replace('{{MARKED_SCRIPT}}', `<script src="${markedScriptUri}"></script>`);
    template = template.replace('{{MERMAID_SCRIPT}}', `<script src="${mermaidScriptUri}"></script>`);
    template = template.replace('{{CODICONS_STYLESHEET}}', `<link rel="stylesheet" href="${codiconsCssUri}">`);
  template = template.replace('{{FILE_HISTORY_DROPDOWN}}', fileHistoryDropdown);
  template = template.replace('{{AUTO_RERENDER_TOGGLE}}', autoRerenderToggle);
  template = template.replace('{{PANEL_CONTROLS}}', panelControls);
  template = template.replace('{{OUTPUT_FOOTER}}', outputFooter);
  
  // Replace IS_SIDEBAR placeholder in script
    const processedScript = script
        .replace('"__IS_SIDEBAR_PLACEHOLDER__"', isSidebar.toString())
        .replace('"__PYODIDE_INDEX_URL__"', JSON.stringify(pyodideBaseUrl));
  template = template.replace('{{SCRIPT}}', `<script>\n${processedScript}\n</script>`);
  
  return template;
}

module.exports = {
  getWebviewContent
};
