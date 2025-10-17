const vscode = require('vscode');

/**
 * Extracts variable names and structures from a Jinja template
 * This is adapted from script.js to work in the extension context
 */
function extractVariablesFromTemplate(template) {
  const variableStructures = {};
  const referencedVariables = new Set();
  
  // Jinja2 keywords and operators that should NOT be treated as variables
  const jinjaKeywords = new Set([
    'if', 'elif', 'else', 'endif', 'for', 'endfor', 'while', 'endwhile',
    'set', 'endset', 'block', 'endblock', 'extends', 'include', 'import',
    'from', 'macro', 'endmacro', 'call', 'endcall', 'filter', 'endfilter',
    'with', 'endwith', 'autoescape', 'endautoescape', 'raw', 'endraw',
    'trans', 'endtrans', 'pluralize',
    'not', 'and', 'or', 'in', 'is', 'true', 'false', 'none', 'null',
    'True', 'False', 'None', 'NULL',
    'defined', 'undefined', 'none', 'boolean', 'false', 'true', 'integer',
    'float', 'number', 'string', 'sequence', 'iterable', 'mapping',
    'sameas', 'escaped', 'odd', 'even', 'divisibleby', 'equalto',
    'range', 'lipsum', 'dict', 'cycler', 'joiner', 'len', 'abs', 'round',
    'min', 'max', 'sum', 'list', 'tuple', 'set', 'sorted', 'reversed',
    'enumerate', 'zip', 'filter', 'map', 'any', 'all',
    'loop'
  ]);
  
  function isJinjaKeyword(varName) {
    return jinjaKeywords.has(varName.toLowerCase());
  }
  
  function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        const nextKey = keys[i + 1];
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(lastKey)) {
      const index = parseInt(lastKey);
      while (current.length <= index) {
        current.push('');
      }
      current[index] = value;
    } else {
      current[lastKey] = value;
    }
  }
  
  function safeSetVariable(varName, newValue, allowOverride = false) {
    if (!(varName in variableStructures)) {
      variableStructures[varName] = newValue;
    } else if (allowOverride) {
      const existing = variableStructures[varName];
      const isExistingSimple = typeof existing === 'string' || typeof existing === 'boolean' || typeof existing === 'number';
      const isNewComplex = typeof newValue === 'object' && newValue !== null;
      
      if (isExistingSimple && isNewComplex) {
        variableStructures[varName] = newValue;
      }
    }
  }
  
  // Extract {% set %} patterns
  const setPattern = /\{\%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\%\}/g;
  let match;
  
  while ((match = setPattern.exec(template)) !== null) {
    const sourceVar = match[2];
    const rootSourceVar = sourceVar.split('.')[0];
    
    if (isJinjaKeyword(rootSourceVar)) continue;
    
    referencedVariables.add(rootSourceVar);
    
    if (sourceVar.includes('.')) {
      safeSetVariable(rootSourceVar, {});
      setNestedProperty(variableStructures, sourceVar, '');
    } else {
      safeSetVariable(rootSourceVar, '');
    }
  }
  
  // Match {{ variable.property }} patterns
  const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?:\s*\|[^}]+)?\s*\}\}/g;
  
  while ((match = variablePattern.exec(template)) !== null) {
    const fullPath = match[1];
    const rootVar = fullPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    
    referencedVariables.add(rootVar);
    
    if (fullPath.includes('.')) {
      safeSetVariable(rootVar, {}, true);
      setNestedProperty(variableStructures, fullPath, '');
    } else {
      safeSetVariable(rootVar, '');
    }
  }
  
  // Match {% for item in variable %} patterns
  const forPattern = /\{\%\s*for\s+\w+\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\%\}/g;
  while ((match = forPattern.exec(template)) !== null) {
    const varName = match[1];
    
    if (isJinjaKeyword(varName)) continue;
    
    referencedVariables.add(varName);
    
    if (!(varName in variableStructures)) {
      variableStructures[varName] = [''];
    } else if (!Array.isArray(variableStructures[varName]) && typeof variableStructures[varName] !== 'object') {
      variableStructures[varName] = [''];
    }
  }
  
  // Match {% for key, value in variable.items() %} patterns
  const dictForPattern = /\{\%\s*for\s+\w+,\s*\w+\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*items\s*\(\s*\)\s*\%\}/g;
  while ((match = dictForPattern.exec(template)) !== null) {
    const varName = match[1];
    
    if (isJinjaKeyword(varName)) continue;
    
    referencedVariables.add(varName);
    
    safeSetVariable(varName, { key1: 'value1', key2: 'value2' }, true);
  }
  
  // Look for loop variables with properties
  const loopWithPropertyPattern = /\{\%\s*for\s+(\w+)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\%\}(.*?)\{\%\s*endfor\s*\%\}/gs;
  while ((match = loopWithPropertyPattern.exec(template)) !== null) {
    const loopVar = match[1];
    const arrayVar = match[2];
    const loopContent = match[3];
    
    if (isJinjaKeyword(arrayVar)) continue;
    
    referencedVariables.add(arrayVar);
    
    const loopVarPattern = new RegExp(`\\{\\{\\s*${loopVar}\\.([a-zA-Z_][a-zA-Z0-9_]*)`, 'g');
    let propMatch;
    const itemStructure = {};
    
    while ((propMatch = loopVarPattern.exec(loopContent)) !== null) {
      itemStructure[propMatch[1]] = '';
    }
    
    if (Object.keys(itemStructure).length > 0) {
      safeSetVariable(arrayVar, [itemStructure, itemStructure], true);
    }
  }
  
  // Only return variables that were actually referenced
  const finalVariableStructures = {};
  for (const [varName, structure] of Object.entries(variableStructures)) {
    if (referencedVariables.has(varName)) {
      finalVariableStructures[varName] = structure;
    }
  }
  
  return finalVariableStructures;
}

// This method is called when your extension is activated
function activate(context) {
  try {
    console.log('🚀 live-jinja-renderer extension is now ACTIVE!');
    console.log('Extension path:', context.extensionPath);
    
    // Show a notification to confirm activation
    vscode.window.showInformationMessage('✅ Live Jinja Renderer is now active!');

    // Register the command
    let disposable = vscode.commands.registerCommand('live-jinja-tester.render', function () {
      console.log('✅ Render command triggered!');
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor. Open a file to render.');
        return;
      }

    // Get the text from the active file
    const templateContent = editor.document.getText();
    const fileName = editor.document.fileName.split('/').pop();

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      'jinjaRenderer', // Internal ID
      `Render: ${fileName}`, // Title
      vscode.ViewColumn.Beside, // Open in a new tab to the side
      {
        enableScripts: true // Allow JavaScript to run in the webview
      }
    );

    // Set the webview's HTML content
    panel.webview.html = getWebviewContent();

    // Store the template content for re-rendering
    let lastTemplate = templateContent;
    
    // Update template if the original file changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.uri.toString() === editor.document.uri.toString()) {
            lastTemplate = e.document.getText();
            
            // Extract variables from the updated template
            const extractedVars = extractVariablesFromTemplate(lastTemplate);
            
            // Send updated template and extracted variables to the webview
            panel.webview.postMessage({ 
                type: 'updateTemplate',
                template: lastTemplate,
                extractedVariables: extractedVars
            });
        }
    });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'ready':
            // Extract variables from the template
            const extractedVars = extractVariablesFromTemplate(lastTemplate);
            
            // Send initial template and extracted variables when webview is ready
              panel.webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              extractedVariables: extractedVars
            });
            return;
          
          case 'reextractVariables':
            // Re-extract variables from the current template
            const reextractedVars = extractVariablesFromTemplate(lastTemplate);
            
            // Send fresh extraction (this will replace existing variables)
            panel.webview.postMessage({
              type: 'replaceVariables',
              extractedVariables: reextractedVars
            });
            return;
        }
      },
      undefined,
      context.subscriptions
    );
    
    // Clean up the subscription when the panel is closed
    panel.onDidDispose(() => {
        changeDocumentSubscription.dispose();
    }, null, context.subscriptions);
  });

  context.subscriptions.push(disposable);
  console.log('✅ Command registered successfully!');
  
  } catch (error) {
    console.error('❌ Error during extension activation:', error);
    vscode.window.showErrorMessage('Failed to activate Live Jinja Renderer: ' + error.message);
  }
}

// This function creates the HTML content for the webview
function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Jinja Renderer (Python/Pyodide)</title>
    
    <!-- Pyodide for Python Jinja2 -->
    <script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"></script>
    
    <!-- Markdown and Mermaid libraries -->
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.0/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    
    <style>
        * {
            box-sizing: border-box;
        }
        body, html {
            margin: 0; 
            padding: 0; 
            height: 100%;
            display: flex; 
            flex-direction: column;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            overflow: hidden;
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            padding: 12px;
            gap: 12px;
        }
        .header-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--vscode-editorGroup-border);
        }
        h2 {
            margin: 0;
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
        }
        .controls {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .control-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-weight: 400;
            user-select: none;
        }
        /* Toggle Switch Styling - VS Code native style */
        .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--vscode-settings-checkboxBackground);
            border: 1px solid var(--vscode-settings-checkboxBorder);
            transition: all 0.15s ease;
            border-radius: 10px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: var(--vscode-settings-checkboxForeground);
            transition: all 0.15s ease;
            border-radius: 50%;
        }
        .switch input:checked + .slider {
            background-color: var(--vscode-inputOption-activeBackground);
            border-color: var(--vscode-inputOption-activeBorder);
        }
        .switch input:checked + .slider:before {
            transform: translateX(20px);
            background-color: var(--vscode-inputOption-activeForeground);
        }
        .switch input:disabled + .slider {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .switch:hover input:not(:disabled) + .slider {
            border-color: var(--vscode-inputOption-hoverBackground);
        }
        .switch input:focus + .slider {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        textarea {
            width: 100%;
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            resize: none;
            line-height: 1.4;
        }
        textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
            border-color: var(--vscode-focusBorder);
        }
        /* Resize handle */
        .resize-handle {
            height: 8px;
            background: transparent;
            cursor: row-resize;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 2px 0;
            transition: opacity 0.2s ease;
        }
        .resize-handle::before {
            content: '';
            width: 30px;
            height: 2px;
            background: var(--vscode-sash-hoverBorder);
            border-radius: 1px;
            opacity: 0.3;
            transition: opacity 0.2s ease;
        }
        .resize-handle:hover::before {
            opacity: 0.8;
        }
        .resize-handle:active::before {
            opacity: 1;
            background: var(--vscode-focusBorder);
        }
        .variables-section {
            display: flex;
            flex-direction: column;
            min-height: 100px;
        }
        .variables-section textarea {
            flex: 1;
            height: auto;
        }
        .output-section {
            display: flex;
            flex-direction: column;
            min-height: 200px;
            flex: 1;
        }
        .output-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 2px;
            background-color: var(--vscode-editor-background);
            overflow: hidden;
        }
        #output {
            flex: 1;
            margin: 0;
            padding: 12px;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.6;
        }
        .output-footer {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            border-top: 1px solid var(--vscode-panel-border);
        }
        .footer-spacer {
            flex: 1;
        }
        .footer-btn {
            padding: 4px 10px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid transparent;
            border-radius: 2px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: background-color 0.1s ease;
            white-space: nowrap;
            font-family: var(--vscode-font-family);
        }
        .footer-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .footer-btn:active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .footer-btn:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        .footer-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .footer-btn.success {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-button-foreground);
        }
        #markdown-output {
            flex: 1;
            padding: 20px;
            overflow: auto;
            font-family: var(--vscode-font-family);
            font-size: 14px;
            line-height: 1.6;
        }
        .error {
            color: var(--vscode-errorForeground);
            border-left: 2px solid var(--vscode-inputValidation-errorBorder);
            padding: 12px;
            border-radius: 2px;
            background-color: var(--vscode-inputValidation-errorBackground);
            font-size: 12px;
        }
        /* Markdown styling */
        #markdown-output h1, #markdown-output h2, #markdown-output h3,
        #markdown-output h4, #markdown-output h5, #markdown-output h6 {
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
            line-height: 1.3;
            color: var(--vscode-editor-foreground);
        }
        #markdown-output h1 { 
            font-size: 1.8em; 
            border-bottom: 1px solid var(--vscode-editorGroup-border);
            padding-bottom: 0.3em;
        }
        #markdown-output h2 { 
            font-size: 1.4em;
            border-bottom: 1px solid var(--vscode-editorGroup-border);
            padding-bottom: 0.25em;
        }
        #markdown-output h3 { font-size: 1.2em; }
        #markdown-output h4 { font-size: 1em; }
        #markdown-output h5 { font-size: 0.9em; }
        #markdown-output h6 { font-size: 0.85em; opacity: 0.75; }
        #markdown-output p { margin: 12px 0; }
        #markdown-output ul, #markdown-output ol { 
            padding-left: 2em;
            margin: 12px 0;
        }
        #markdown-output li { margin: 4px 0; }
        #markdown-output code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            border: 1px solid var(--vscode-editorWidget-border);
        }
        #markdown-output pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 2px;
            overflow-x: auto;
            margin: 12px 0;
            border: 1px solid var(--vscode-editorWidget-border);
        }
        #markdown-output pre code {
            background-color: transparent;
            padding: 0;
            border: none;
        }
        #markdown-output blockquote {
            margin: 12px 0;
            padding: 8px 0 8px 12px;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            color: var(--vscode-textBlockQuote-foreground);
            background-color: var(--vscode-textBlockQuote-background);
            font-style: italic;
        }
        #markdown-output table {
            border-collapse: collapse;
            width: 100%;
            margin: 12px 0;
            font-size: 0.9em;
        }
        #markdown-output table th, #markdown-output table td {
            border: 1px solid var(--vscode-editorWidget-border);
            padding: 6px 10px;
            text-align: left;
        }
        #markdown-output table th {
            background-color: var(--vscode-editorWidget-background);
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        #markdown-output table tr:nth-child(even) {
            background-color: var(--vscode-list-hoverBackground);
        }
        #markdown-output a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        #markdown-output a:hover {
            text-decoration: underline;
            color: var(--vscode-textLink-activeForeground);
        }
        #markdown-output hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 24px 0;
        }
        #markdown-output strong {
            font-weight: 600;
        }
        /* Whitespace visualization */
        .whitespace-char {
            position: relative;
        }
        .whitespace-char::before {
            position: absolute;
            color: var(--vscode-editorWhitespace-foreground);
            opacity: 0.6;
            pointer-events: none;
        }
        .whitespace-char.space::before { content: '·'; }
        .whitespace-char.tab::before { content: '→'; }
        .whitespace-char.newline::before { content: '↵'; }
        /* Mermaid diagrams */
        .mermaid {
            background-color: transparent;
            text-align: center;
            margin: 16px 0;
            padding: 12px;
            border-radius: 2px;
            border: 1px solid var(--vscode-editorWidget-border);
        }
        /* Scrollbar styling - VS Code native */
        ::-webkit-scrollbar {
            width: 14px;
            height: 10px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border: 3px solid transparent;
            background-clip: padding-box;
            border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border: 3px solid transparent;
            background-clip: padding-box;
        }
        ::-webkit-scrollbar-thumb:active {
            background: var(--vscode-scrollbarSlider-activeBackground);
            border: 3px solid transparent;
            background-clip: padding-box;
        }
    </style>
</head>
<body>
    <div id="loading-indicator" style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: var(--vscode-notifications-background); color: var(--vscode-notifications-foreground); padding: 6px 12px; border: 1px solid var(--vscode-notifications-border); border-radius: 2px; z-index: 1000; font-size: 11px; display: none;">Loading...</div>
    
    <div class="container">
        <div class="variables-section" id="variables-section">
            <div class="header-group">
        <h2>Variables (JSON)</h2>
            </div>
        <textarea id="variables">{
    "name": "World"
}</textarea>
        </div>
        
        <div class="resize-handle" id="resize-handle"></div>
        
        <div class="output-section" id="output-section">
            <div class="header-group">
        <h2>Output</h2>
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
            </div>
            <div class="output-container">
        <pre id="output"></pre>
                <div id="markdown-output" style="display: none;"></div>
            </div>
            <div class="output-footer">
                <button class="footer-btn" id="reextract-variables-btn" title="Re-extract variables from template">🔄 Re-extract Variables</button>
                <div class="footer-spacer"></div>
                <button class="footer-btn" id="rerender-btn" title="Manually trigger re-render">▶️ Rerender</button>
                <button class="footer-btn" id="copy-output-btn" title="Copy output to clipboard">📋 Copy Output</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const variablesEditor = document.getElementById('variables');
        const outputDisplay = document.getElementById('output');
        const markdownOutput = document.getElementById('markdown-output');
        const markdownToggle = document.getElementById('markdown-toggle');
        const mermaidToggle = document.getElementById('mermaid-toggle');
        const showWhitespaceToggle = document.getElementById('show-whitespace-toggle');
        const cullWhitespaceToggle = document.getElementById('cull-whitespace-toggle');
        const loadingIndicator = document.getElementById('loading-indicator');
        
        let lastRenderedOutput = '';
        let isMarkdownMode = false;
        let isMermaidMode = false;
        let currentTemplate = '';
        
        // Pyodide setup
        let pyodide = null;
        let isInitialized = false;

        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                wrap: true
            }
        });
        
        // Setup Pyodide with Python Jinja2
        async function setupPyodide() {
            try {
                loadingIndicator.style.display = 'block';
                loadingIndicator.textContent = 'Loading Python environment...';
                
                pyodide = await loadPyodide();
                
                loadingIndicator.textContent = 'Loading Jinja2...';
                await pyodide.loadPackage("jinja2");
                
                isInitialized = true;
                loadingIndicator.style.display = 'none';
                
                // Notify extension that we're ready
                vscode.postMessage({ type: 'ready' });
                
                // Initial render
                update();
            } catch (error) {
                loadingIndicator.textContent = \`Failed to load Python environment: \${error.message}\`;
                loadingIndicator.style.color = 'var(--vscode-errorForeground)';
            }
        }

        // Removes extra whitespace (multiple newlines, spaces, and tabs)
        function cullWhitespace(text) {
            return text
                // Collapse lines that only contain whitespace into empty lines
                .replace(/^[ \\t]+$/gm, '')
                // Replace multiple consecutive empty lines with at most 2 newlines
                .replace(/\\n{3,}/g, '\\n\\n')
                // Replace multiple spaces with single space
                .replace(/ {2,}/g, ' ')
                // Replace multiple tabs with single tab
                .replace(/\\t{2,}/g, '\\t')
                // Clean up any remaining whitespace-only lines
                .replace(/\\n[ \\t]*\\n[ \\t]*\\n/g, '\\n\\n');
        }

        // Renders text with visible whitespace characters
        function renderWhitespace(text) {
            const escapedText = text.replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;');
            
            return escapedText
                .replace(/ /g, '<span class="whitespace-char space"> </span>')
                .replace(/\\t/g, '<span class="whitespace-char tab">\\t</span>')
                .replace(/\\n/g, '<span class="whitespace-char newline"></span>\\n');
        }

        // Renders markdown with Mermaid diagram support
        async function renderMarkdown(text) {
            lastRenderedOutput = text;
            
            // Extract mermaid code blocks before markdown parsing
            const mermaidBlocks = [];
            const mermaidPlaceholder = text.replace(/\`\`\`mermaid\\n([\\s\\S]*?)\`\`\`/g, (match, code) => {
                mermaidBlocks.push(code.trim());
                return \`<div class="mermaid-placeholder" data-index="\${mermaidBlocks.length - 1}"></div>\`;
            });
            
            // Parse markdown
            const html = marked.parse(mermaidPlaceholder);
            markdownOutput.innerHTML = html;
            
            // Replace placeholders with actual mermaid diagrams
            const placeholders = markdownOutput.querySelectorAll('.mermaid-placeholder');
            for (let i = 0; i < placeholders.length; i++) {
                const placeholder = placeholders[i];
                const index = parseInt(placeholder.getAttribute('data-index'));
                const code = mermaidBlocks[index];
                
                const mermaidDiv = document.createElement('div');
                mermaidDiv.className = 'mermaid';
                mermaidDiv.textContent = code;
                placeholder.parentNode.replaceChild(mermaidDiv, placeholder);
            }
            
            // Render all mermaid diagrams
            try {
                await mermaid.run({
                    querySelector: '#markdown-output .mermaid'
                });
            } catch (error) {
                console.error('Mermaid rendering error:', error);
            }
        }

        // Renders pure Mermaid diagram
        async function renderPureMermaid(text) {
            lastRenderedOutput = text;
            markdownOutput.innerHTML = '';
            
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = text.trim();
            markdownOutput.appendChild(mermaidDiv);
            
            try {
                await mermaid.run({
                    querySelector: '#markdown-output .mermaid'
                });
            } catch (error) {
                console.error('Mermaid rendering error:', error);
                markdownOutput.innerHTML = \`<div style="color: var(--vscode-errorForeground); padding: 20px;">
                    <strong>⚠️ Mermaid Rendering Error</strong><br><br>
                    \${error.message || 'Failed to render diagram'}<br><br>
                    <small>Please check your Mermaid syntax.</small>
                </div>\`;
            }
        }

        // Main rendering function using Python Jinja2
        async function update() {
            if (!pyodide || !isInitialized) {
                outputDisplay.textContent = 'Python environment is still loading...';
                outputDisplay.className = '';
                return;
            }

            const template = currentTemplate;
            let context;

            // Get variables from JSON
            try {
                context = JSON.parse(variablesEditor.value || '{}');
            } catch (e) {
                outputDisplay.textContent = \`Error in variables:\\n\${e.message}\`;
                outputDisplay.classList.add('error');
                outputDisplay.style.display = 'block';
                markdownOutput.style.display = 'none';
                return;
            }

            // Render the template with Python Jinja2
            try {
                const contextJson = JSON.stringify(context);
                
                // Escape template and context strings for Python
                const escapedTemplate = template.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\n/g, '\\\\n');
                const escapedContext = contextJson.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
                
                const result = pyodide.runPython(\`
import jinja2
import json

try:
    template_str = """\${escapedTemplate}"""
    context_str = """\${escapedContext}"""
    
    template = jinja2.Template(template_str)
    context = json.loads(context_str)
    result = template.render(context)
except jinja2.exceptions.TemplateError as e:
    result = f"Jinja2 Template Error: {e}"
except json.JSONDecodeError as e:
    result = f"JSON Error: {e}"
except Exception as e:
    result = f"Error: {e}"

result
                \`);
                
                // Apply whitespace culling if enabled
                let processedResult = result;
                if (cullWhitespaceToggle.checked) {
                    processedResult = cullWhitespace(result);
                }
                
                lastRenderedOutput = processedResult;
                
                // Display based on mode
                if (isMermaidMode) {
                    outputDisplay.style.display = 'none';
                    markdownOutput.style.display = 'block';
                    await renderPureMermaid(processedResult);
                } else if (isMarkdownMode) {
                    outputDisplay.style.display = 'none';
                    markdownOutput.style.display = 'block';
                    await renderMarkdown(processedResult);
                } else {
                    outputDisplay.style.display = 'block';
                    markdownOutput.style.display = 'none';
                    
                    if (showWhitespaceToggle.checked) {
                        outputDisplay.innerHTML = renderWhitespace(processedResult);
                    } else {
                        outputDisplay.textContent = processedResult;
                    }
                    outputDisplay.className = processedResult.includes('Error:') ? 'error' : '';
                }
            } catch (e) {
                outputDisplay.textContent = \`Python execution error: \${e.message}\`;
                outputDisplay.classList.add('error');
                outputDisplay.style.display = 'block';
                markdownOutput.style.display = 'none';
            }
        }

        // Debounce function to prevent too frequent updates
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        const debouncedUpdate = debounce(update, 300);

        // Listen for variable changes and auto-rerender
        variablesEditor.addEventListener('input', () => {
            debouncedUpdate();
        });

        // Toggle handlers
        markdownToggle.addEventListener('change', async function() {
            if (this.checked) {
                if (isMermaidMode) {
                    mermaidToggle.checked = false;
                    isMermaidMode = false;
                }
                isMarkdownMode = true;
                showWhitespaceToggle.disabled = true;
            } else {
                isMarkdownMode = false;
                showWhitespaceToggle.disabled = false;
            }
            await update();
        });

        mermaidToggle.addEventListener('change', async function() {
            if (this.checked) {
                if (isMarkdownMode) {
                    markdownToggle.checked = false;
                    isMarkdownMode = false;
                }
                isMermaidMode = true;
                showWhitespaceToggle.disabled = true;
            } else {
                isMermaidMode = false;
                showWhitespaceToggle.disabled = false;
            }
            await update();
        });

        showWhitespaceToggle.addEventListener('change', async function() {
            await update();
        });

        cullWhitespaceToggle.addEventListener('change', async function() {
            await update();
        });

        // Listen for messages from the extension
        window.addEventListener('message', async event => {
            const message = event.data;
            switch (message.type) {
                case 'updateTemplate':
                    // Template content updated from the extension
                    currentTemplate = message.template;
                    
                    // If extracted variables are provided, populate the variables editor
                    if (message.extractedVariables) {
                        // Try to preserve user-modified values for variables that still exist
                        let currentVars = {};
                        try {
                            currentVars = JSON.parse(variablesEditor.value || '{}');
                        } catch (e) {
                            // If parsing fails, start fresh
                            currentVars = {};
                        }
                        
                        // Only keep values for variables that still exist in the new template
                        const mergedVars = {};
                        const extractedVarNames = Object.keys(message.extractedVariables);
                        
                        for (const varName of extractedVarNames) {
                            // If the variable existed before and has a non-default value, keep it
                            if (varName in currentVars) {
                                const extractedValue = message.extractedVariables[varName];
                                const currentValue = currentVars[varName];
                                
                                // Check if user has customized the value (not the default empty structure)
                                const hasCustomValue = JSON.stringify(currentValue) !== JSON.stringify(extractedValue);
                                
                                if (hasCustomValue) {
                                    mergedVars[varName] = currentValue;
                                } else {
                                    mergedVars[varName] = extractedValue;
                                }
                            } else {
                                // New variable, use extracted structure
                                mergedVars[varName] = message.extractedVariables[varName];
                            }
                        }
                        
                        // Update the variables editor (only with variables from the current template)
                        variablesEditor.value = JSON.stringify(mergedVars, null, 4);
                    }
                    
                    await update();
                    break;
                
                case 'replaceVariables':
                    // Force replace all variables (from re-extract button)
                    if (message.extractedVariables) {
                        variablesEditor.value = JSON.stringify(message.extractedVariables, null, 4);
                        await update();
                    }
                    break;
            }
        });

        // Resize functionality
        const resizeHandle = document.getElementById('resize-handle');
        const variablesSection = document.getElementById('variables-section');
        const outputSection = document.getElementById('output-section');
        let isResizing = false;
        let startY = 0;
        let startHeightVars = 0;
        let startHeightOutput = 0;

        resizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            startY = e.clientY;
            startHeightVars = variablesSection.offsetHeight;
            startHeightOutput = outputSection.offsetHeight;
            
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            
            const deltaY = e.clientY - startY;
            const newHeightVars = startHeightVars + deltaY;
            const newHeightOutput = startHeightOutput - deltaY;
            
            // Enforce minimum heights
            if (newHeightVars >= 100 && newHeightOutput >= 200) {
                variablesSection.style.height = newHeightVars + 'px';
                outputSection.style.height = newHeightOutput + 'px';
                variablesSection.style.flex = 'none';
                outputSection.style.flex = 'none';
            }
        });

        document.addEventListener('mouseup', function() {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        // Button functionality
        const copyOutputBtn = document.getElementById('copy-output-btn');
        const rerenderBtn = document.getElementById('rerender-btn');
        const reextractVariablesBtn = document.getElementById('reextract-variables-btn');
        
        // Copy Output button
        copyOutputBtn.addEventListener('click', async function() {
            const textToCopy = isMarkdownMode || isMermaidMode 
                ? lastRenderedOutput 
                : (showWhitespaceToggle.checked ? outputDisplay.textContent : outputDisplay.textContent);
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Visual feedback
                const originalText = copyOutputBtn.textContent;
                copyOutputBtn.textContent = '✓ Copied!';
                copyOutputBtn.classList.add('success');
                
                setTimeout(() => {
                    copyOutputBtn.textContent = originalText;
                    copyOutputBtn.classList.remove('success');
                }, 1500);
            } catch (err) {
                console.error('Failed to copy:', err);
                copyOutputBtn.textContent = '❌ Failed';
                setTimeout(() => {
                    copyOutputBtn.textContent = '📋 Copy Output';
                }, 1500);
            }
        });
        
        // Rerender button
        rerenderBtn.addEventListener('click', async function() {
            const originalText = rerenderBtn.textContent;
            rerenderBtn.textContent = '⏳ Rendering...';
            rerenderBtn.disabled = true;
            
            await update();
            
            rerenderBtn.textContent = '✓ Done!';
            setTimeout(() => {
                rerenderBtn.textContent = originalText;
                rerenderBtn.disabled = false;
            }, 1000);
        });
        
        // Re-extract Variables button with confirmation
        reextractVariablesBtn.addEventListener('click', function() {
            const confirmMessage = 'Re-extract variables from template?\\n\\n⚠️ Warning: This will replace your current variables with newly extracted ones. Any custom values you\\'ve entered may be lost.\\n\\nDo you want to continue?';
            
            if (confirm(confirmMessage)) {
                // Request re-extraction from the extension
                vscode.postMessage({ 
                    type: 'reextractVariables'
                });
                
                // Visual feedback
                const originalText = reextractVariablesBtn.textContent;
                reextractVariablesBtn.textContent = '✓ Re-extracted!';
                reextractVariablesBtn.classList.add('success');
                
                setTimeout(() => {
                    reextractVariablesBtn.textContent = originalText;
                    reextractVariablesBtn.classList.remove('success');
                }, 1500);
            }
        });

        // Start Pyodide and initial render
        setupPyodide();
    </script>
</body>
</html>`;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
}