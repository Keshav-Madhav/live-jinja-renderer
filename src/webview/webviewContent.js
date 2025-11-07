// Generated from extension.js
function getWebviewContent(isSidebar = false) {
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
    
    <!-- VS Code Codicons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.35/dist/codicon.css">
    
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
            position: relative;
        }
        .header-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--vscode-editorGroup-border);
        }
        .header-actions {
            display: flex;
            gap: 4px;
            align-items: center;
        }
        .icon-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            padding: 0;
            background: transparent;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            color: var(--vscode-icon-foreground);
            opacity: 0.8;
            transition: all 0.1s ease;
            font-size: 16px;
            line-height: 1;
        }
        .icon-button:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
            opacity: 1;
        }
        .icon-button:active {
            background-color: var(--vscode-toolbar-activeBackground);
        }
        .icon-button:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .icon-button .codicon {
            font-size: 16px;
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
        .file-name-display {
            text-align: center;
            padding: 8px 12px;
            margin-bottom: 12px;
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 3px;
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-foreground);
            font-family: var(--vscode-editor-font-family);
            overflow: visible; /* Changed from hidden to visible for dropdown */
            text-overflow: ellipsis;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
        }
        .file-name-display .codicon {
            margin-right: 0;
            font-size: 14px;
            vertical-align: middle;
        }
        .file-history-dropdown {
            margin-left: auto;
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 3px;
            transition: background-color 0.1s ease;
            position: relative;
            z-index: 100;
        }
        .file-history-dropdown:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        .file-history-dropdown .codicon {
            font-size: 16px;
        }
        .file-history-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background-color: var(--vscode-menu-background);
            border: 1px solid var(--vscode-menu-border);
            border-radius: 3px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            min-width: 250px;
            max-width: 400px;
            display: none;
            overflow: hidden;
        }
        .file-history-menu.show {
            display: block;
        }
        .file-history-item {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            color: var(--vscode-menu-foreground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: left;
            transition: background-color 0.1s ease;
        }
        .file-history-item:hover {
            background-color: var(--vscode-menu-selectionBackground);
            color: var(--vscode-menu-selectionForeground);
        }
        .file-history-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
            font-weight: 600;
        }
        .file-history-item .codicon {
            margin-right: 6px;
            font-size: 14px;
        }
        .auto-rerender-toggle {
            padding: 2px 6px;
            border-radius: 3px;
            cursor: pointer;
            transition: background-color 0.1s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .auto-rerender-toggle:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        .auto-rerender-toggle.disabled {
            opacity: 0.5;
        }
        .auto-rerender-toggle .codicon {
            font-size: 14px;
        }
        .controls {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 12px;
            padding: 8px 0;
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
            tab-size: 2;
        }
        textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
            border-color: var(--vscode-focusBorder);
        }
        /* JSON editor specific styling */
        #variables {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
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
            border-left: 4px solid var(--vscode-inputValidation-errorBorder);
            padding: 16px;
            border-radius: 2px;
            background-color: var(--vscode-inputValidation-errorBackground);
            font-size: 13px;
            font-family: var(--vscode-editor-font-family);
            line-height: 1.8;
            white-space: pre-wrap;
        }
        .error-line-info {
            font-weight: 700;
            color: var(--vscode-errorForeground);
            background-color: rgba(255, 0, 0, 0.15);
            padding: 3px 8px;
            border-radius: 3px;
            display: inline-block;
            margin: 4px 0;
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        .error-line-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            margin: 8px 0;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.1s ease;
            text-decoration: none;
        }
        .error-line-link:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        .error-line-link:active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
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
        .whitespace-char.space::before { content: '\\00b7 '; }
        .whitespace-char.tab::before { content: '\\2192 '; }
        .whitespace-char.newline::before { content: '\\21b5 '; }
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
        <div class="file-name-display" id="file-name-display">
            <i class="codicon codicon-file"></i>
            <span id="file-name-text">No file selected</span>
            ${isSidebar ? `
            <div class="file-history-dropdown" id="file-history-dropdown" title="Recent files">
                <i class="codicon codicon-chevron-down"></i>
            </div>
            <div class="file-history-menu" id="file-history-menu">
                <!-- History items will be populated here -->
            </div>
            ` : ''}
        </div>
        
        <div class="variables-section" id="variables-section">
            <div class="header-group">
                <h2>Variables (JSON)</h2>
                <div class="header-actions">
                    <button class="icon-button" id="save-variables-btn" title="Save Variables Preset">
                        <i class="codicon codicon-save"></i>
                    </button>
                    <button class="icon-button" id="load-variables-btn" title="Load Variables Preset">
                        <i class="codicon codicon-folder-opened"></i>
                    </button>
                </div>
            </div>
        <textarea id="variables">{
  "name": "World"
}</textarea>
        </div>
        
        <div class="resize-handle" id="resize-handle"></div>
        
        <div class="output-section" id="output-section">
            <div class="header-group">
        <h2>Output</h2>
                ${isSidebar ? `
                <div class="header-actions">
                    <div class="auto-rerender-toggle" id="auto-rerender-toggle" title="Toggle Auto-rerender">
                        <i class="codicon codicon-debug-start"></i>
                    </div>
                </div>
                ` : ''}
            </div>
            ${isSidebar ? '' : `
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
            `}
            <div class="output-container">
        <pre id="output"></pre>
                <div id="markdown-output" style="display: none;"></div>
            </div>
            ${!isSidebar ? `
            <div class="output-footer">
                <button class="footer-btn" id="reextract-variables-btn" title="Extract variables from template">↻ Extract Variables</button>
                <div class="footer-spacer"></div>
                <button class="footer-btn" id="rerender-btn" title="Manually trigger re-render">▶ Rerender</button>
                <button class="footer-btn" id="copy-output-btn" title="Copy output to clipboard">⎘ Copy Output</button>
            </div>
            ` : ''}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const isSidebarMode = ${isSidebar};
        const variablesEditor = document.getElementById('variables');
        const outputDisplay = document.getElementById('output');
        const markdownOutput = document.getElementById('markdown-output');
        const loadingIndicator = document.getElementById('loading-indicator');
        const fileNameDisplay = document.getElementById('file-name-text');
        const autoRerenderToggle = isSidebarMode ? document.getElementById('auto-rerender-toggle') : null;
        const fileHistoryDropdown = isSidebarMode ? document.getElementById('file-history-dropdown') : null;
        const fileHistoryMenu = isSidebarMode ? document.getElementById('file-history-menu') : null;
        
        // File history management (sidebar only)
        let fileHistory = [];
        
        // Setup file history dropdown (sidebar only)
        if (isSidebarMode && fileHistoryDropdown && fileHistoryMenu) {
            // Initialize with empty state
            updateFileHistoryUI([]);
            
            // Toggle dropdown visibility
            fileHistoryDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShown = fileHistoryMenu.classList.toggle('show');
                console.log('Dropdown toggled:', isShown ? 'OPEN' : 'CLOSED');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                if (fileHistoryMenu.classList.contains('show')) {
                    console.log('Closing dropdown (clicked outside)');
                    fileHistoryMenu.classList.remove('show');
                }
            });
            
            // Prevent dropdown from closing when clicking inside menu
            fileHistoryMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Update file history dropdown UI
        function updateFileHistoryUI(history) {
            if (!isSidebarMode || !fileHistoryMenu) return;
            
            console.log('Updating file history UI with', history?.length || 0, 'items');
            fileHistory = history || [];
            fileHistoryMenu.innerHTML = '';
            
            if (fileHistory.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'file-history-item';
                emptyItem.style.opacity = '0.6';
                emptyItem.style.cursor = 'default';
                emptyItem.textContent = 'No recent files';
                fileHistoryMenu.appendChild(emptyItem);
                console.log('Added empty state item');
                return;
            }
            
            fileHistory.forEach((item, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'file-history-item' + (item.isActive ? ' active' : '');
                
                const icon = document.createElement('i');
                icon.className = item.isActive ? 'codicon codicon-check' : 'codicon codicon-file';
                
                const label = document.createElement('span');
                label.textContent = item.label;
                
                historyItem.appendChild(icon);
                historyItem.appendChild(label);
                
                historyItem.addEventListener('click', () => {
                    console.log('Switching to history item:', item.index);
                    vscode.postMessage({
                        type: 'switchToHistoryItem',
                        index: item.index
                    });
                    fileHistoryMenu.classList.remove('show');
                });
                
                fileHistoryMenu.appendChild(historyItem);
            });
            
            console.log('File history UI updated with', fileHistory.length, 'items');
        }
        
        // Function to update auto-rerender toggle button appearance
        function updateAutoRerenderToggle() {
            if (!autoRerenderToggle) return;
            
            const icon = autoRerenderToggle.querySelector('.codicon');
            if (autoRerender) {
                autoRerenderToggle.classList.remove('disabled');
                autoRerenderToggle.title = 'Auto-rerender: ON (click to disable)';
                icon.className = 'codicon codicon-debug-start';
            } else {
                autoRerenderToggle.classList.add('disabled');
                autoRerenderToggle.title = 'Auto-rerender: OFF (click to enable)';
                icon.className = 'codicon codicon-debug-pause';
            }
        }
        
        // Function to update file name display
        function updateFileNameDisplay(fileUri, selectionRange = null) {
            if (!fileUri) {
                fileNameDisplay.textContent = 'No file selected';
                return;
            }
            
            // Extract filename from URI
            try {
                const uri = fileUri.replace(/\\\\/g, '/');
                const parts = uri.split('/');
                let fileName = parts[parts.length - 1] || 'Untitled';
                
                // Decode URI component to handle encoded special characters
                try {
                    fileName = decodeURIComponent(fileName);
                } catch (decodeError) {
                    // If decoding fails, use the original filename
                    console.warn('Failed to decode filename:', decodeError);
                }
                
                // Add line range if selection is active (1-indexed for user display)
                if (selectionRange && selectionRange.startLine !== undefined && selectionRange.endLine !== undefined) {
                    fileName += \` (Lines \${selectionRange.startLine + 1}-\${selectionRange.endLine + 1})\`;
                }
                
                // Use textContent instead of innerHTML to automatically escape HTML entities
                fileNameDisplay.textContent = fileName;
            } catch (e) {
                fileNameDisplay.textContent = 'Unknown file';
            }
        }
        
        // Get controls based on mode
        let markdownToggle, mermaidToggle, showWhitespaceToggle, cullWhitespaceToggle;
        let copyOutputBtn, rerenderBtnPanel, reextractVariablesBtn;
        
        if (!isSidebarMode) {
            // Panel mode: Toggle switches and action buttons
            markdownToggle = document.getElementById('markdown-toggle');
            mermaidToggle = document.getElementById('mermaid-toggle');
            showWhitespaceToggle = document.getElementById('show-whitespace-toggle');
            cullWhitespaceToggle = document.getElementById('cull-whitespace-toggle');
            copyOutputBtn = document.getElementById('copy-output-btn');
            rerenderBtnPanel = document.getElementById('rerender-btn');
            reextractVariablesBtn = document.getElementById('reextract-variables-btn');
        }
        
        let lastRenderedOutput = '';
        let isMarkdownMode = false;
        let isMermaidMode = false;
        let showWhitespace = false;
        let cullWhitespace = true; // Default on
        let autoRerender = true; // Default on
        let currentTemplate = '';
        let currentFileUri = ''; // Track the file URI for error navigation
        let currentSelectionRange = null; // Track the selection range if rendering partial document
        
        // Helper to show loading indicator
        function showLoading(message) {
            loadingIndicator.textContent = message;
            loadingIndicator.style.display = 'block';
            loadingIndicator.style.color = 'var(--vscode-notifications-foreground)';
        }
        
        // Helper to hide loading indicator
        function hideLoading() {
            loadingIndicator.style.display = 'none';
        }
        
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
                showLoading('Loading Python environment...');
                
                pyodide = await loadPyodide();
                
                showLoading('Loading Jinja2...');
                await pyodide.loadPackage("jinja2");
                
                isInitialized = true;
                
                // Notify extension that we're ready
                vscode.postMessage({ type: 'ready' });
                
                // Initial render with loading indicator
                showLoading('Rendering template...');
                await update();
                hideLoading();
                
                // Auto-resize variables section on initial load
                autoResizeVariablesSection();
            } catch (error) {
                loadingIndicator.textContent = \`Failed to load Python environment: \${error.message}\`;
                loadingIndicator.style.color = 'var(--vscode-errorForeground)';
            }
        }

        // Removes extra whitespace (multiple newlines, spaces, and tabs)
        function cullWhitespaceText(text) {
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
                    <strong>âš ï¸ Mermaid Rendering Error</strong><br><br>
                    \${error.message || 'Failed to render diagram'}<br><br>
                    <small>Please check your Mermaid syntax.</small>
                </div>\`;
            }
        }

        // Add clickable error line buttons
        function addErrorLineButtons(container) {
            const text = container.textContent || container.innerText;
            
            // Extract line numbers from error messages
            const lineMatches = [
                ...text.matchAll(/📍 Line (\\d+)/g),
                ...text.matchAll(/line (\\d+)/gi)
            ];
            
            if (lineMatches.length === 0) return;
            
            // Get unique line numbers
            const lineNumbers = [...new Set(lineMatches.map(match => parseInt(match[1])))];
            
            // Create a button for the first line number found
            if (lineNumbers.length > 0) {
                const lineNumber = lineNumbers[0];
                
                // Create wrapper div for button
                const buttonWrapper = document.createElement('div');
                buttonWrapper.style.marginBottom = '12px';
                
                const button = document.createElement('button');
                button.className = 'error-line-link';
                button.textContent = 'View Error';
                button.onclick = () => {
                    vscode.postMessage({
                        type: 'goToLine',
                        line: lineNumber,
                        fileUri: currentFileUri,
                        selectionRange: currentSelectionRange // Pass selection range for line offset calculation
                    });
                };
                
                buttonWrapper.appendChild(button);
                
                // Create wrapper for error text
                const textWrapper = document.createElement('div');
                textWrapper.textContent = text;
                textWrapper.style.whiteSpace = 'pre-wrap';
                
                // Clear container and add button first, then error text
                container.innerHTML = '';
                container.appendChild(buttonWrapper);
                container.appendChild(textWrapper);
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
                // Note: We use triple-quoted strings in Python, so newlines are preserved as-is
                const escapedTemplate = template.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
                const escapedContext = contextJson.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
                
                const result = pyodide.runPython(\`
import jinja2
import json
import traceback
import re

try:
    template_str = """\${escapedTemplate}"""
    context_str = """\${escapedContext}"""
    
    template = jinja2.Template(template_str)
    context = json.loads(context_str)
    result = template.render(context)
except jinja2.exceptions.TemplateSyntaxError as e:
    # Template syntax error with line number
    error_msg = "❌ Jinja2 Syntax Error\\\\n\\\\n"
    error_msg += "📍 Line " + str(e.lineno) + ":\\\\n"
    error_msg += "  " + str(e.message) + "\\\\n"
    if hasattr(e, 'source') and e.source:
        # Show the problematic line if available
        lines = e.source.split('\\\\n')
        if 0 < e.lineno <= len(lines):
            error_msg += "\\\\n📄 Problematic line:\\\\n  >>> " + lines[e.lineno - 1].strip()
            # Show surrounding context if available
            if e.lineno > 1 and len(lines) >= e.lineno - 1:
                error_msg += "\\\\n\\\\n📋 Context:\\\\n"
                start_line = max(1, e.lineno - 2)
                end_line = min(len(lines), e.lineno + 2)
                for i in range(start_line - 1, end_line):
                    prefix = "  >>> " if i + 1 == e.lineno else "      "
                    error_msg += prefix + "Line " + str(i + 1) + ": " + lines[i].strip() + "\\\\n"
    result = error_msg
except jinja2.exceptions.UndefinedError as e:
    # Undefined variable error - try to extract line number
    error_msg = "❌ Jinja2 Undefined Variable Error\\\\n\\\\n"
    line_match = re.search(r'line (\\\\d+)', str(e))
    if line_match:
        error_msg += "📍 Line " + line_match.group(1) + ":\\\\n"
    error_msg += "  " + str(e) + "\\\\n\\\\n"
    error_msg += "💡 Tip: Make sure all variables used in the template are defined in the Variables section."
    result = error_msg
except jinja2.exceptions.TemplateRuntimeError as e:
    # Runtime error with line information if available
    error_msg = "❌ Jinja2 Runtime Error\\\\n\\\\n"
    if hasattr(e, 'lineno') and e.lineno:
        error_msg += "📍 Line " + str(e.lineno) + ":\\\\n"
    error_msg += "  " + str(e)
    result = error_msg
except jinja2.exceptions.TemplateAssertionError as e:
    # Assertion error with line information
    error_msg = "❌ Jinja2 Assertion Error\\\\n\\\\n"
    line_match = re.search(r'line (\\\\d+)', str(e))
    if line_match:
        error_msg += "📍 Line " + line_match.group(1) + ":\\\\n"
    error_msg += "  " + str(e)
    result = error_msg
except jinja2.exceptions.TemplateError as e:
    # Generic template error
    error_msg = "❌ Jinja2 Template Error\\\\n\\\\n"
    # Try to extract line number from error message
    line_match = re.search(r'line (\\\\d+)', str(e))
    if line_match:
        error_msg += "📍 Line " + line_match.group(1) + ":\\\\n"
    error_msg += "  " + str(e)
    result = error_msg
except json.JSONDecodeError as e:
    result = "❌ JSON Error\\\\n\\\\n📍 Line " + str(e.lineno) + ", Column " + str(e.colno) + ":\\\\n  " + e.msg + "\\\\n\\\\n💡 Tip: Check your JSON syntax in the Variables section."
except Exception as e:
    # Catch all other exceptions with full traceback
    error_msg = "❌ Unexpected Error:\\\\n\\\\n"
    error_msg += str(e) + "\\\\n\\\\n"
    error_msg += "📋 Full Traceback:\\\\n" + traceback.format_exc()
    result = error_msg

result
                \`);
                
                // Apply whitespace culling if enabled
                let processedResult = result;
                if (cullWhitespace) {
                    processedResult = cullWhitespaceText(result);
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
                    
                    // Check if it's an error message
                    const isError = processedResult.includes('❌') || 
                                   processedResult.includes('Error:') || 
                                   processedResult.includes('Error on') ||
                                   processedResult.includes('Error\\n');
                    
                    if (showWhitespace) {
                        outputDisplay.innerHTML = renderWhitespace(processedResult);
                        if (isError) {
                            outputDisplay.classList.add('error');
                            addErrorLineButtons(outputDisplay);
                        } else {
                            outputDisplay.classList.remove('error');
                        }
                    } else {
                        outputDisplay.textContent = processedResult;
                        if (isError) {
                            outputDisplay.classList.add('error');
                            addErrorLineButtons(outputDisplay);
                        } else {
                            outputDisplay.classList.remove('error');
                        }
                    }
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

        // Helper function to check if a value is the default extracted value
        function isDefaultValue(userValue, extractedValue) {
            // Simple comparison first
            if (JSON.stringify(userValue) === JSON.stringify(extractedValue)) {
                return true;
            }
            
            // Check if the user value is essentially "empty" (default structure)
            if (typeof userValue === 'string' && userValue === '') {
                return true;
            }
            if (Array.isArray(userValue) && userValue.length === 1 && userValue[0] === '') {
                return true;
            }
            if (typeof userValue === 'object' && !Array.isArray(userValue)) {
                const hasOnlyEmptyValues = Object.values(userValue).every(v => {
                    return v === '' || 
                           (Array.isArray(v) && v.length === 1 && v[0] === '') ||
                           (typeof v === 'object' && v !== null && Object.keys(v).length === 1 && Object.values(v)[0] === '');
                });
                if (hasOnlyEmptyValues) {
                    return true;
                }
            }
            
            return false;
        }

        // Ghost save variables (automatic background save)
        function ghostSaveVariables() {
            if (!currentFileUri) return;
            
            try {
                const variables = JSON.parse(variablesEditor.value || '{}');
                vscode.postMessage({
                    type: 'ghostSaveVariables',
                    fileUri: currentFileUri,
                    variables: variables,
                    selectionRange: currentSelectionRange // Include selection range for unique storage
                });
            } catch (e) {
                // Silently fail - don't interrupt user's work
                console.log('Ghost save skipped: Invalid JSON');
            }
        }

        const debouncedGhostSave = debounce(ghostSaveVariables, 1000);

        // Auto-resize variables section based on content
        function autoResizeVariablesSection() {
            const text = variablesEditor.value;
            const lines = text.split('\\n');
            const lineCount = lines.length;
            
            // Calculate height: line height * number of lines + padding
            // Using a minimum of 100px and maximum of 60vh
            const lineHeight = 20; // Approximate line height in pixels
            const padding = 50; // Top and bottom padding
            const calculatedHeight = Math.min(
                Math.max(lineCount * lineHeight + padding, 100),
                window.innerHeight * 0.6
            );
            
            // Apply the calculated height
            variablesSection.style.height = calculatedHeight + 'px';
            variablesSection.style.flex = 'none';
            
            // Let output section take remaining space
            outputSection.style.flex = '1';
            outputSection.style.height = 'auto';
        }

        // JSON Editor Enhancement: Auto-closing brackets, quotes, and smart indentation
        function setupJsonEditor(textarea) {
            const pairs = {
                '{': '}',
                '[': ']',
                '"': '"',
                "'": "'"
            };
            
            const closingChars = new Set(['}', ']', '"', "'"]);
            
            // Handle key down for smart editing features
            textarea.addEventListener('keydown', (e) => {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                const charBefore = value[start - 1];
                const charAfter = value[start];
                
                // Auto-closing brackets and quotes
                if (pairs[e.key] && start === end) {
                    e.preventDefault();
                    const closingChar = pairs[e.key];
                    
                    // Special handling for quotes - only auto-close if not after a backslash
                    if ((e.key === '"' || e.key === "'") && charBefore === '\\\\') {
                        textarea.setRangeText(e.key, start, end, 'end');
                        return;
                    }
                    
                    // For quotes, if next char is the same quote, just move cursor
                    if ((e.key === '"' || e.key === "'") && charAfter === e.key) {
                        textarea.selectionStart = textarea.selectionEnd = start + 1;
                        return;
                    }
                    
                    textarea.setRangeText(e.key + closingChar, start, end, 'end');
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                    return;
                }
                
                // Skip over closing brackets/quotes if they're already there
                if (closingChars.has(e.key) && charAfter === e.key && start === end) {
                    e.preventDefault();
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                    return;
                }
                
                // Handle Tab key for indentation
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const indent = '  '; // 2 spaces
                    
                    if (e.shiftKey) {
                        // Shift+Tab: Unindent
                        const lineStart = value.lastIndexOf('\\n', start - 1) + 1;
                        const lineBeforeCursor = value.substring(lineStart, start);
                        
                        if (lineBeforeCursor.startsWith(indent)) {
                            textarea.setRangeText('', lineStart, lineStart + indent.length, 'end');
                            textarea.selectionStart = textarea.selectionEnd = start - indent.length;
                        }
                    } else {
                        // Tab: Indent
                        textarea.setRangeText(indent, start, end, 'end');
                    }
                    return;
                }
                
                // Handle Enter key for auto-indentation
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    // Find the current line's indentation
                    const lineStart = value.lastIndexOf('\\n', start - 1) + 1;
                    const lineBeforeCursor = value.substring(lineStart, start);
                    const indentMatch = lineBeforeCursor.match(/^(\\s*)/);
                    const currentIndent = indentMatch ? indentMatch[1] : '';
                    
                    // Check if we're between opening and closing brackets
                    const needsExtraIndent = charBefore === '{' || charBefore === '[';
                    const needsClosingLine = needsExtraIndent && (charAfter === '}' || charAfter === ']');
                    
                    if (needsClosingLine) {
                        // Insert newline with extra indent, then newline with current indent
                        const indent = '  ';
                        const newText = '\\n' + currentIndent + indent + '\\n' + currentIndent;
                        textarea.setRangeText(newText, start, end, 'end');
                        textarea.selectionStart = textarea.selectionEnd = start + currentIndent.length + indent.length + 1;
                    } else if (needsExtraIndent) {
                        // Just add extra indent on new line
                        const indent = '  ';
                        const newText = '\\n' + currentIndent + indent;
                        textarea.setRangeText(newText, start, end, 'end');
                    } else {
                        // Just preserve current indentation
                        const newText = '\\n' + currentIndent;
                        textarea.setRangeText(newText, start, end, 'end');
                    }
                    return;
                }
                
                // Handle Backspace for smart deletion
                if (e.key === 'Backspace' && start === end && start > 0) {
                    const charBefore = value[start - 1];
                    const charAfter = value[start];
                    
                    // Delete matching pair if cursor is between them
                    if (pairs[charBefore] === charAfter) {
                        e.preventDefault();
                        textarea.setRangeText('', start - 1, start + 1, 'end');
                        return;
                    }
                }
            });
        }
        
        // Initialize JSON editor features
        setupJsonEditor(variablesEditor);
        
        // Listen for variable changes and auto-rerender (if enabled)
        variablesEditor.addEventListener('input', () => {
            if (autoRerender) {
                debouncedUpdate();
            }
            autoResizeVariablesSection();
            debouncedGhostSave(); // Automatically save variables in the background
        });

        // Event handlers based on mode
        if (!isSidebarMode) {
            // Panel mode: Toggle switches
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
                showWhitespace = this.checked;
                await update();
            });

            cullWhitespaceToggle.addEventListener('change', async function() {
                cullWhitespace = this.checked;
                await update();
            });
        }

        // Listen for messages from the extension
        window.addEventListener('message', async event => {
            const message = event.data;
            switch (message.type) {
                case 'updateFileHistory':
                    // Update file history dropdown (sidebar only)
                    if (isSidebarMode) {
                        updateFileHistoryUI(message.history);
                    }
                    break;
                
                case 'updateTemplate':
                    // Template content updated from the extension
                    currentTemplate = message.template;
                    currentFileUri = message.fileUri || ''; // Store the file URI
                    currentSelectionRange = message.selectionRange || null; // Store the selection range
                    
                    // Update the file name display (with line range if applicable)
                    updateFileNameDisplay(currentFileUri, currentSelectionRange);
                    
                    // Only extract/merge variables if explicitly provided (manual extraction)
                    if (message.extractedVariables) {
                        showLoading('Extracting variables...');
                        
                        // Priority: ghostVariables > currentVars > extractedVariables
                        let baseVars = {};
                        
                        // First, check if we have ghost-saved variables for this file
                        if (message.ghostVariables && Object.keys(message.ghostVariables).length > 0) {
                            baseVars = message.ghostVariables;
                        } else {
                            // Otherwise, try to use current editor values
                            try {
                                baseVars = JSON.parse(variablesEditor.value || '{}');
                            } catch (e) {
                                // If parsing fails, start fresh
                                baseVars = {};
                            }
                        }
                        
                        // Merge: Keep user values, add new extracted variables
                        const mergedVars = {};
                        const extractedVarNames = Object.keys(message.extractedVariables);
                        
                        for (const varName of extractedVarNames) {
                            // If the variable has a user-set value, keep it
                            if (varName in baseVars) {
                                const extractedValue = message.extractedVariables[varName];
                                const baseValue = baseVars[varName];
                                
                                // Check if user has customized the value (not the default empty structure)
                                const hasCustomValue = !isDefaultValue(baseValue, extractedValue);
                                
                                if (hasCustomValue) {
                                    // Keep the user's custom value
                                    mergedVars[varName] = baseValue;
                                } else {
                                    // Use the newly extracted structure
                                    mergedVars[varName] = extractedValue;
                                }
                            } else {
                                // New variable, use extracted structure
                                mergedVars[varName] = message.extractedVariables[varName];
                            }
                        }
                        
                        // Update the variables editor (only with variables from the current template)
                        variablesEditor.value = JSON.stringify(mergedVars, null, 2);
                        
                        // Auto-resize variables section after content update
                        autoResizeVariablesSection();
                        
                        hideLoading();
                    }
                    
                    // Only auto-update if autoRerender is enabled
                    if (autoRerender) {
                        await update();
                    }
                    break;
                
                case 'replaceVariables':
                    // Extract variables (from extract button)
                    // This also merges with existing values to preserve user customizations
                    if (message.extractedVariables) {
                        showLoading('Extracting variables...');
                        
                        // Get current values to preserve user customizations
                        let currentVars = {};
                        try {
                            currentVars = JSON.parse(variablesEditor.value || '{}');
                        } catch (e) {
                            currentVars = {};
                        }
                        
                        // Merge: Keep user values for existing variables, add new ones
                        const mergedVars = {};
                        const extractedVarNames = Object.keys(message.extractedVariables);
                        
                        for (const varName of extractedVarNames) {
                            if (varName in currentVars) {
                                const extractedValue = message.extractedVariables[varName];
                                const currentValue = currentVars[varName];
                                
                                // Keep user's custom value if it's not default
                                const hasCustomValue = !isDefaultValue(currentValue, extractedValue);
                                
                                if (hasCustomValue) {
                                    mergedVars[varName] = currentValue;
                                } else {
                                    mergedVars[varName] = extractedValue;
                                }
                            } else {
                                // New variable
                                mergedVars[varName] = message.extractedVariables[varName];
                            }
                        }
                        
                        variablesEditor.value = JSON.stringify(mergedVars, null, 2);
                        
                        // Auto-resize variables section after content update
                        autoResizeVariablesSection();
                        
                        hideLoading();
                        await update();
                    }
                    break;
                
                case 'updateSettings':
                    // Settings changed in VS Code configuration
                    if (message.settings) {
                        isMarkdownMode = message.settings.enableMarkdown;
                        isMermaidMode = message.settings.enableMermaid;
                        showWhitespace = message.settings.showWhitespace;
                        cullWhitespace = message.settings.cullWhitespace;
                        autoRerender = message.settings.autoRerender !== undefined ? message.settings.autoRerender : true;
                        
                        // Update selection range if provided
                        if (message.settings.selectionRange !== undefined) {
                            currentSelectionRange = message.settings.selectionRange;
                            // Update filename display with new selection range
                            updateFileNameDisplay(currentFileUri, currentSelectionRange);
                        }
                        
                        // Update the toggle button appearance (sidebar only)
                        updateAutoRerenderToggle();
                        
                        if (!isSidebarMode) {
                            // Update panel toggles (panel mode)
                            if (markdownToggle) markdownToggle.checked = isMarkdownMode;
                            if (mermaidToggle) mermaidToggle.checked = isMermaidMode;
                            if (showWhitespaceToggle) {
                                showWhitespaceToggle.checked = showWhitespace;
                                showWhitespaceToggle.disabled = isMarkdownMode || isMermaidMode;
                            }
                            if (cullWhitespaceToggle) cullWhitespaceToggle.checked = cullWhitespace;
                        }
                        
                        await update();
                    }
                    break;
                
                case 'copyOutput':
                    // Copy output triggered from command
                    const textToCopy = isMarkdownMode || isMermaidMode 
                        ? lastRenderedOutput 
                        : outputDisplay.textContent;
                    
                    // Send text to extension for clipboard copy
                    vscode.postMessage({ 
                        type: 'copyToClipboard',
                        text: textToCopy
                    });
                    break;
                
                case 'requestVariables':
                    // Extension wants to save current variables
                    // Preset name is provided by the extension
                    if (message.presetName) {
                        try {
                            const currentVars = JSON.parse(variablesEditor.value || '{}');
                            vscode.postMessage({
                                type: 'saveVariables',
                                presetName: message.presetName,
                                variables: currentVars
                            });
                        } catch (e) {
                            vscode.postMessage({
                                type: 'showError',
                                message: 'Invalid JSON in variables'
                            });
                        }
                    }
                    break;
                
                case 'loadVariables':
                    // Load variables from preset
                    if (message.variables) {
                        variablesEditor.value = JSON.stringify(message.variables, null, 2);
                        
                        // Auto-resize variables section after content update
                        autoResizeVariablesSection();
                        
                        await update();
                    }
                    break;
                
                case 'execCommand':
                    // Execute document command (cut/copy/paste) for context menu
                    if (message.command) {
                        // Focus the variables textarea first
                        variablesEditor.focus();
                        // Execute the command
                        document.execCommand(message.command);
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

        // Action handlers (panel mode only)
        const handleCopyOutput = async function() {
            const textToCopy = isMarkdownMode || isMermaidMode 
                ? lastRenderedOutput 
                : (showWhitespace ? outputDisplay.textContent : outputDisplay.textContent);
            
            // Send text to extension for clipboard copy
            vscode.postMessage({ 
                type: 'copyToClipboard',
                text: textToCopy
            });
        };
        
        const handleRerender = async function() {
            // Panel mode only
            const originalText = rerenderBtnPanel.textContent;
            rerenderBtnPanel.textContent = 'â³ Rendering...';
            rerenderBtnPanel.disabled = true;
            await update();
            rerenderBtnPanel.textContent = 'âœ“ Done!';
            setTimeout(() => {
                rerenderBtnPanel.textContent = originalText;
                rerenderBtnPanel.disabled = false;
            }, 1000);
        };
        
        const handleReextract = function() {
            // Show loading immediately
            showLoading('Extracting variables...');
            
            // Request extraction from the extension
            vscode.postMessage({ 
                type: 'reextractVariables'
            });
        };
        
        // Save and Load Variables handlers
        const saveVariablesBtn = document.getElementById('save-variables-btn');
        const loadVariablesBtn = document.getElementById('load-variables-btn');
        
        saveVariablesBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'executeCommand', command: 'live-jinja-tester.saveVariables' });
        });
        
        loadVariablesBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'executeCommand', command: 'live-jinja-tester.loadVariables' });
        });
        
        // Auto-rerender toggle handler (sidebar mode only)
        if (isSidebarMode && autoRerenderToggle) {
            autoRerenderToggle.addEventListener('click', async () => {
                autoRerender = !autoRerender;
                updateAutoRerenderToggle();
                
                // If we just enabled auto-rerender, trigger a render
                if (autoRerender) {
                    await update();
                }
            });
            
            // Initialize the toggle button appearance
            updateAutoRerenderToggle();
        }
        
        // Panel mode: Attach action button listeners
        if (!isSidebarMode) {
            copyOutputBtn.addEventListener('click', handleCopyOutput);
            rerenderBtnPanel.addEventListener('click', handleRerender);
            reextractVariablesBtn.addEventListener('click', handleReextract);
        }

        // Start Pyodide and initial render
        setupPyodide();
    </script>
</body>
</html>`;
}

module.exports = {
  getWebviewContent
};
