/* Live Jinja Renderer - Webview Script */

/// <reference path="./globals.d.ts" />
// @ts-check

// Global variables
const vscode = acquireVsCodeApi();
const isSidebarMode = "__IS_SIDEBAR_PLACEHOLDER__";

// DOM Elements
const variablesEditor = /** @type {HTMLTextAreaElement} */ (document.getElementById('variables'));
const outputDisplay = /** @type {HTMLDivElement} */ (document.getElementById('output'));
const markdownOutput = /** @type {HTMLDivElement} */ (document.getElementById('markdown-output'));
const loadingIndicator = /** @type {HTMLDivElement} */ (document.getElementById('loading-indicator'));
const fileNameDisplay = /** @type {HTMLSpanElement} */ (document.getElementById('file-name-text'));
const autoRerenderToggle = isSidebarMode ? /** @type {HTMLButtonElement | null} */ (document.getElementById('auto-rerender-toggle')) : null;
const fileHistoryDropdown = isSidebarMode ? /** @type {HTMLButtonElement | null} */ (document.getElementById('file-history-dropdown')) : null;
const fileHistoryMenu = isSidebarMode ? /** @type {HTMLDivElement | null} */ (document.getElementById('file-history-menu')) : null;
const extensionsIndicator = /** @type {HTMLDivElement | null} */ (document.getElementById('extensions-indicator'));
const extensionsList = /** @type {HTMLSpanElement | null} */ (document.getElementById('extensions-list'));

// File history management (sidebar only)
let fileHistory = [];
let historyEnabled = true;

// State variables
let lastRenderedOutput = '';
let isMarkdownMode = false;
let isMermaidMode = false;
let showWhitespace = true;
let cullWhitespace = false;
let autoRerender = true;
let autoExtractVariables = true;
let ghostSaveEnabled = true;
let currentTemplate = '';
let currentFileUri = '';
let currentSelectionRange = null;

// Jinja2 Extensions
let enabledExtensions = {
  i18n: false,
  do: false,
  loopcontrols: false,
  with: false,
  autoescape: false,
  debug: false
};
let customExtensions = '';

// Pyodide setup
let pyodide = null;
let isInitialized = false;

// Get controls based on mode
let markdownToggle, mermaidToggle, showWhitespaceToggle, cullWhitespaceToggle;
let copyOutputBtn, rerenderBtnPanel, reextractVariablesBtn;

if (!isSidebarMode) {
  markdownToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('markdown-toggle'));
  mermaidToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('mermaid-toggle'));
  showWhitespaceToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('show-whitespace-toggle'));
  cullWhitespaceToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('cull-whitespace-toggle'));
  copyOutputBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('copy-output-btn'));
  rerenderBtnPanel = /** @type {HTMLButtonElement | null} */ (document.getElementById('rerender-btn'));
  reextractVariablesBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('reextract-variables-btn'));
}

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

/* ===== HELPER FUNCTIONS ===== */

function showLoading(message) {
  loadingIndicator.textContent = message;
  loadingIndicator.style.display = 'block';
  loadingIndicator.style.color = 'var(--vscode-notifications-foreground)';
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
}

function cullWhitespaceText(text) {
  return text
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/\t{2,}/g, '\t')
    .replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n');
}

function renderWhitespace(text) {
  const escapedText = text.replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/"/g, '&quot;')
                          .replace(/'/g, '&#039;');
  
  return escapedText
    .replace(/ /g, '<span class="whitespace-char space"> </span>')
    .replace(/\t/g, '<span class="whitespace-char tab">\t</span>')
    .replace(/\n/g, '<span class="whitespace-char newline"></span>\n');
}

async function renderMarkdown(text) {
  lastRenderedOutput = text;
  
  const mermaidBlocks = [];
  const mermaidPlaceholder = text.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
    mermaidBlocks.push(code.trim());
    return `<div class="mermaid-placeholder" data-index="${mermaidBlocks.length - 1}"></div>`;
  });
  
  const html = marked.parse(mermaidPlaceholder);
  markdownOutput.innerHTML = html;
  
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
  
  try {
    await mermaid.run({
      querySelector: '#markdown-output .mermaid'
    });
  } catch (error) {
    console.error('Mermaid rendering error:', error);
  }
}

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
    markdownOutput.innerHTML = `<div style="color: var(--vscode-errorForeground); padding: 20px;">
      <strong>⚠️ Mermaid Rendering Error</strong><br><br>
      ${error.message || 'Failed to render diagram'}<br><br>
      <small>Please check your Mermaid syntax.</small>
    </div>`;
  }
}

function addErrorLineButtons(container) {
  const text = container.textContent || container.innerText;
  
  const lineMatches = [
    ...text.matchAll(/📍 Line (\d+)/g),
    ...text.matchAll(/line (\d+)/gi)
  ];
  
  if (lineMatches.length === 0) return;
  
  const lineNumbers = Array.from(new Set(lineMatches.map(match => parseInt(match[1]))));
  
  if (lineNumbers.length > 0) {
    const lineNumber = lineNumbers[0];
    
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
        selectionRange: currentSelectionRange
      });
    };
    
    buttonWrapper.appendChild(button);
    
    const textWrapper = document.createElement('div');
    textWrapper.textContent = text;
    textWrapper.style.whiteSpace = 'pre-wrap';
    
    container.innerHTML = '';
    container.appendChild(buttonWrapper);
    container.appendChild(textWrapper);
  }
}

function isDefaultValue(userValue, extractedValue) {
  if (JSON.stringify(userValue) === JSON.stringify(extractedValue)) {
    return true;
  }
  
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

/**
 * Update extensions indicator UI
 */
function updateExtensionsIndicator() {
  if (!extensionsIndicator || !extensionsList) return;
  
  const activeExtensions = [];
  if (enabledExtensions.i18n) activeExtensions.push('i18n');
  if (enabledExtensions.do) activeExtensions.push('do');
  if (enabledExtensions.loopcontrols) activeExtensions.push('loopcontrols');
  if (enabledExtensions.with) activeExtensions.push('with');
  if (enabledExtensions.autoescape) activeExtensions.push('autoescape');
  if (enabledExtensions.debug) activeExtensions.push('debug');
  
  if (customExtensions.trim()) {
    const customExts = customExtensions.split(',').map(ext => ext.trim()).filter(ext => ext);
    activeExtensions.push(...customExts);
  }
  
  if (activeExtensions.length > 0) {
    extensionsList.textContent = `Active: ${activeExtensions.join(', ')}`;
    extensionsIndicator.style.display = 'block';
  } else {
    extensionsIndicator.style.display = 'none';
  }
}

function updateFileNameDisplay(fileUri, selectionRange = null) {
  if (!fileUri) {
    fileNameDisplay.textContent = 'No file selected';
    return;
  }
  
  try {
    const uri = fileUri.replace(/\\/g, '/');
    const parts = uri.split('/');
    let fileName = parts[parts.length - 1] || 'Untitled';
    
    try {
      fileName = decodeURIComponent(fileName);
    } catch (decodeError) {
      console.warn('Failed to decode filename:', decodeError);
    }
    
    if (selectionRange && selectionRange.startLine !== undefined && selectionRange.endLine !== undefined) {
      fileName += ` (Lines ${selectionRange.startLine + 1}-${selectionRange.endLine + 1})`;
    }
    
    fileNameDisplay.textContent = fileName;
  } catch {
    fileNameDisplay.textContent = 'Unknown file';
  }
}

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

function updateFileHistoryUI(history, enabled = true) {
  if (!isSidebarMode || !fileHistoryMenu) return;
  
  console.log('Updating file history UI with', history?.length || 0, 'items, enabled:', enabled);
  fileHistory = history || [];
  historyEnabled = enabled;
  
  // Hide dropdown if history is disabled
  if (fileHistoryDropdown) {
    fileHistoryDropdown.style.display = historyEnabled ? 'flex' : 'none';
  }
  
  fileHistoryMenu.innerHTML = '';
  
  if (!historyEnabled) {
    // Don't populate menu if history is disabled
    return;
  }
  
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
  
  fileHistory.forEach((item) => {
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

/* ===== PYODIDE AND RENDERING ===== */

async function setupPyodide() {
  try {
    showLoading('Loading Python environment...');
    
    pyodide = await loadPyodide();
    
    showLoading('Loading Jinja2...');
    await pyodide.loadPackage("jinja2");
    
    isInitialized = true;
    
    vscode.postMessage({ type: 'ready' });
    
    showLoading('Rendering template...');
    await update();
    hideLoading();
    
    autoResizeVariablesSection();
  } catch (error) {
    loadingIndicator.textContent = `Failed to load Python environment: ${error.message}`;
    loadingIndicator.style.color = 'var(--vscode-errorForeground)';
  }
}

async function update() {
  if (!pyodide || !isInitialized) {
    outputDisplay.textContent = 'Python environment is still loading...';
    outputDisplay.className = '';
    return;
  }

  const template = currentTemplate;
  let context;

  try {
    context = JSON.parse(variablesEditor.value || '{}');
  } catch (e) {
    outputDisplay.textContent = `Error in variables:\n${e.message}`;
    outputDisplay.classList.add('error');
    outputDisplay.style.display = 'block';
    markdownOutput.style.display = 'none';
    return;
  }

  try {
    const contextJson = JSON.stringify(context);
    const escapedTemplate = template.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedContext = contextJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
    // Build extensions list
    const extensionsList = [];
    if (enabledExtensions.i18n) extensionsList.push("'jinja2.ext.i18n'");
    if (enabledExtensions.do) extensionsList.push("'jinja2.ext.do'");
    if (enabledExtensions.loopcontrols) extensionsList.push("'jinja2.ext.loopcontrols'");
    if (enabledExtensions.with) extensionsList.push("'jinja2.ext.with_'");
    if (enabledExtensions.autoescape) extensionsList.push("'jinja2.ext.autoescape'");
    if (enabledExtensions.debug) extensionsList.push("'jinja2.ext.debug'");
    
    // Add custom extensions
    if (customExtensions.trim()) {
      const customExts = customExtensions.split(',').map(ext => `'${ext.trim()}'`).filter(ext => ext !== "''");
      extensionsList.push(...customExts);
    }
    
    const extensionsStr = extensionsList.join(', ');
    
    const result = pyodide.runPython(`
import jinja2
import json
import traceback
import re

try:
    template_str = """${escapedTemplate}"""
    context_str = """${escapedContext}"""
    
    # Create environment with extensions
    extensions = [${extensionsStr}]
    try:
        env = jinja2.Environment(extensions=extensions)
    except Exception as ext_error:
        raise Exception(f"Failed to load extensions: {str(ext_error)}\\\\n\\\\nExtensions requested: {extensions}")
    
    # Create template from string
    template = env.from_string(template_str)
    context = json.loads(context_str)
    result = template.render(context)
except jinja2.exceptions.TemplateSyntaxError as e:
    error_msg = "❌ Jinja2 Syntax Error\\\\n\\\\n"
    error_msg += "📍 Line " + str(e.lineno) + ":\\\\n"
    error_msg += "  " + str(e.message) + "\\\\n"
    if hasattr(e, 'source') and e.source:
        lines = e.source.split('\\\\n')
        if 0 < e.lineno <= len(lines):
            error_msg += "\\\\n📄 Problematic line:\\\\n  >>> " + lines[e.lineno - 1].strip()
            if e.lineno > 1 and len(lines) >= e.lineno - 1:
                error_msg += "\\\\n\\\\n📋 Context:\\\\n"
                start_line = max(1, e.lineno - 2)
                end_line = min(len(lines), e.lineno + 2)
                for i in range(start_line - 1, end_line):
                    prefix = "  >>> " if i + 1 == e.lineno else "      "
                    error_msg += prefix + "Line " + str(i + 1) + ": " + lines[i].strip() + "\\\\n"
    result = error_msg
except jinja2.exceptions.UndefinedError as e:
    error_msg = "❌ Jinja2 Undefined Variable Error\\\\n\\\\n"
    line_match = re.search(r'line (\\\\d+)', str(e))
    if line_match:
        error_msg += "📍 Line " + line_match.group(1) + ":\\\\n"
    error_msg += "  " + str(e) + "\\\\n\\\\n"
    error_msg += "💡 Tip: Make sure all variables used in the template are defined in the Variables section."
    result = error_msg
except jinja2.exceptions.TemplateRuntimeError as e:
    error_msg = "❌ Jinja2 Runtime Error\\\\n\\\\n"
    if hasattr(e, 'lineno') and e.lineno:
        error_msg += "📍 Line " + str(e.lineno) + ":\\\\n"
    error_msg += "  " + str(e)
    result = error_msg
except jinja2.exceptions.TemplateAssertionError as e:
    error_msg = "❌ Jinja2 Assertion Error\\\\n\\\\n"
    line_match = re.search(r'line (\\\\d+)', str(e))
    if line_match:
        error_msg += "📍 Line " + line_match.group(1) + ":\\\\n"
    error_msg += "  " + str(e)
    result = error_msg
except jinja2.exceptions.TemplateError as e:
    error_msg = "❌ Jinja2 Template Error\\\\n\\\\n"
    line_match = re.search(r'line (\\\\d+)', str(e))
    if line_match:
        error_msg += "📍 Line " + line_match.group(1) + ":\\\\n"
    error_msg += "  " + str(e)
    result = error_msg
except json.JSONDecodeError as e:
    result = "❌ JSON Error\\\\n\\\\n📍 Line " + str(e.lineno) + ", Column " + str(e.colno) + ":\\\\n  " + e.msg + "\\\\n\\\\n💡 Tip: Check your JSON syntax in the Variables section."
except Exception as e:
    error_msg = "❌ Unexpected Error:\\\\n\\\\n"
    error_msg += str(e) + "\\\\n\\\\n"
    error_msg += "📋 Full Traceback:\\\\n" + traceback.format_exc()
    result = error_msg

result
    `);
    
    let processedResult = result;
    if (cullWhitespace) {
      processedResult = cullWhitespaceText(result);
    }
    
    lastRenderedOutput = processedResult;
    
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
      
      const isError = processedResult.includes('❌') || 
                     processedResult.includes('Error:') || 
                     processedResult.includes('Error on') ||
                     processedResult.includes('Error\n');
      
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
    outputDisplay.textContent = `Python execution error: ${e.message}`;
    outputDisplay.classList.add('error');
    outputDisplay.style.display = 'block';
    markdownOutput.style.display = 'none';
  }
}

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

/* ===== VARIABLES MANAGEMENT ===== */

function ghostSaveVariables() {
  if (!currentFileUri) return;
  
  // Check if ghost save is enabled
  if (!ghostSaveEnabled) {
    return;
  }
  
  try {
    const variables = JSON.parse(variablesEditor.value || '{}');
    vscode.postMessage({
      type: 'ghostSaveVariables',
      fileUri: currentFileUri,
      variables: variables,
      selectionRange: currentSelectionRange
    });
  } catch {
    console.log('Ghost save skipped: Invalid JSON');
  }
}

const debouncedGhostSave = debounce(ghostSaveVariables, 1000);

function autoResizeVariablesSection() {
  const text = variablesEditor.value;
  const lines = text.split('\n');
  const lineCount = lines.length;
  
  const lineHeight = 20;
  const padding = 50;
  const calculatedHeight = Math.min(
    Math.max(lineCount * lineHeight + padding, 100),
    window.innerHeight * 0.6
  );
  
  const variablesSection = document.getElementById('variables-section');
  const outputSection = document.getElementById('output-section');
  
  variablesSection.style.height = calculatedHeight + 'px';
  variablesSection.style.flex = 'none';
  
  outputSection.style.flex = '1';
  outputSection.style.height = 'auto';
}

function setupJsonEditor(textarea) {
  const pairs = {
    '{': '}',
    '[': ']',
    '"': '"',
    "'": "'"
  };
  
  const closingChars = new Set(['}', ']', '"', "'"]);
  
  textarea.addEventListener('keydown', (e) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const charBefore = value[start - 1];
    const charAfter = value[start];
    
    if (pairs[e.key] && start === end) {
      e.preventDefault();
      const closingChar = pairs[e.key];
      
      if ((e.key === '"' || e.key === "'") && charBefore === '\\') {
        textarea.setRangeText(e.key, start, end, 'end');
        return;
      }
      
      if ((e.key === '"' || e.key === "'") && charAfter === e.key) {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        return;
      }
      
      textarea.setRangeText(e.key + closingChar, start, end, 'end');
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      return;
    }
    
    if (closingChars.has(e.key) && charAfter === e.key && start === end) {
      e.preventDefault();
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      return;
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = '  ';
      
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineBeforeCursor = value.substring(lineStart, start);
        
        if (lineBeforeCursor.startsWith(indent)) {
          textarea.setRangeText('', lineStart, lineStart + indent.length, 'end');
          textarea.selectionStart = textarea.selectionEnd = start - indent.length;
        }
      } else {
        textarea.setRangeText(indent, start, end, 'end');
      }
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineBeforeCursor = value.substring(lineStart, start);
      const indentMatch = lineBeforeCursor.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      
      const needsExtraIndent = charBefore === '{' || charBefore === '[';
      const needsClosingLine = needsExtraIndent && (charAfter === '}' || charAfter === ']');
      
      if (needsClosingLine) {
        const indent = '  ';
        const newText = '\n' + currentIndent + indent + '\n' + currentIndent;
        textarea.setRangeText(newText, start, end, 'end');
        textarea.selectionStart = textarea.selectionEnd = start + currentIndent.length + indent.length + 1;
      } else if (needsExtraIndent) {
        const indent = '  ';
        const newText = '\n' + currentIndent + indent;
        textarea.setRangeText(newText, start, end, 'end');
      } else {
        const newText = '\n' + currentIndent;
        textarea.setRangeText(newText, start, end, 'end');
      }
      return;
    }
    
    if (e.key === 'Backspace' && start === end && start > 0) {
      const charBefore = value[start - 1];
      const charAfter = value[start];
      
      if (pairs[charBefore] === charAfter) {
        e.preventDefault();
        textarea.setRangeText('', start - 1, start + 1, 'end');
        return;
      }
    }
  });
}

/* ===== EVENT LISTENERS ===== */

// Setup file history dropdown (sidebar only)
if (isSidebarMode && fileHistoryDropdown && fileHistoryMenu) {
  // Initialize visibility based on history enabled setting
  fileHistoryDropdown.style.display = historyEnabled ? 'flex' : 'none';
  
  updateFileHistoryUI([], historyEnabled);
  
  fileHistoryDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = fileHistoryMenu.classList.toggle('show');
    console.log('Dropdown toggled:', isShown ? 'OPEN' : 'CLOSED');
  });
  
  document.addEventListener('click', () => {
    if (fileHistoryMenu.classList.contains('show')) {
      console.log('Closing dropdown (clicked outside)');
      fileHistoryMenu.classList.remove('show');
    }
  });
  
  fileHistoryMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Auto-rerender toggle handler (sidebar mode only)
if (isSidebarMode && autoRerenderToggle) {
  autoRerenderToggle.addEventListener('click', async () => {
    autoRerender = !autoRerender;
    updateAutoRerenderToggle();
    
    if (autoRerender) {
      await update();
    }
  });
  
  updateAutoRerenderToggle();
}

// Initialize JSON editor features
setupJsonEditor(variablesEditor);

// Listen for variable changes and auto-rerender (if enabled)
variablesEditor.addEventListener('input', () => {
  if (autoRerender) {
    debouncedUpdate();
  }
  autoResizeVariablesSection();
  debouncedGhostSave();
});

// Panel mode: Toggle switches
if (!isSidebarMode) {
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

// Save and Load Variables handlers
const saveVariablesBtn = document.getElementById('save-variables-btn');
const loadVariablesBtn = document.getElementById('load-variables-btn');
const importVariablesBtn = document.getElementById('import-variables-btn');
const exportVariablesBtn = document.getElementById('export-variables-btn');

saveVariablesBtn.addEventListener('click', () => {
  vscode.postMessage({ type: 'executeCommand', command: 'live-jinja-tester.saveVariables' });
});

loadVariablesBtn.addEventListener('click', () => {
  vscode.postMessage({ type: 'executeCommand', command: 'live-jinja-tester.loadVariables' });
});

importVariablesBtn.addEventListener('click', () => {
  // Request VS Code to show native quick pick for import options
  vscode.postMessage({ type: 'showImportQuickPick' });
});

exportVariablesBtn.addEventListener('click', () => {
  // Request VS Code to show native quick pick for export options
  try {
    const variables = JSON.parse(variablesEditor.value || '{}');
    vscode.postMessage({ 
      type: 'showExportQuickPick',
      variables: variables
    });
  } catch {
    vscode.postMessage({
      type: 'showError',
      message: 'Invalid JSON in variables'
    });
  }
});

// Panel mode: Action button listeners
if (!isSidebarMode) {
  copyOutputBtn.addEventListener('click', async function() {
    const textToCopy = isMarkdownMode || isMermaidMode 
      ? lastRenderedOutput 
      : outputDisplay.textContent;
    
    vscode.postMessage({ 
      type: 'copyToClipboard',
      text: textToCopy
    });
  });
  
  rerenderBtnPanel.addEventListener('click', async function() {
    const originalText = rerenderBtnPanel.textContent;
    rerenderBtnPanel.textContent = '⏳ Rendering...';
    rerenderBtnPanel.disabled = true;
    await update();
    rerenderBtnPanel.textContent = '✓ Done!';
    setTimeout(() => {
      rerenderBtnPanel.textContent = originalText;
      rerenderBtnPanel.disabled = false;
    }, 1000);
  });
  
  reextractVariablesBtn.addEventListener('click', function() {
    showLoading('Extracting variables...');
    vscode.postMessage({ type: 'reextractVariables' });
  });
}

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

// Listen for messages from the extension
window.addEventListener('message', async event => {
  const message = event.data;
  switch (message.type) {
    case 'updateFileHistory':
      if (isSidebarMode) {
        updateFileHistoryUI(message.history, message.historyEnabled);
      }
      break;
    
    case 'updateTemplate':
      currentTemplate = message.template;
      currentFileUri = message.fileUri || '';
      currentSelectionRange = message.selectionRange || null;
      
      updateFileNameDisplay(currentFileUri, currentSelectionRange);
      
      if (message.extractedVariables) {
        showLoading('Extracting variables...');
        
        let baseVars = {};
        
        if (message.ghostVariables && Object.keys(message.ghostVariables).length > 0) {
          baseVars = message.ghostVariables;
        } else {
          try {
            baseVars = JSON.parse(variablesEditor.value || '{}');
          } catch {
            baseVars = {};
          }
        }
        
        const mergedVars = {};
        const extractedVarNames = Object.keys(message.extractedVariables);
        
        for (const varName of extractedVarNames) {
          if (varName in baseVars) {
            const extractedValue = message.extractedVariables[varName];
            const baseValue = baseVars[varName];
            
            const hasCustomValue = !isDefaultValue(baseValue, extractedValue);
            
            if (hasCustomValue) {
              mergedVars[varName] = baseValue;
            } else {
              mergedVars[varName] = extractedValue;
            }
          } else {
            mergedVars[varName] = message.extractedVariables[varName];
          }
        }
        
        variablesEditor.value = JSON.stringify(mergedVars, null, 2);
        autoResizeVariablesSection();
        hideLoading();
      }
      
      if (autoRerender) {
        await update();
      }
      break;
    
    case 'replaceVariables':
      if (message.extractedVariables) {
        showLoading('Extracting variables...');
        
        let currentVars = {};
        try {
          currentVars = JSON.parse(variablesEditor.value || '{}');
        } catch {
          currentVars = {};
        }
        
        const mergedVars = {};
        const extractedVarNames = Object.keys(message.extractedVariables);
        
        for (const varName of extractedVarNames) {
          if (varName in currentVars) {
            const extractedValue = message.extractedVariables[varName];
            const currentValue = currentVars[varName];
            
            const hasCustomValue = !isDefaultValue(currentValue, extractedValue);
            
            if (hasCustomValue) {
              mergedVars[varName] = currentValue;
            } else {
              mergedVars[varName] = extractedValue;
            }
          } else {
            mergedVars[varName] = message.extractedVariables[varName];
          }
        }
        
        variablesEditor.value = JSON.stringify(mergedVars, null, 2);
        autoResizeVariablesSection();
        hideLoading();
        await update();
      }
      break;
    
    case 'updateSettings':
      if (message.settings) {
        isMarkdownMode = message.settings.enableMarkdown;
        isMermaidMode = message.settings.enableMermaid;
        showWhitespace = message.settings.showWhitespace;
        cullWhitespace = message.settings.cullWhitespace;
        autoRerender = message.settings.autoRerender !== undefined ? message.settings.autoRerender : true;
        autoExtractVariables = message.settings.autoExtractVariables !== undefined ? message.settings.autoExtractVariables : true;
        ghostSaveEnabled = message.settings.ghostSaveEnabled !== undefined ? message.settings.ghostSaveEnabled : true;
        historyEnabled = message.settings.historyEnabled !== undefined ? message.settings.historyEnabled : true;
        
        // Update extensions settings
        if (message.settings.extensions) {
          enabledExtensions.i18n = message.settings.extensions.i18n || false;
          enabledExtensions.do = message.settings.extensions.do || false;
          enabledExtensions.loopcontrols = message.settings.extensions.loopcontrols || false;
          enabledExtensions.with = message.settings.extensions.with || false;
          enabledExtensions.autoescape = message.settings.extensions.autoescape || false;
          enabledExtensions.debug = message.settings.extensions.debug || false;
          customExtensions = message.settings.extensions.custom || '';
          updateExtensionsIndicator();
        }
        
        if (message.settings.selectionRange !== undefined) {
          currentSelectionRange = message.settings.selectionRange;
          updateFileNameDisplay(currentFileUri, currentSelectionRange);
        }
        
        updateAutoRerenderToggle();
        updateExtensionsIndicator();
        
        // Update file history dropdown visibility based on history enabled setting
        if (isSidebarMode && fileHistoryDropdown) {
          fileHistoryDropdown.style.display = historyEnabled ? 'flex' : 'none';
        }
        
        if (!isSidebarMode) {
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
      const textToCopy = isMarkdownMode || isMermaidMode 
        ? lastRenderedOutput 
        : outputDisplay.textContent;
      
      vscode.postMessage({ 
        type: 'copyToClipboard',
        text: textToCopy
      });
      break;
    
    case 'requestVariables':
      if (message.presetName) {
        try {
          const currentVars = JSON.parse(variablesEditor.value || '{}');
          vscode.postMessage({
            type: 'saveVariables',
            presetName: message.presetName,
            variables: currentVars
          });
        } catch {
          vscode.postMessage({
            type: 'showError',
            message: 'Invalid JSON in variables'
          });
        }
      }
      break;
    
    case 'loadVariables':
      if (message.variables) {
        variablesEditor.value = JSON.stringify(message.variables, null, 2);
        autoResizeVariablesSection();
        await update();
      }
      break;
    
    case 'execCommand':
      if (message.command) {
        variablesEditor.focus();
        document.execCommand(message.command);
      }
      break;
  }
});

// Start Pyodide and initial render
setupPyodide();
