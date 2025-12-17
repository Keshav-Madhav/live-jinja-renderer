/* Live Jinja Renderer - Webview Script */

/// <reference path="./globals.d.ts" />
// @ts-check

// Global variables
const vscode = acquireVsCodeApi();
const isSidebarMode = "__IS_SIDEBAR_PLACEHOLDER__";
const isDetachedMode = "__IS_DETACHED_PLACEHOLDER__";

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
const statusRenderTime = /** @type {HTMLDivElement | null} */ (document.getElementById('status-render-time'));
const renderTimeStatus = /** @type {HTMLSpanElement | null} */ (document.getElementById('render-time-status'));
const renderCountEl = /** @type {HTMLSpanElement | null} */ (document.getElementById('render-count'));
const whitespaceIndicators = /** @type {HTMLDivElement | null} */ (document.getElementById('whitespace-indicators'));
const extensionSuggestions = /** @type {HTMLDivElement | null} */ (document.getElementById('extension-suggestions'));
const extensionSuggestionsList = /** @type {HTMLDivElement | null} */ (document.getElementById('extension-suggestions-list'));

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
let ghostSaveEnabled = true;
let showPerformanceMetrics = true;
let suggestExtensions = true;
let mermaidZoomSensitivity = 0.05; // Default zoom sensitivity for mermaid diagrams
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

// Jinja2 Environment Settings
let stripBlockWhitespace = true;

// Template includes/extends support
let loadedTemplates = {};
let templateSummary = { enabled: false, count: 0, paths: [], error: null };
let usedTemplates = []; // Templates actually referenced in the current template

// Last render time for UI updates
let lastRenderTime = 0;

// Render count for statistics
let renderCount = 0;

// Track order of enabled settings (most recent first)
let settingsEnableOrder = [];

// Pyodide setup
let pyodide = null;
let isInitialized = false;
let messageQueue = []; // Queue for messages received before initialization

// JSON editor (CodeMirror) state
let variablesCodeMirror = null;
let suppressCodeMirrorInputEvent = false;
const mirroredEditorClasses = [
  'json-error',
  'streaming',
  'streaming-copilot',
  'streaming-openai',
  'streaming-claude',
  'streaming-gemini'
];

function mirrorEditorClassesToCodeMirror() {
  if (!variablesCodeMirror || !variablesEditor) return;
  const wrapper = variablesCodeMirror.getWrapperElement();
  if (!wrapper) return;
  mirroredEditorClasses.forEach(cls => {
    wrapper.classList.toggle(cls, variablesEditor.classList.contains(cls));
  });
}

function initializeVariablesEditor() {
  if (!variablesEditor) return;
  if (typeof CodeMirror === 'undefined') {
    setupJsonEditor(variablesEditor);
    return;
  }

  variablesCodeMirror = CodeMirror.fromTextArea(variablesEditor, {
    mode: { name: 'javascript', json: true },
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    viewportMargin: Infinity,
    theme: 'default'
  });

  variablesCodeMirror.setSize('100%', '100%');

  variablesCodeMirror.on('change', () => {
    if (suppressCodeMirrorInputEvent) return;
    const value = variablesCodeMirror.getValue();
    variablesEditor.value = value;
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    variablesEditor.dispatchEvent(inputEvent);
  });

  // Mirror classes applied to the hidden textarea so visual states stay in sync
  const classObserver = new MutationObserver(mirrorEditorClassesToCodeMirror);
  classObserver.observe(variablesEditor, { attributes: true, attributeFilter: ['class'] });
  mirrorEditorClassesToCodeMirror();

  const nativeFocus = variablesEditor.focus.bind(variablesEditor);
  variablesEditor.focus = () => {
    if (variablesCodeMirror) {
      variablesCodeMirror.focus();
    } else {
      nativeFocus();
    }
  };
}

function getVariablesText() {
  if (variablesCodeMirror) {
    return variablesCodeMirror.getValue();
  }
  return variablesEditor ? variablesEditor.value : '';
}

function setVariablesText(value, options = {}) {
  const suppressInputEvent = options.suppressInputEvent !== undefined ? options.suppressInputEvent : true;
  const emitInputEvent = options.emitInputEvent !== undefined ? options.emitInputEvent : false;
  if (variablesCodeMirror) {
    suppressCodeMirrorInputEvent = suppressInputEvent;
    variablesCodeMirror.setValue(value);
    variablesEditor.value = value;
    suppressCodeMirrorInputEvent = false;
    variablesCodeMirror.refresh();
  } else if (variablesEditor) {
    variablesEditor.value = value;
  }

  if (emitInputEvent && variablesEditor) {
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    variablesEditor.dispatchEvent(inputEvent);
  }
}

function scrollVariablesEditorToBottom() {
  if (variablesCodeMirror) {
    const info = variablesCodeMirror.getScrollInfo();
    variablesCodeMirror.scrollTo(info.left, info.height);
  } else if (variablesEditor) {
    variablesEditor.scrollTop = variablesEditor.scrollHeight;
  }
}

// Set body class based on mode for styling
if (isSidebarMode) {
  document.body.classList.add('sidebar-mode');
} else {
  document.body.classList.add('panel-mode');
}

if (isDetachedMode) {
    document.body.classList.add('detached-mode');
}

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
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
    wrap: true,
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15
  },
  themeVariables: {
    fontSize: '14px'
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

function parseOutputWithMarkers(text) {
  const lines = text.split('\n');
  const parsedLines = [];
  let lastLineNo = null;
  let cycleIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    let lineContent = lines[i];
    let lineNo = lastLineNo;

    // Check for Cycle marker
    if (lineContent.includes('\x00C\x00')) {
      cycleIndex++;
      lineContent = lineContent.replace(/\x00C\x00/g, '');
    }

    // Check for Reset marker
    if (lineContent.includes('\x00R\x00')) {
      cycleIndex = 0;
      lineContent = lineContent.replace(/\x00R\x00/g, '');
    }

    // Extract all markers in the line
    const markerRegex = /\x00L:(\d+)\x00/g;
    let match;
    while ((match = markerRegex.exec(lineContent)) !== null) {
      lineNo = parseInt(match[1], 10);
    }

    // Remove markers from content
    const cleanContent = lineContent.replace(/\x00L:\d+\x00/g, '');

    // If this is a new line and we found a marker, update tracking
    if (lineNo !== null) {
      lastLineNo = lineNo;
    }

    parsedLines.push({
      text: cleanContent,
      lineNo: lineNo,
      cycleId: cycleIndex
    });
  }

  return parsedLines;
}

function stripMarkers(text) {
  return text.replace(/\x00L:\d+\x00/g, '').replace(/\x00C\x00/g, '').replace(/\x00R\x00/g, '');
}

function cullWhitespaceLines(parsedLines) {
  // 1. Trim individual lines (replace multiple spaces with single space, etc.)
  // And mark empty lines
  let processedLines = parsedLines.map(line => {
    let newText = line.text
      .replace(/ {2,}/g, ' ')
      .replace(/\t{2,}/g, '\t');
    
    // Check if purely whitespace
    if (/^[ \t]*$/.test(newText)) {
      newText = ''; // Mark as empty
    }
    
    return { ...line, text: newText };
  });

  // 2. Collapse multiple empty lines (max 2 newlines = 1 empty line between text)
  const result = [];
  let emptyCount = 0;

  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i];
    
    if (line.text === '') {
      emptyCount++;
      if (emptyCount <= 1) {
        result.push(line);
      }
      // Else skip
    } else {
      emptyCount = 0;
      result.push(line);
    }
  }

  return result;
}

function renderWhitespace(text) {
  const parsedLines = parseOutputWithMarkers(text);
  
  let finalLines = parsedLines;
  if (cullWhitespace) {
    finalLines = cullWhitespaceLines(parsedLines);
  }

  // Calculate line number offset if we're rendering a selection
  const lineOffset = (currentSelectionRange && currentSelectionRange.startLine !== undefined) 
    ? currentSelectionRange.startLine 
    : 0;

  // Build HTML using a row-based layout to ensure perfect alignment with wrapping
  let html = '<div class="output-rows">';
  
  // Track zebra stripe toggling based on line number changes
  let lastLineNo = null;
  let stripeToggle = false;
  
  for (let i = 0; i < finalLines.length; i++) {
    let lineContent = finalLines[i].text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/ /g, '<span class="whitespace-char space"> </span>')
      .replace(/\t/g, '<span class="whitespace-char tab">\t</span>');
      
    // If line is empty, ensure it has height
    if (lineContent === '') lineContent = '<span class="whitespace-char space"> </span>';
    
    // Apply offset to line numbers for selection rendering
    const rawLineNo = finalLines[i].lineNo;
    const adjustedLineNo = rawLineNo !== null ? rawLineNo + lineOffset : null;
    const displayLineNo = adjustedLineNo !== null ? adjustedLineNo : '&nbsp;';
    
    // Use 6 distinct cycle colors, cycle-0 is default (no loop)
    // For loops, we want to start at cycle-1, so we use ((cycleId - 1) % 6) + 1
    const cycleClass = finalLines[i].cycleId > 0 ? `cycle-${((finalLines[i].cycleId - 1) % 6) + 1}` : 'cycle-0';
    
    // Check if this is the last line in a cycle group (next line has different cycleId or is last line)
    const isLastInGroup = (i === finalLines.length - 1) || (finalLines[i].cycleId !== finalLines[i + 1].cycleId);
    const groupEndClass = isLastInGroup && finalLines[i].cycleId > 0 ? 'cycle-group-end' : '';
    
    // Zebra striping: toggle shade when line number changes
    // Same line numbers stay same shade, different line number toggles the shade
    if (adjustedLineNo !== null && adjustedLineNo !== lastLineNo) {
      stripeToggle = !stripeToggle;
      lastLineNo = adjustedLineNo;
    }
    const lineStripeClass = stripeToggle ? 'line-stripe-a' : 'line-stripe-b';
    
    // Add data-line attribute for click handling (only if lineNo is valid)
    // Use the adjusted line number for click handling
    const lineAttr = adjustedLineNo !== null ? `data-line="${adjustedLineNo}"` : '';
    
    html += `<div class="output-row ${cycleClass} ${groupEndClass} ${lineStripeClass}" ${lineAttr}>
              <div class="output-line-number">${displayLineNo}</div>
              <div class="output-line-content">${lineContent}</div>
            </div>`;
  }
  html += '</div>';
  return html;
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
    makeMermaidInteractive();
  } catch (error) {
    console.error('Mermaid rendering error:', error);
  }
}

function makeMermaidInteractive() {
  const mermaidDivs = document.querySelectorAll('#markdown-output .mermaid');
  
  mermaidDivs.forEach(mermaidDiv => {
    const svg = mermaidDiv.querySelector('svg');
    if (!svg) return;
    
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // Wrap SVG in a container if not already wrapped
    if (!mermaidDiv.classList.contains('mermaid-interactive')) {
      mermaidDiv.classList.add('mermaid-interactive');
      svg.style.cursor = 'grab';
    }
    
    // Apply transform
    function applyTransform() {
      svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      svg.style.transformOrigin = '0 0';
    }
    
    // Mouse wheel zoom
    mermaidDiv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const wheelEvent = /** @type {WheelEvent} */ (e);
      // Use configurable sensitivity (default 0.05 = 5% zoom per scroll)
      const delta = wheelEvent.deltaY > 0 ? (1 - mermaidZoomSensitivity) : (1 + mermaidZoomSensitivity);
      const newScale = scale * delta;
      
      // Limit zoom range
      if (newScale >= 0.3 && newScale <= 3) {
        const rect = svg.getBoundingClientRect();
        const offsetX = wheelEvent.clientX - rect.left;
        const offsetY = wheelEvent.clientY - rect.top;
        
        // Zoom towards mouse position
        translateX = offsetX - (offsetX - translateX) * delta;
        translateY = offsetY - (offsetY - translateY) * delta;
        scale = newScale;
        
        applyTransform();
      }
    }, { passive: false });
    
    // Mouse drag pan
    svg.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      svg.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      applyTransform();
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        svg.style.cursor = 'grab';
      }
    });
    
    // Double-click to reset
    svg.addEventListener('dblclick', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    });
    
    // Initial transform
    applyTransform();
  });
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
    makeMermaidInteractive();
  } catch (error) {
    console.error('Mermaid rendering error:', error);
    // Clear any partially rendered mermaid diagrams
    markdownOutput.querySelectorAll('.mermaid').forEach(el => el.remove());
    markdownOutput.innerHTML = `<div style="color: var(--vscode-errorForeground); padding: 20px;">
      <strong>⚠️ Mermaid Rendering Error</strong><br><br>
      ${error.message || 'Failed to render diagram'}<br><br>
      <small>Please check your Mermaid syntax.</small>
    </div>`;
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
 * Track when a setting is enabled/disabled
 * Maintains order of enabled settings (most recent first)
 */
function trackSettingChange(key, isEnabled) {
  // Remove from current position if exists
  settingsEnableOrder = settingsEnableOrder.filter(k => k !== key);
  
  // Add to front if enabled
  if (isEnabled) {
    settingsEnableOrder.unshift(key);
  }
}

/**
 * Update render time display
 * Always shows in status footer with render count and performance tips
 */
function updateRenderTimeDisplay(renderTime, incrementCount = false) {
  // Store the render time for later updates (e.g., when detach state changes)
  if (renderTime !== undefined) {
    lastRenderTime = renderTime;
  }
  
  // Increment render count when a new render completes
  if (incrementCount) {
    renderCount++;
  }
  
  // In detached mode, don't show (CSS hides status-footer anyway)
  if (isDetachedMode) return;
  
  if (!showPerformanceMetrics || lastRenderTime === 0) {
    if (statusRenderTime) statusRenderTime.style.display = 'none';
    return;
  }
  
  const timeText = `${lastRenderTime}ms`;
  
  // Determine color class and performance tips based on render time
  let colorClass = '';
  let performanceTip = 'Click to force re-render';
  
  if (lastRenderTime > 1000) {
    colorClass = 'very-slow';
    performanceTip = '⚠️ Very slow render! Tips:\n• Reduce template complexity\n• Minimize nested loops\n• Simplify variable data\n• Check for recursive includes\n\nClick to force re-render';
  } else if (lastRenderTime > 500) {
    colorClass = 'slow';
    performanceTip = '⚠️ Slow render. Tips:\n• Consider simplifying loops\n• Reduce nested conditionals\n• Check variable data size\n\nClick to force re-render';
  } else if (lastRenderTime < 50) {
    performanceTip = '✨ Fast render!\n\nClick to force re-render';
  }
  
  // Always show in status footer
  if (statusRenderTime) {
    statusRenderTime.style.display = 'flex';
    statusRenderTime.className = 'status-render-time' + (colorClass ? ' ' + colorClass : '');
    statusRenderTime.title = performanceTip;
  }
  
  if (renderTimeStatus) {
    renderTimeStatus.textContent = timeText;
  }
  
  // Update render count display
  if (renderCountEl) {
    renderCountEl.textContent = `×${renderCount}`;
  }
}

/**
 * Update settings indicators
 * Shows enabled settings in status footer
 * Ordered by most recently enabled
 * Status footer stays in main panel even when output is detached
 */
function updateWhitespaceIndicators() {
  // All possible settings with their current values
  const allSettings = {
    'Markdown': isMarkdownMode,
    'Mermaid': isMermaidMode,
    'Auto-rerender': autoRerender,
    'Show Whitespace': showWhitespace,
    'Cull Whitespace': cullWhitespace,
    'Strip Blocks': stripBlockWhitespace
  };
  
  // Build list of active settings, sorted by enable order
  const activeSettings = [];
  
  // First add settings in their enable order
  for (const key of settingsEnableOrder) {
    if (allSettings[key]) {
      activeSettings.push(key);
    }
  }
  
  // Then add any enabled settings not yet in the order list
  for (const [key, value] of Object.entries(allSettings)) {
    if (value && !activeSettings.includes(key)) {
      activeSettings.push(key);
    }
  }
  
  // Status footer is always visible in main panel (hidden only in detached window via CSS)
  if (!isDetachedMode && whitespaceIndicators) {
    if (activeSettings.length > 0) {
      const text = activeSettings.join(' · ');
      // Create clickable spans for each setting
      whitespaceIndicators.innerHTML = activeSettings.map(s => 
        `<span class="footer-toggle" data-setting="${s}" title="Click to disable ${s}">${s}</span>`
      ).join(' · ');
      whitespaceIndicators.title = text; // Tooltip on hover
      whitespaceIndicators.style.display = 'block';
    } else {
      whitespaceIndicators.style.display = 'none';
    }
  }
}

/**
 * Update extensions indicator UI
 */
function updateExtensionsIndicator() {
  if (!extensionsIndicator || !extensionsList) return;
  
  const extensionDescriptions = {
    'i18n': 'Internationalization - {% trans %} tags for translatable content',
    'do': 'Do statements - {% do ... %} for expressions without output',
    'loopcontrols': 'Loop controls - {% break %} and {% continue %} in loops',
    'with': 'With blocks - {% with %} (built-in since Jinja2 2.9, no extension needed)',
    'autoescape': 'Autoescape - Automatic HTML escaping control',
    'debug': 'Debug - {% debug %} tag to inspect template context'
  };
  
  const activeExtensions = [];
  const tooltipParts = [];
  
  if (enabledExtensions.i18n) {
    activeExtensions.push('i18n');
    tooltipParts.push(extensionDescriptions.i18n);
  }
  if (enabledExtensions.do) {
    activeExtensions.push('do');
    tooltipParts.push(extensionDescriptions.do);
  }
  if (enabledExtensions.loopcontrols) {
    activeExtensions.push('loopcontrols');
    tooltipParts.push(extensionDescriptions.loopcontrols);
  }
  if (enabledExtensions.with) {
    activeExtensions.push('with');
    tooltipParts.push(extensionDescriptions.with);
  }
  if (enabledExtensions.autoescape) {
    activeExtensions.push('autoescape');
    tooltipParts.push(extensionDescriptions.autoescape);
  }
  if (enabledExtensions.debug) {
    activeExtensions.push('debug');
    tooltipParts.push(extensionDescriptions.debug);
  }
  
  if (customExtensions.trim()) {
    const customExts = customExtensions.split(',').map(ext => ext.trim()).filter(ext => ext);
    activeExtensions.push(...customExts);
    if (customExts.length > 0) {
      tooltipParts.push('Custom: ' + customExts.join(', '));
    }
  }
  
  if (activeExtensions.length > 0) {
    extensionsList.textContent = `Active: ${activeExtensions.join(', ')}`;
    extensionsIndicator.style.display = 'block';
    extensionsIndicator.title = 'Click to configure extensions\n\n' + tooltipParts.join('\n');
  } else {
    extensionsIndicator.style.display = 'none';
  }
}

/**
 * Update template loader indicator UI
 * Template indicator is in the status footer which stays in main panel
 */
function updateTemplateIndicator() {
  const templateIndicator = document.getElementById('template-indicator');
  const templateList = document.getElementById('template-list');
  const showGraphBtn = document.getElementById('show-graph-btn');
  
  // In detached mode, we don't show the indicator (CSS hides status-footer)
  if (isDetachedMode) return;
  
  if (!templateIndicator || !templateList) return;
  
  // Ensure templateSummary has default values
  const summary = templateSummary || { enabled: false, count: 0, paths: [], error: null };
  
  // Build tooltip with ALL template names
  const allPaths = summary.paths || [];
  
  // Count used templates
  const usedCount = allPaths.filter(p => isTemplateUsed(p, usedTemplates)).length;
  
  // Show/hide graph button based on template usage
  if (showGraphBtn) {
    if (usedTemplates.length > 0) {
      showGraphBtn.style.display = 'inline-flex';
      showGraphBtn.title = 'Show Template Dependency Graph';
    } else {
      showGraphBtn.style.display = 'none';
    }
  }
  
  let tooltip = `Templates available for {% include %} and {% extends %}:\n\n`;
  
  // Show used templates first in tooltip
  const usedPaths = allPaths.filter(p => isTemplateUsed(p, usedTemplates));
  const unusedPaths = allPaths.filter(p => !isTemplateUsed(p, usedTemplates));
  
  if (usedPaths.length > 0) {
    tooltip += `Used (${usedPaths.length}):\n`;
    tooltip += usedPaths.map(p => `  ✓ ${p}`).join('\n');
    tooltip += '\n\n';
  }
  
  if (unusedPaths.length > 0) {
    tooltip += `Available (${unusedPaths.length}):\n`;
    tooltip += unusedPaths.map(p => `  • ${p}`).join('\n');
  }
  
  if (summary.searchDirs && summary.searchDirs.length > 0) {
    tooltip += `\n\nSearch directories:\n`;
    tooltip += summary.searchDirs.map(d => `• ${d}`).join('\n');
  }
  tooltip += '\n\nClick to expand/collapse';
  
  // Show used/total count in the indicator
  let contentHtml;
  if (summary.error) {
    contentHtml = `<i class="codicon codicon-warning" style="color: var(--vscode-inputValidation-warningBorder);"></i> Error: ${summary.error}`;
  } else if (usedCount > 0) {
    contentHtml = `<i class="codicon codicon-file-symlink-directory" style="margin-right: 4px;"></i> <span style="color: var(--vscode-testing-iconPassed, #73c991);">${usedCount} used</span> / ${summary.count} template${summary.count !== 1 ? 's' : ''}`;
  } else {
    contentHtml = `<i class="codicon codicon-file-symlink-directory" style="margin-right: 4px;"></i> ${summary.count} template${summary.count !== 1 ? 's' : ''} loaded`;
  }
  
  const errorTooltip = summary.error ? `Template loading error: ${summary.error}` : tooltip;
  
  if (summary.error) {
    templateList.innerHTML = contentHtml;
    templateIndicator.style.display = 'flex';
    templateIndicator.classList.add('error');
    templateIndicator.title = errorTooltip;
  } else if (summary.enabled && summary.count > 0) {
    templateList.innerHTML = contentHtml;
    templateIndicator.style.display = 'flex';
    templateIndicator.classList.remove('error');
    templateIndicator.title = tooltip;
  } else {
    templateIndicator.style.display = 'none';
  }
}

/**
 * Detect which extensions might be needed based on template syntax
 */
function detectSuggestedExtensions(template) {
  const suggestions = [];
  
  // Check for i18n extension patterns
  if (/\{%\s*trans\s*%\}|\{%\s*endtrans\s*%\}|\{%\s*pluralize\s*%\}/i.test(template)) {
    if (!enabledExtensions.i18n) {
      suggestions.push({
        key: 'i18n',
        name: 'i18n',
        description: 'Internationalization - {% trans %} tags detected',
        icon: 'globe'
      });
    }
  }
  
  // Check for do extension patterns
  if (/\{%\s*do\s+/i.test(template)) {
    if (!enabledExtensions.do) {
      suggestions.push({
        key: 'do',
        name: 'do',
        description: 'Do statements - {% do %} tag detected',
        icon: 'play'
      });
    }
  }
  
  // Check for loop controls extension patterns
  if (/\{%\s*break\s*%\}|\{%\s*continue\s*%\}/i.test(template)) {
    if (!enabledExtensions.loopcontrols) {
      suggestions.push({
        key: 'loopcontrols',
        name: 'loopcontrols',
        description: 'Loop controls - {% break %} or {% continue %} detected',
        icon: 'debug-step-over'
      });
    }
  }
  
  // Note: 'with' is built-in since Jinja2 2.9+, no extension suggestion needed
  
  // Check for autoescape extension patterns
  if (/\{%\s*autoescape\s+|\{%\s*endautoescape\s*%\}/i.test(template)) {
    if (!enabledExtensions.autoescape) {
      suggestions.push({
        key: 'autoescape',
        name: 'autoescape',
        description: 'Autoescape - {% autoescape %} tag detected',
        icon: 'shield'
      });
    }
  }
  
  // Check for debug extension patterns
  if (/\{%\s*debug\s*%\}/i.test(template)) {
    if (!enabledExtensions.debug) {
      suggestions.push({
        key: 'debug',
        name: 'debug',
        description: 'Debug - {% debug %} tag detected',
        icon: 'bug'
      });
    }
  }
  
  return suggestions;
}

/**
 * Check if template uses include/extends and suggest loading templates
 */
function detectIncludeExtendsUsage(template) {
  const hasInclude = /\{%\s*include\s+['"][^'"]+['"]/i.test(template);
  const hasExtends = /\{%\s*extends\s+['"][^'"]+['"]/i.test(template);
  const hasBlock = /\{%\s*block\s+\w+/i.test(template);
  const hasImport = /\{%\s*(import|from)\s+['"][^'"]+['"]/i.test(template);
  
  return {
    usesIncludes: hasInclude || hasExtends || hasImport,
    hasInclude,
    hasExtends,
    hasBlock,
    hasImport
  };
}

/**
 * Normalize a template path by removing ./ and ../ prefixes and normalizing separators
 * @param {string} path - The path to normalize
 * @returns {string} Normalized path
 */
function normalizeTemplatePath(path) {
  if (!path) return '';
  
  return path
    .replace(/\\/g, '/')           // Normalize separators
    .replace(/^\.\//, '')          // Remove leading ./
    .replace(/\/\.\//g, '/')       // Remove /./ in middle
    .replace(/^\.\.\//, '')        // Remove leading ../
    .replace(/\/\.\.\/[^/]+\//g, '/'); // Simplify /../dir/ patterns
}

/**
 * Check if a template path matches any of the used template references
 * @param {string} templatePath - The full template path from the loaded templates
 * @param {string[]} usedRefs - Array of template references from the current template
 * @returns {boolean} True if this template is being used
 */
function isTemplateUsed(templatePath, usedRefs) {
  if (!usedRefs || usedRefs.length === 0) return false;
  
  // Normalize the template path
  const normalizedPath = normalizeTemplatePath(templatePath);
  const fileName = normalizedPath.split('/').pop();
  
  for (const ref of usedRefs) {
    const normalizedRef = normalizeTemplatePath(ref);
    const refFileName = normalizedRef.split('/').pop();
    
    // Check for exact match
    if (normalizedPath === normalizedRef) {
      return true;
    }
    
    // Check if path ends with the reference (handles relative paths)
    if (normalizedPath.endsWith('/' + normalizedRef)) {
      return true;
    }
    
    // Check if reference ends with the path (handles when ref is more specific)
    if (normalizedRef.endsWith('/' + normalizedPath)) {
      return true;
    }
    
    // Check filename match (handles simple includes like "header.html")
    if (fileName === refFileName) {
      return true;
    }
  }
  
  return false;
}

/**
 * Update the extension suggestions UI
 */
function updateExtensionSuggestions() {
  if (!extensionSuggestions || !extensionSuggestionsList) {
    console.warn('Extension suggestions DOM elements not found');
    return;
  }
  
  const suggestions = detectSuggestedExtensions(currentTemplate);
  
  if (suggestions.length === 0) {
    extensionSuggestions.style.display = 'none';
    return;
  }
  
  extensionSuggestions.style.display = 'block';
  extensionSuggestionsList.innerHTML = '';
  
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.className = 'extension-suggestion-btn';
    button.style.cssText = `
      padding: 4px 10px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.1s;
    `;
    button.title = suggestion.description;
    button.innerHTML = `<i class="codicon codicon-${suggestion.icon}"></i> Enable ${suggestion.name}`;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--vscode-button-secondaryHoverBackground)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--vscode-button-secondaryBackground)';
    });
    
    button.addEventListener('click', () => {
      // Enable the extension via VS Code settings
      vscode.postMessage({
        type: 'enableExtension',
        extension: suggestion.key
      });
    });
    
    extensionSuggestionsList.appendChild(button);
  });
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
      vscode.postMessage({
        type: 'switchToHistoryItem',
        index: item.index
      });
      fileHistoryMenu.classList.remove('show');
    });
    
    fileHistoryMenu.appendChild(historyItem);
  });
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
    
    // Process any queued messages
    while (messageQueue.length > 0) {
      const queuedMessage = messageQueue.shift();
      handleMessage(queuedMessage);
    }
    
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

  // In detached mode, variablesEditor might be hidden but still exists
  try {
    context = JSON.parse(getVariablesText() || '{}');
  } catch (e) {
    if (!isDetachedMode) {
      outputDisplay.textContent = `Error in variables:\n${e.message}`;
      outputDisplay.classList.add('error');
      outputDisplay.style.display = 'block';
      markdownOutput.style.display = 'none';
    }
    return;
  }

  try {
    const contextJson = JSON.stringify(context);
    const escapedTemplate = template.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedContext = contextJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
    // Start performance tracking
    const startTime = performance.now();
    
    // Build extensions list
    const extensionsList = [];
    if (enabledExtensions.i18n) extensionsList.push("'jinja2.ext.i18n'");
    if (enabledExtensions.do) extensionsList.push("'jinja2.ext.do'");
    if (enabledExtensions.loopcontrols) extensionsList.push("'jinja2.ext.loopcontrols'");
    // Note: 'with' is built-in since Jinja2 2.9+, no extension needed
    if (enabledExtensions.autoescape) extensionsList.push("'jinja2.ext.autoescape'");
    if (enabledExtensions.debug) extensionsList.push("'jinja2.ext.debug'");
    
    // Add custom extensions
    if (customExtensions.trim()) {
      const customExts = customExtensions.split(',').map(ext => `'${ext.trim()}'`).filter(ext => ext !== "''");
      extensionsList.push(...customExts);
    }
    
    const extensionsStr = extensionsList.join(', ');
    const stripBlockWhitespaceStr = stripBlockWhitespace ? 'True' : 'False';
    
    // Prepare templates for DictLoader (escape for Python string)
    // Use base64 encoding to avoid escaping issues with special characters
    const templatesJsonRaw = JSON.stringify(loadedTemplates);
    const templatesBase64 = btoa(unescape(encodeURIComponent(templatesJsonRaw)));
    const hasTemplates = Object.keys(loadedTemplates).length > 0;
    
    const result = pyodide.runPython(`
import jinja2
import json
import traceback
import re

# Custom AST Node Visitor to inject line number markers
class LineNumberInjector:
    def __init__(self):
        self.parent_map = {}
        
    def build_parent_map(self, node, parent=None):
        """Build a map of child -> parent relationships"""
        self.parent_map[id(node)] = parent
        for field, value in node.iter_fields():
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, jinja2.nodes.Node):
                        self.build_parent_map(item, node)
            elif isinstance(value, jinja2.nodes.Node):
                self.build_parent_map(value, node)
    
    def visit(self, node):
        # Check for specific node types to handle
        if isinstance(node, jinja2.nodes.For):
            self.visit_For(node)
            
        self.generic_visit(node)

    def visit_For(self, node):
        # Inject a special marker at start of loop body to track iterations
        if hasattr(node, 'body') and isinstance(node.body, list):
            marker = jinja2.nodes.TemplateData("\\x00C\\x00", lineno=node.lineno)
            marker_node = jinja2.nodes.Output([marker], lineno=node.lineno)
            node.body.insert(0, marker_node)
        
        # Find parent and insert reset marker after this For node
        parent = self.parent_map.get(id(node))
        if parent:
            # Try to find this node in parent's body or nodes list
            for field_name in ['body', 'nodes']:
                if hasattr(parent, field_name):
                    node_list = getattr(parent, field_name)
                    if isinstance(node_list, list) and node in node_list:
                        idx = node_list.index(node)
                        reset_marker = jinja2.nodes.TemplateData("\\x00R\\x00", lineno=node.lineno)
                        reset_marker_node = jinja2.nodes.Output([reset_marker], lineno=node.lineno)
                        node_list.insert(idx + 1, reset_marker_node)
                        break

    def generic_visit(self, node):
        # Process all list fields that might contain nodes
        for field, value in node.iter_fields():
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, jinja2.nodes.Node):
                        self.visit(item)
            elif isinstance(value, jinja2.nodes.Node):
                self.visit(value)
                
        # Special handling for Output nodes to inject markers
        if isinstance(node, jinja2.nodes.Output):
            new_nodes = []
            for child in node.nodes:
                # Handle TemplateData (static text)
                if isinstance(child, jinja2.nodes.TemplateData):
                    # Split by newline to handle multi-line static text
                    # We need to be careful to preserve exact content while injecting markers
                    lines = child.data.split('\\n')
                    start_line = child.lineno
                    
                    for i, line in enumerate(lines):
                        # Calculate current line number (approximate for multi-line strings)
                        current_lineno = start_line + i
                        
                        # Add marker for this line
                        marker = f"\\x00L:{current_lineno}\\x00"
                        new_nodes.append(jinja2.nodes.TemplateData(marker, lineno=current_lineno))
                        
                        # Add the text content
                        new_nodes.append(jinja2.nodes.TemplateData(line, lineno=current_lineno))
                        
                        # Add newline if it's not the last part
                        if i < len(lines) - 1:
                            new_nodes.append(jinja2.nodes.TemplateData('\\n', lineno=current_lineno))
                            
                # Handle other nodes (Variables, Expressions)
                else:
                    # Add marker before the node if it has a line number
                    if hasattr(child, 'lineno'):
                        marker = f"\\x00L:{child.lineno}\\x00"
                        new_nodes.append(jinja2.nodes.TemplateData(marker, lineno=child.lineno))
                    new_nodes.append(child)
            
            # Replace the nodes list
            node.nodes = new_nodes

try:
    template_str = """${escapedTemplate}"""
    context_str = """${escapedContext}"""
    templates_base64 = "${templatesBase64}"
    has_templates = ${hasTemplates ? 'True' : 'False'}
    
    # Environment options (stripBlockWhitespace enables both trim_blocks and lstrip_blocks)
    strip_block_whitespace = ${stripBlockWhitespaceStr}
    
    # Parse loaded templates for DictLoader (decode from base64)
    loaded_templates = {}
    if has_templates and templates_base64:
        try:
            import base64
            templates_json_bytes = base64.b64decode(templates_base64)
            templates_json_str = templates_json_bytes.decode('utf-8')
            loaded_templates = json.loads(templates_json_str)
        except Exception as te:
            pass  # Ignore template parsing errors, will render without includes
    
    # Create environment with extensions
    extensions = [${extensionsStr}]
    try:
        # Validate and load custom extensions
        validated_extensions = []
        for ext in extensions:
            if ext.startswith('jinja2.ext.'):
                # Built-in Jinja2 extension
                validated_extensions.append(ext)
            else:
                # Custom extension - attempt to import
                try:
                    parts = ext.rsplit('.', 1)
                    if len(parts) == 2:
                        module_name, class_name = parts
                        # Try to import the module
                        exec(f"from {module_name} import {class_name}")
                        validated_extensions.append(ext)
                    else:
                        raise ValueError(f"Invalid extension format: {ext}")
                except ImportError as ie:
                    raise ImportError(f"Cannot import custom extension '{ext}': {str(ie)}\\\\n\\\\nMake sure the module is available in the Python environment.")
                except Exception as ce:
                    raise Exception(f"Error loading custom extension '{ext}': {str(ce)}")
        
        # Create loader - use DictLoader if we have templates for includes/extends
        loader = None
        if loaded_templates:
            loader = jinja2.DictLoader(loaded_templates)
        
        # Create environment with validated extensions, options, and loader
        env = jinja2.Environment(
            loader=loader,
            extensions=validated_extensions,
            trim_blocks=strip_block_whitespace,
            lstrip_blocks=strip_block_whitespace
        )
        
        # Install translation functions for i18n extension
        if 'jinja2.ext.i18n' in validated_extensions:
            def simple_gettext(message):
                return message
            def simple_ngettext(singular, plural, n):
                return singular if n == 1 else plural
            
            env.install_gettext_callables(simple_gettext, simple_ngettext, newstyle=True)
        
        # Configure policies for better error messages
        env.policies['ext.i18n.trimmed'] = True
    except Exception as ext_error:
        raise Exception(f"Failed to load extensions: {str(ext_error)}\\\\n\\\\nExtensions requested: {extensions}")
    
    # Parse AST first
    parsed_content = env.parse(template_str)
    
    # Inject line number markers
    injector = LineNumberInjector()
    injector.build_parent_map(parsed_content)
    injector.visit(parsed_content)
    
    # Compile and render
    code = env.compile(parsed_content, filename="<template>")
    template = jinja2.Template.from_code(env, code, env.globals, None)
    
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
except jinja2.exceptions.TemplatesNotFound as e:
    error_msg = "❌ Jinja2 Template Not Found Error\\\\n\\\\n"
    error_msg += "The following template(s) could not be found:\\\\n"
    for name in e.names:
        error_msg += f"  • {name}\\\\n"
    error_msg += "\\\\n💡 Tips:\\\\n"
    error_msg += "  • Make sure the template file exists in your workspace\\\\n"
    error_msg += "  • Configure search paths in Settings → Live Jinja Renderer → Templates\\\\n"
    error_msg += "  • Check the template indicator below the output for loaded templates\\\\n"
    if not loaded_templates:
        error_msg += "  • No templates are currently loaded for includes\\\\n"
    else:
        error_msg += f"  • {len(loaded_templates)} templates currently loaded\\\\n"
    result = error_msg
except jinja2.exceptions.TemplateNotFound as e:
    error_msg = "❌ Jinja2 Template Not Found Error\\\\n\\\\n"
    error_msg += f"Template '{e.name}' could not be found.\\\\n\\\\n"
    error_msg += "💡 Tips:\\\\n"
    error_msg += "  • Make sure the template file exists in your workspace\\\\n"
    error_msg += "  • Configure search paths in Settings → Live Jinja Renderer → Templates\\\\n"
    error_msg += "  • Check the template indicator below the output for loaded templates\\\\n"
    if not loaded_templates:
        error_msg += "  • No templates are currently loaded for includes\\\\n"
    else:
        error_msg += f"  • {len(loaded_templates)} templates currently loaded\\\\n"
        # Show available templates that might be similar
        similar = [t for t in loaded_templates.keys() if e.name.lower() in t.lower() or t.lower() in e.name.lower()]
        if similar:
            error_msg += f"  • Did you mean: {', '.join(similar[:3])}?\\\\n"
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
    
    // End performance tracking
    const endTime = performance.now();
    const renderTime = Math.round(endTime - startTime);
    
    // Update render time (increment count) and whitespace indicators
    updateRenderTimeDisplay(renderTime, true);
    updateWhitespaceIndicators();
    
    // Update extension suggestions based on template syntax
    if (suggestExtensions) {
      updateExtensionSuggestions();
    } else if (extensionSuggestions) {
      extensionSuggestions.style.display = 'none';
    }
    
    let processedResult = result;
    // If cullWhitespace is on, we handle it inside renderWhitespace for normal mode
    // But for markdown/mermaid, we need to strip markers and maybe cull?
    
    if (isMermaidMode || isMarkdownMode) {
        // Strip markers first
        processedResult = stripMarkers(result);
        if (cullWhitespace) {
            // Use the old text-based culling for markdown/mermaid
             processedResult = processedResult
                .replace(/^[ \t]+$/gm, '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/ {2,}/g, ' ')
                .replace(/\t{2,}/g, '\t')
                .replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n');
        }
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
      
      // Clean result for error checking
      const cleanResult = stripMarkers(result);
      const isError = cleanResult.includes('❌') || 
                     cleanResult.includes('Error:') || 
                     cleanResult.includes('Error on') ||
                     cleanResult.includes('Error\n');
      
      // Update AI Debug button visibility based on error state
      updateAiDebugButton(isError, cleanResult);
      
      if (showWhitespace) {
        // renderWhitespace now handles parsing markers and culling
        outputDisplay.innerHTML = renderWhitespace(result);
        if (isError) {
          outputDisplay.classList.add('error');
        } else {
          outputDisplay.classList.remove('error');
        }
      } else {
        // For no-whitespace mode, we still use renderWhitespace but maybe CSS hides symbols?
        // Actually, existing logic used textContent.
        // We should probably use renderWhitespace but hide the whitespace symbols via CSS or class?
        // But the request is "show line numbers" which is part of renderWhitespace.
        // The "Show Whitespace" toggle usually toggles the visible dots/arrows.
        // So we should use renderWhitespace for both cases, but toggle a class on the container.
        
        // Wait, previous implementation:
        /*
        if (showWhitespace) {
            outputDisplay.innerHTML = renderWhitespace(processedResult);
        } else {
            outputDisplay.textContent = processedResult;
        }
        */
        // The user wants line numbers in "default renderer".
        // So we should use the HTML structure with gutter even if showWhitespace is false.
        // We just won't replace spaces with spans?
        
        // Let's modify renderWhitespace to take a flag? Or just update styles?
        // The current renderWhitespace replaces spaces with spans.
        // I'll use renderWhitespace for both, but passing a flag or relying on CSS.
        // But renderWhitespace is hardcoded to inject spans.
        
        // I'll reuse renderWhitespace but if showWhitespace is false, I won't replace spaces with visible spans.
        // Actually I can just let it render with spans, and CSS can hide the background/color of spans.
        // But simpler to just use the same structure.
        
        outputDisplay.innerHTML = renderWhitespace(result);
        
        if (!showWhitespace) {
             // Remove the visible whitespace styling
             const spaces = outputDisplay.querySelectorAll('.whitespace-char');
             spaces.forEach(s => {
                 s.classList.remove('whitespace-char');
                 if (s.classList.contains('space')) s.innerHTML = ' ';
                 if (s.classList.contains('tab')) s.innerHTML = '\t';
             });
        }
        
        if (isError) {
          outputDisplay.classList.add('error');
        } else {
          outputDisplay.classList.remove('error');
        }
      }
    }
  } catch (e) {
    const errorMsg = `Python execution error: ${e.message}\n\nThis usually means:\n` +
                   `• Invalid Jinja2 syntax in your template\n` +
                   `• Unsupported Python operations\n` +
                   `• Extension compatibility issues`;
    outputDisplay.textContent = errorMsg;
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
    const variables = JSON.parse(getVariablesText() || '{}');
    vscode.postMessage({
      type: 'ghostSaveVariables',
      fileUri: currentFileUri,
      variables: variables,
      selectionRange: currentSelectionRange
    });
  } catch {
    // Silent fail - invalid JSON, nothing to save
  }
}

const debouncedGhostSave = debounce(ghostSaveVariables, 300);

function autoResizeVariablesSection() {
  if (!variablesEditor) {
    console.warn('Variables editor not found for resize');
    return;
  }
  
  const text = getVariablesText();
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
  
  if (!variablesSection || !outputSection) {
    console.warn('Cannot auto-resize: required DOM elements not found');
    return;
  }
  
  variablesSection.style.height = calculatedHeight + 'px';
  variablesSection.style.flex = 'none';
  
  outputSection.style.flex = '1';
  outputSection.style.height = 'auto';

  if (variablesCodeMirror) {
    variablesCodeMirror.refresh();
  }
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
    fileHistoryMenu.classList.toggle('show');
  });
  
  document.addEventListener('click', () => {
    if (fileHistoryMenu.classList.contains('show')) {
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
    trackSettingChange('Auto-rerender', autoRerender);
    updateAutoRerenderToggle();
    updateWhitespaceIndicators();
    
    if (autoRerender) {
      await update();
    }
  });
  
  updateAutoRerenderToggle();
}

// Initialize JSON editor features (CodeMirror with fallback)
initializeVariablesEditor();

// JSON error indicator elements
const jsonErrorIndicator = document.getElementById('json-error-indicator');
const jsonErrorMessage = document.getElementById('json-error-message');

/**
 * Validate JSON and update error indicator
 * Shows inline error with line/column info when JSON is invalid
 */
function validateJsonAndShowError() {
  const value = getVariablesText().trim();
  
  // Empty is valid (will default to {})
  if (!value) {
    variablesEditor.classList.remove('json-error');
    if (jsonErrorIndicator) jsonErrorIndicator.classList.remove('visible');
    return true;
  }
  
  try {
    JSON.parse(value);
    variablesEditor.classList.remove('json-error');
    if (jsonErrorIndicator) jsonErrorIndicator.classList.remove('visible');
    return true;
  } catch (e) {
    variablesEditor.classList.add('json-error');
    if (jsonErrorIndicator && jsonErrorMessage) {
      // Extract useful part of error message
      let errorMsg = e.message;
      const posMatch = errorMsg.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const lines = value.substring(0, pos).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        errorMsg = `Line ${line}, Col ${col}: ${errorMsg.split(' at ')[0]}`;
      }
      jsonErrorMessage.textContent = errorMsg;
      jsonErrorIndicator.classList.add('visible');
    }
    return false;
  }
}

// Listen for variable changes and auto-rerender (if enabled)
variablesEditor.addEventListener('input', () => {
  validateJsonAndShowError();
  if (autoRerender) {
    debouncedUpdate();
  }
  autoResizeVariablesSection();
  debouncedGhostSave();
});

// Add click handlers for output line navigation
// Use event delegation on the output display
outputDisplay.addEventListener('click', (e) => {
  // Find the closest output-row
  const row = e.target.closest('.output-row');
  if (!row) return;
  
  const lineNumber = row.getAttribute('data-line');
  if (!lineNumber || lineNumber === '') return;
  
  const line = parseInt(lineNumber, 10);
  if (isNaN(line)) return;
  
  // Check if click was on line number area or line content
  const isLineNumberClick = e.target.closest('.output-line-number') !== null;
  
  vscode.postMessage({
    type: 'goToLine',
    line: line,
    fileUri: currentFileUri,
    selectionRange: currentSelectionRange,
    selectWholeLine: isLineNumberClick
  });
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

// Save and Load Variables handlers (consolidated with export/import)
const saveVariablesBtn = document.getElementById('save-variables-btn');
const loadVariablesBtn = document.getElementById('load-variables-btn');

saveVariablesBtn.addEventListener('click', () => {
  // Show QuickPick with save/export options
  try {
    const variables = JSON.parse(variablesEditor.value || '{}');
    vscode.postMessage({ 
      type: 'showSaveQuickPick',
      variables: variables
    });
  } catch {
    vscode.postMessage({
      type: 'showError',
      message: 'Invalid JSON in variables'
    });
  }
});

loadVariablesBtn.addEventListener('click', () => {
  // Show QuickPick with load/import options
  vscode.postMessage({ type: 'showLoadQuickPick' });
});

// Smart Generate button handler
const smartGenerateBtn = document.getElementById('smart-generate-btn');
if (smartGenerateBtn) {
  smartGenerateBtn.addEventListener('click', () => {
    // Add loading state
    smartGenerateBtn.classList.add('loading');
    
    // Get current variables to preserve structure
    let currentVars = {};
    try {
      currentVars = JSON.parse(variablesEditor.value || '{}');
    } catch {
      // Invalid JSON, start fresh
    }
    
    // Request smart data generation from extension
    vscode.postMessage({
      type: 'smartGenerateData',
      currentVariables: currentVars,
      template: currentTemplate
    });
  });
  
  // Add tooltip on hover showing what it does
  smartGenerateBtn.title = 'Generate test data algorithmically';
}

// LLM Generate button handler (Copilot-powered)
const llmGenerateBtn = document.getElementById('llm-generate-btn');
let copilotAvailable = false; // Will be set when settings are received

if (llmGenerateBtn) {
  // Initially hide the button until we know Copilot is available
  llmGenerateBtn.style.display = 'none';
  
  llmGenerateBtn.addEventListener('click', () => {
    if (!copilotAvailable) return;
    
    // Add loading state
    llmGenerateBtn.classList.add('loading');
    
    // Show indicator that Copilot is being invoked
    showAIStatus('Asking Copilot...', 'copilot');
    
    // Get current variables to preserve structure
    let currentVars = {};
    try {
      currentVars = JSON.parse(variablesEditor.value || '{}');
    } catch {
      // Invalid JSON, start fresh
    }
    
    // Request LLM data generation from extension
    vscode.postMessage({
      type: 'llmGenerateData',
      currentVariables: currentVars,
      template: currentTemplate
    });
  });
  
  // Add tooltip on hover showing what it does
  llmGenerateBtn.title = 'Generate test data using GitHub Copilot';
}

// OpenAI Generate button handler
const openaiGenerateBtn = document.getElementById('openai-generate-btn');
let openaiAvailable = false; // Will be set when settings are received

if (openaiGenerateBtn) {
  // Initially hide the button until we know OpenAI is available
  openaiGenerateBtn.style.display = 'none';
  
  openaiGenerateBtn.addEventListener('click', () => {
    if (!openaiAvailable) return;
    
    // Add loading state
    openaiGenerateBtn.classList.add('loading');
    
    // Show indicator that OpenAI is being invoked
    showAIStatus('Asking OpenAI...', 'openai');
    
    // Get current variables to preserve structure
    let currentVars = {};
    try {
      currentVars = JSON.parse(variablesEditor.value || '{}');
    } catch {
      // Invalid JSON, start fresh
    }
    
    // Request OpenAI data generation from extension
    vscode.postMessage({
      type: 'openaiGenerateData',
      currentVariables: currentVars,
      template: currentTemplate
    });
  });
  
  // Add tooltip on hover showing what it does
  openaiGenerateBtn.title = 'Generate test data using OpenAI API';
}

/**
 * Update Copilot button visibility based on availability
 * @param {boolean} available - Whether Copilot is available
 */
function updateCopilotButtonVisibility(available) {
  copilotAvailable = available;
  if (llmGenerateBtn) {
    llmGenerateBtn.style.display = available ? 'inline-flex' : 'none';
  }
}

/**
 * Update OpenAI button visibility based on availability
 * @param {boolean} available - Whether OpenAI is available
 */
function updateOpenAIButtonVisibility(available) {
  openaiAvailable = available;
  if (openaiGenerateBtn) {
    openaiGenerateBtn.style.display = available ? 'inline-flex' : 'none';
  }
}

// Claude Generate button handler
const claudeGenerateBtn = document.getElementById('claude-generate-btn');
let claudeAvailable = false; // Will be set when settings are received

if (claudeGenerateBtn) {
  // Initially hide the button until we know Claude is available
  claudeGenerateBtn.style.display = 'none';
  
  claudeGenerateBtn.addEventListener('click', () => {
    if (!claudeAvailable) return;
    
    // Add loading state
    claudeGenerateBtn.classList.add('loading');
    
    // Show indicator that Claude is being invoked
    showAIStatus('Asking Claude...', 'claude');
    
    // Get current variables to preserve structure
    let currentVars = {};
    try {
      currentVars = JSON.parse(variablesEditor.value || '{}');
    } catch {
      // Invalid JSON, start fresh
    }
    
    // Request Claude data generation from extension
    vscode.postMessage({
      type: 'claudeGenerateData',
      currentVariables: currentVars,
      template: currentTemplate
    });
  });
  
  // Add tooltip on hover showing what it does
  claudeGenerateBtn.title = 'Generate test data using Anthropic Claude API';
}

/**
 * Update Claude button visibility based on availability
 * @param {boolean} available - Whether Claude is available
 */
function updateClaudeButtonVisibility(available) {
  claudeAvailable = available;
  if (claudeGenerateBtn) {
    claudeGenerateBtn.style.display = available ? 'inline-flex' : 'none';
  }
}

// Gemini Generate button handler
const geminiGenerateBtn = document.getElementById('gemini-generate-btn');
let geminiAvailable = false; // Will be set when settings are received

if (geminiGenerateBtn) {
  // Initially hide the button until we know Gemini is available
  geminiGenerateBtn.style.display = 'none';
  
  geminiGenerateBtn.addEventListener('click', () => {
    if (!geminiAvailable) return;
    
    // Add loading state
    geminiGenerateBtn.classList.add('loading');
    
    // Show indicator that Gemini is being invoked
    showAIStatus('Asking Gemini...', 'gemini');
    
    // Get current variables to preserve structure
    let currentVars = {};
    try {
      currentVars = JSON.parse(variablesEditor.value || '{}');
    } catch {
      // Invalid JSON, start fresh
    }
    
    // Request Gemini data generation from extension
    vscode.postMessage({
      type: 'geminiGenerateData',
      currentVariables: currentVars,
      template: currentTemplate
    });
  });
  
  // Add tooltip on hover showing what it does
  geminiGenerateBtn.title = 'Generate test data using Google Gemini API';
}

/**
 * Update Gemini button visibility based on availability
 * @param {boolean} available - Whether Gemini is available
 */
function updateGeminiButtonVisibility(available) {
  geminiAvailable = available;
  if (geminiGenerateBtn) {
    geminiGenerateBtn.style.display = available ? 'inline-flex' : 'none';
  }
}

// ============================================================================
// AI DEBUG FEATURE - Error Analysis and Fix Suggestions
// ============================================================================

// AI Debug Button and Panel elements
const aiDebugBtn = document.getElementById('ai-debug-btn');
const aiDebugPanel = document.getElementById('ai-debug-panel');
const aiDebugContent = document.getElementById('ai-debug-content');
const aiDebugClose = document.getElementById('ai-debug-close');

// Track current error message for debugging
let currentErrorMessage = '';
let isAiDebugAvailable = false;

/**
 * Show/hide the AI Debug button based on error state and AI availability
 * @param {boolean} hasError - Whether there's an error to debug
 * @param {string} errorMsg - The error message
 */
function updateAiDebugButton(hasError, errorMsg = '') {
  if (!aiDebugBtn) return;
  
  currentErrorMessage = errorMsg;
  
  // Check if any AI provider is available
  isAiDebugAvailable = copilotAvailable || openaiAvailable || claudeAvailable || geminiAvailable;
  
  if (hasError && isAiDebugAvailable) {
    aiDebugBtn.style.display = 'inline-flex';
  } else {
    aiDebugBtn.style.display = 'none';
    // Also hide the panel if no error
    if (aiDebugPanel) {
      aiDebugPanel.style.display = 'none';
    }
  }
}

/**
 * Get the best available AI provider for debugging
 * @returns {string} Provider name ('copilot', 'openai', 'claude', 'gemini')
 */
function getBestDebugProvider() {
  // Prefer Copilot, then Claude, then OpenAI, then Gemini
  if (copilotAvailable) return 'copilot';
  if (claudeAvailable) return 'claude';
  if (openaiAvailable) return 'openai';
  if (geminiAvailable) return 'gemini';
  return 'copilot'; // Fallback
}

/**
 * Render the debug analysis result in the panel
 * @param {Object} result - The debug analysis result from AI
 */
function renderDebugResult(result) {
  if (!aiDebugContent || !result) return;
  
  // Store result for apply handlers
  aiDebugContent._debugResult = result;
  
  let html = '';
  
  // Quick Actions Bar at the top - collect all actionable fixes
  const hasTemplateFix = result.fixes && result.fixes.some(f => f.templateChange && f.templateChange.after);
  const hasVariableFix = result.fixes && result.fixes.some(f => f.variableChange && f.variableChange.after);
  const errorLine = result.errorLocation && result.errorLocation.line;
  
  if (hasTemplateFix || hasVariableFix || errorLine) {
    html += `<div class="ai-debug-quick-actions">`;
    
    // Apply Template Fix button (applies the first/highest priority template fix)
    if (hasTemplateFix) {
      const templateFixIndex = result.fixes.findIndex(f => f.templateChange && f.templateChange.after);
      html += `<button class="ai-debug-action-btn primary" data-action="apply-template" data-fix-index="${templateFixIndex}">
        <i class="codicon codicon-check"></i>
        Apply Fix
      </button>`;
    }
    
    // Apply Variable Fix button
    if (hasVariableFix) {
      const varFixIndex = result.fixes.findIndex(f => f.variableChange && f.variableChange.after);
      html += `<button class="ai-debug-action-btn" data-action="apply-variables" data-fix-index="${varFixIndex}">
        <i class="codicon codicon-json"></i>
        Apply Variable Fix
      </button>`;
    }
    
    // Go to Error Line button
    if (errorLine) {
      html += `<button class="ai-debug-action-btn" data-action="goto-line" data-line="${errorLine}">
        <i class="codicon codicon-go-to-file"></i>
        Go to Line ${errorLine}
      </button>`;
    }
    
    html += `</div>`;
  }
  
  // Error Location info
  if (result.errorLocation && result.errorLocation.line) {
    html += `<div class="ai-debug-location" data-line="${result.errorLocation.line}">
      <i class="codicon codicon-location"></i>
      <span>Line ${result.errorLocation.line}: ${escapeHtml(result.errorLocation.description || '')}</span>
    </div>`;
  }
  
  // Root Cause
  if (result.rootCause) {
    html += `<div class="ai-debug-section">
      <div class="ai-debug-section-title">
        <i class="codicon codicon-search"></i>
        Root Cause
      </div>
      <div class="ai-debug-root-cause">${escapeHtml(result.rootCause)}</div>
    </div>`;
  }
  
  // Fix Suggestions - show code changes
  if (result.fixes && result.fixes.length > 0) {
    html += `<div class="ai-debug-section">
      <div class="ai-debug-section-title">
        <i class="codicon codicon-tools"></i>
        Suggested Fixes
      </div>`;
    
    result.fixes.forEach((fix, index) => {
      const priorityClass = fix.priority || 'medium';
      html += `<div class="ai-debug-fix" data-fix-index="${index}">
        <div class="ai-debug-fix-header">
          <div class="ai-debug-fix-title">
            <i class="codicon codicon-${fix.type === 'template' ? 'file-code' : fix.type === 'variables' ? 'json' : 'files'}"></i>
            ${escapeHtml(fix.title || 'Fix ' + (index + 1))}
          </div>
          <span class="ai-debug-fix-priority ${priorityClass}">${priorityClass}</span>
        </div>
        <div class="ai-debug-fix-body">
          <div class="ai-debug-fix-description">${escapeHtml(fix.description || '')}</div>`;
      
      // Template change
      if (fix.templateChange && (fix.templateChange.before || fix.templateChange.after)) {
        html += `<div class="ai-debug-code-change">
          <div class="ai-debug-code-label">Template Change${fix.templateChange.line ? ' (Line ' + fix.templateChange.line + ')' : ''}</div>`;
        
        if (fix.templateChange.before) {
          html += `<div class="ai-debug-code-before">${escapeHtml(fix.templateChange.before)}</div>`;
        }
        if (fix.templateChange.after) {
          html += `<div class="ai-debug-code-after">${escapeHtml(fix.templateChange.after)}</div>`;
        }
        html += `</div>`;
      }
      
      // Variable change
      if (fix.variableChange && (fix.variableChange.before || fix.variableChange.after)) {
        html += `<div class="ai-debug-code-change">
          <div class="ai-debug-code-label">Variable Change</div>`;
        
        if (fix.variableChange.before) {
          const beforeStr = typeof fix.variableChange.before === 'object' 
            ? JSON.stringify(fix.variableChange.before, null, 2) 
            : fix.variableChange.before;
          html += `<div class="ai-debug-code-before">${escapeHtml(beforeStr)}</div>`;
        }
        if (fix.variableChange.after) {
          const afterStr = typeof fix.variableChange.after === 'object' 
            ? JSON.stringify(fix.variableChange.after, null, 2) 
            : fix.variableChange.after;
          html += `<div class="ai-debug-code-after">${escapeHtml(afterStr)}</div>`;
        }
        html += `</div>`;
      }
      
      html += `</div></div>`;
    });
    
    html += `</div>`;
  }
  
  // Null Safety Tips
  if (result.nullSafetyTips && result.nullSafetyTips.length > 0) {
    html += `<div class="ai-debug-section">
      <div class="ai-debug-tips">
        <div class="ai-debug-tips-title">
          <i class="codicon codicon-shield"></i>
          Null Safety Tips
        </div>
        <ul class="ai-debug-tips-list">`;
    
    result.nullSafetyTips.forEach(tip => {
      html += `<li>${escapeHtml(tip)}</li>`;
    });
    
    html += `</ul></div></div>`;
  }
  
  aiDebugContent.innerHTML = html;
  aiDebugContent.classList.remove('loading', 'streaming');
  
  // Add click handlers for location links
  const locationEl = aiDebugContent.querySelector('.ai-debug-location');
  if (locationEl) {
    locationEl.addEventListener('click', () => {
      const line = parseInt(locationEl.dataset.line, 10);
      if (line) {
        vscode.postMessage({
          type: 'goToLine',
          line: line,
          fileUri: currentFileUri,
          selectionRange: currentSelectionRange,
          selectWholeLine: true
        });
      }
    });
  }
  
  // Add click handlers for quick action buttons
  const actionBtns = aiDebugContent.querySelectorAll('.ai-debug-action-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const fixIndex = parseInt(btn.dataset.fixIndex, 10);
      const line = parseInt(btn.dataset.line, 10);
      
      if (action === 'apply-template' && result.fixes && result.fixes[fixIndex]) {
        const fix = result.fixes[fixIndex];
        if (fix.templateChange && fix.templateChange.before && fix.templateChange.after) {
          // Request the extension to apply the template fix
          vscode.postMessage({
            type: 'applyTemplateFix',
            fileUri: currentFileUri,
            before: fix.templateChange.before,
            after: fix.templateChange.after,
            line: fix.templateChange.line || null
          });
          
          // Visual feedback
          const originalHtml = btn.innerHTML;
          btn.innerHTML = '<i class="codicon codicon-check"></i> Applied!';
          btn.classList.add('success');
          setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('success');
          }, 2000);
        }
      } else if (action === 'apply-variables' && result.fixes && result.fixes[fixIndex]) {
        const fix = result.fixes[fixIndex];
        if (fix.variableChange && fix.variableChange.after) {
          applyVariableFix(fix.variableChange.after, btn);
        }
      } else if (action === 'goto-line' && line) {
        vscode.postMessage({
          type: 'goToLine',
          line: line,
          fileUri: currentFileUri,
          selectionRange: currentSelectionRange,
          selectWholeLine: true
        });
      }
    });
  });
}

/**
 * Apply a variable fix from AI debug
 * @param {Object|string} newVars - New variables to apply
 * @param {HTMLElement} btn - Button element for visual feedback
 */
function applyVariableFix(newVars, btn) {
  try {
    const varsToApply = typeof newVars === 'object' ? newVars : JSON.parse(newVars);
    const currentVars = JSON.parse(variablesEditor.value || '{}');
    const mergedVars = { ...currentVars, ...varsToApply };
    variablesEditor.value = JSON.stringify(mergedVars, null, 2);
    validateJsonAndShowError();
    autoResizeVariablesSection();
    debouncedGhostSave();
    
    // Re-render
    if (autoRerender) {
      update();
    }
    
    // Visual feedback
    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="codicon codicon-check"></i> Applied!';
      btn.classList.add('success');
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.classList.remove('success');
      }, 2000);
    }
  } catch (e) {
    console.error('Failed to apply variable fix:', e);
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// AI Debug Button click handler
if (aiDebugBtn) {
  aiDebugBtn.addEventListener('click', () => {
    if (!isAiDebugAvailable) return;
    
    // Show loading state
    aiDebugBtn.classList.add('loading');
    
    // Show the debug panel with loading state
    if (aiDebugPanel) {
      aiDebugPanel.style.display = 'block';
    }
    if (aiDebugContent) {
      aiDebugContent.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--vscode-descriptionForeground);"><div style="margin-bottom: 8px;">Analyzing error...</div></div>';
      aiDebugContent.classList.add('loading');
    }
    
    // Get current variables
    let currentVars = {};
    try {
      currentVars = JSON.parse(variablesEditor.value || '{}');
    } catch {
      currentVars = {};
    }
    
    // Get the best available provider
    const provider = getBestDebugProvider();
    
    // Show status
    showAIStatus(`Debugging with ${provider === 'copilot' ? 'Copilot' : provider === 'claude' ? 'Claude' : provider === 'openai' ? 'OpenAI' : 'Gemini'}...`, provider);
    
    // Request AI debug
    vscode.postMessage({
      type: 'aiDebugError',
      errorMessage: currentErrorMessage,
      template: currentTemplate,
      variables: currentVars,
      provider: provider
    });
  });
}

// AI Debug Close button handler
if (aiDebugClose) {
  aiDebugClose.addEventListener('click', () => {
    if (aiDebugPanel) {
      aiDebugPanel.style.display = 'none';
    }
  });
}

// OpenAI SVG icon for status indicators
const OPENAI_ICON_SVG = `<svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4066-.6898zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`;

// Claude SVG icon for status indicators
const CLAUDE_ICON_SVG = `<svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.709 15.955l4.72-2.647.08-.08v-.79l-.08-.08H2.292A9.967 9.967 0 0 0 12 22c.476 0 .946-.033 1.405-.098l-4.86-4.86a2.5 2.5 0 0 1-3.836-1.087zM2 12c0-.476.033-.946.098-1.405l4.86 4.86a2.5 2.5 0 0 1 1.087-3.836l2.647 4.72.08.08h.79l.08-.08V9.202A9.967 9.967 0 0 0 2 12zm10-10c-.476 0-.946.033-1.405.098l4.86 4.86a2.5 2.5 0 0 1 3.836 1.087l-4.72 2.647-.08.08v.79l.08.08h7.137A9.967 9.967 0 0 0 12 2zm9.902 10.595l-4.86-4.86a2.5 2.5 0 0 1-1.087 3.836l-2.647-4.72-.08-.08h-.79l-.08.08v7.137A9.967 9.967 0 0 0 22 12c0-.476-.033-.946-.098-1.405z"/></svg>`;

// Gemini SVG icon for status indicators
const GEMINI_ICON_SVG = `<svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z"/></svg>`;

/**
 * Show a temporary AI status indicator
 * @param {string} message - Status message to show
 * @param {string} provider - AI provider ('copilot', 'openai', 'claude', or 'gemini')
 */
function showAIStatus(message, provider = 'copilot') {
  // Remove any existing status
  const existing = document.getElementById('ai-status');
  if (existing) existing.remove();
  
  let iconHtml, gradient, shadow;
  
  if (provider === 'openai') {
    iconHtml = OPENAI_ICON_SVG;
    gradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';  // Green
    shadow = 'rgba(16, 185, 129, 0.4)';
  } else if (provider === 'claude') {
    iconHtml = CLAUDE_ICON_SVG;
    gradient = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';  // Orange
    shadow = 'rgba(217, 119, 6, 0.4)';
  } else if (provider === 'gemini') {
    iconHtml = GEMINI_ICON_SVG;
    gradient = 'linear-gradient(135deg, #4285f4 0%, #1a73e8 100%)';  // Blue
    shadow = 'rgba(66, 133, 244, 0.4)';
  } else {
    iconHtml = '<i class="codicon codicon-copilot"></i>';
    gradient = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';  // Cyan
    shadow = 'rgba(6, 182, 212, 0.4)';
  }
  
  // Create status indicator
  const status = document.createElement('div');
  status.id = 'ai-status';
  status.dataset.provider = provider;
  status.innerHTML = `${iconHtml} ${message}`;
  status.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: ${gradient};
    color: white;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 11px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 1000;
    box-shadow: 0 4px 12px ${shadow};
    animation: fadeInUp 0.3s ease-out;
    white-space: nowrap;
  `;
  
  document.body.appendChild(status);
}

/**
 * Hide the AI status indicator
 * @param {boolean} success - Whether the operation was successful
 * @param {string} provider - AI provider ('copilot', 'openai', 'claude', or 'gemini')
 */
function hideAIStatus(success = true, provider = 'copilot') {
  const status = document.getElementById('ai-status');
  if (status) {
    let iconHtml, providerName;
    
    if (provider === 'openai') {
      iconHtml = OPENAI_ICON_SVG;
      providerName = 'OpenAI';
    } else if (provider === 'claude') {
      iconHtml = CLAUDE_ICON_SVG;
      providerName = 'Claude';
    } else if (provider === 'gemini') {
      iconHtml = GEMINI_ICON_SVG;
      providerName = 'Gemini';
    } else {
      iconHtml = '<i class="codicon codicon-copilot"></i>';
      providerName = 'Copilot';
    }
    
    if (success) {
      status.innerHTML = `${iconHtml} Generated by ${providerName} ✓`;
      status.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
      status.innerHTML = `${iconHtml} ${providerName} unavailable`;
      status.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    }
    
    setTimeout(() => {
      status.style.animation = 'fadeOutDown 0.3s ease-out forwards';
      setTimeout(() => status.remove(), 300);
    }, 1500);
  }
}

// Legacy functions for backwards compatibility
function showCopilotStatus(message) {
  showAIStatus(message, 'copilot');
}

function hideCopilotStatus(success = true) {
  hideAIStatus(success, 'copilot');
}

// Extensions indicator click handler
if (extensionsIndicator) {
  extensionsIndicator.addEventListener('click', () => {
    vscode.postMessage({ type: 'executeCommand', command: 'live-jinja-tester.openExtensionSettings' });
  });
}

// Render time click handler - force re-render
if (statusRenderTime) {
  statusRenderTime.addEventListener('click', async () => {
    // Visual feedback
    statusRenderTime.style.opacity = '0.5';
    if (renderTimeStatus) {
      renderTimeStatus.textContent = '...';
    }
    
    // Force re-render
    await update();
    
    // Restore opacity
    statusRenderTime.style.opacity = '1';
  });
}

// Template indicator click handler - toggle dropdown
const templateIndicatorEl = document.getElementById('template-indicator');
const templateDropdown = document.getElementById('template-dropdown');

/**
 * Generate the HTML content for the template dropdown
 * @returns {string} HTML content for the dropdown
 */
function generateTemplateDropdownHTML() {
  const summary = templateSummary || { paths: [], searchDirs: [] };
  const allPaths = summary.paths || [];
  
  // Separate used and unused templates
  const usedPaths = [];
  const unusedPaths = [];
  
  allPaths.forEach(p => {
    if (isTemplateUsed(p, usedTemplates)) {
      usedPaths.push(p);
    } else {
      unusedPaths.push(p);
    }
  });
  
  let html = '';
  
  // Show used templates first (if any)
  if (usedPaths.length > 0) {
    html += '<div class="template-dropdown-header">Used in Current Template</div>';
    usedPaths.forEach(p => {
      html += `<div class="template-dropdown-item template-file template-used" data-path="${p}" title="Click to open: ${p}">
        <i class="codicon codicon-check" style="margin-right: 4px;"></i>${p}
      </div>`;
    });
  }
  
  // Show unused templates
  if (unusedPaths.length > 0) {
    html += '<div class="template-dropdown-header">Available Templates</div>';
    unusedPaths.forEach(p => {
      html += `<div class="template-dropdown-item template-file template-unused" data-path="${p}" title="Click to open: ${p}">${p}</div>`;
    });
  }
  
  if (allPaths.length === 0) {
    html += '<div class="template-dropdown-header">Available Templates</div>';
    html += '<div class="template-dropdown-item" style="opacity: 0.6; cursor: default;">No templates loaded</div>';
  }
  
  if (summary.searchDirs && summary.searchDirs.length > 0) {
    html += '<div class="template-dropdown-header">Search Directories</div>';
    summary.searchDirs.forEach(d => {
      html += `<div class="template-dropdown-item" style="opacity: 0.7;" title="${d}">${d}</div>`;
    });
  }
  
  html += '<div class="template-dropdown-reload"><i class="codicon codicon-refresh"></i> Reload Templates</div>';
  
  return html;
}

/**
 * Attach click handlers to dropdown elements
 */
function attachDropdownHandlers() {
  if (!templateDropdown || !templateIndicatorEl) return;
  
  // Reload button handler
  const reloadBtn = templateDropdown.querySelector('.template-dropdown-reload');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: 'reloadTemplates' });
      templateIndicatorEl.classList.remove('expanded');
      templateDropdown.style.display = 'none';
    });
  }
  
  // Template file handlers
  const templateFiles = templateDropdown.querySelectorAll('.template-file');
  templateFiles.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const templatePath = item.getAttribute('data-path');
      if (templatePath) {
        vscode.postMessage({ 
          type: 'openTemplateFile', 
          templatePath: templatePath 
        });
        templateIndicatorEl.classList.remove('expanded');
        templateDropdown.style.display = 'none';
      }
    });
  });
}

/**
 * Refresh the template dropdown content if it's currently open
 * Called when usedTemplates changes to provide live updates
 */
function refreshTemplateDropdownIfOpen() {
  if (!templateIndicatorEl || !templateDropdown) return;
  
  // Only refresh if dropdown is currently expanded
  if (!templateIndicatorEl.classList.contains('expanded')) return;
  
  templateDropdown.innerHTML = generateTemplateDropdownHTML();
  attachDropdownHandlers();
}

if (templateIndicatorEl && templateDropdown) {
  templateIndicatorEl.addEventListener('click', (e) => {
    // Don't toggle if clicking on reload button inside dropdown
    if (e.target.closest('.template-dropdown-reload')) {
      return;
    }
    
    const isExpanded = templateIndicatorEl.classList.toggle('expanded');
    templateDropdown.style.display = isExpanded ? 'block' : 'none';
    
    if (isExpanded) {
      // Populate dropdown using shared function
      templateDropdown.innerHTML = generateTemplateDropdownHTML();
      attachDropdownHandlers();
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!templateIndicatorEl.contains(e.target)) {
      templateIndicatorEl.classList.remove('expanded');
      templateDropdown.style.display = 'none';
    }
  });
}


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

const detachOutputBtn = document.getElementById('detach-output-btn');
if (detachOutputBtn) {
    detachOutputBtn.addEventListener('click', () => {
        // Gather current state
    const variables = JSON.parse(getVariablesText() || '{}');
        
        vscode.postMessage({
            type: 'detachOutput',
            variables: variables,
            fileUri: currentFileUri
        });
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

// Helper function to handle messages
async function handleMessage(message) {
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
        
        setVariablesText(JSON.stringify(mergedVars, null, 2));
        autoResizeVariablesSection();
        hideLoading();
      }
      
      if (autoRerender) {
        await update();
      }
      break;
    
    case 'replaceVariables':
      if (message.extractedVariables) {
        showLoading('Updating variables...');
        
        let currentVars = {};
        try {
          currentVars = JSON.parse(variablesEditor.value || '{}');
        } catch {
          currentVars = {};
        }
        
        const mergedVars = {};
        const extractedVarNames = Object.keys(message.extractedVariables);
        
        // In detached mode, just use the variables directly without merging logic
        if (isDetachedMode) {
          setVariablesText(JSON.stringify(message.extractedVariables, null, 2));
        } else {
          // Normal mode: merge with existing
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
          
          setVariablesText(JSON.stringify(mergedVars, null, 2));
        }
        
        autoResizeVariablesSection();
        hideLoading();
        await update();
      }
      break;
    
    case 'updateSettings':
      if (message.settings) {
        // Helper to update setting and track if changed
        const updateSetting = (key, oldVal, newVal) => {
          if (newVal !== oldVal) trackSettingChange(key, newVal);
          return newVal;
        };
        
        isMarkdownMode = updateSetting('Markdown', isMarkdownMode, message.settings.enableMarkdown);
        isMermaidMode = updateSetting('Mermaid', isMermaidMode, message.settings.enableMermaid);
        mermaidZoomSensitivity = message.settings.mermaidZoomSensitivity !== undefined ? message.settings.mermaidZoomSensitivity : 0.05;
        showWhitespace = updateSetting('Show Whitespace', showWhitespace, message.settings.showWhitespace);
        cullWhitespace = updateSetting('Cull Whitespace', cullWhitespace, message.settings.cullWhitespace);
        autoRerender = updateSetting('Auto-rerender', autoRerender, message.settings.autoRerender !== undefined ? message.settings.autoRerender : true);
        ghostSaveEnabled = message.settings.ghostSaveEnabled !== undefined ? message.settings.ghostSaveEnabled : true;
        historyEnabled = message.settings.historyEnabled !== undefined ? message.settings.historyEnabled : true;
        showPerformanceMetrics = message.settings.showPerformanceMetrics !== undefined ? message.settings.showPerformanceMetrics : true;
        suggestExtensions = message.settings.suggestExtensions !== undefined ? message.settings.suggestExtensions : true;
        
        // Update Copilot button visibility
        if (message.copilotAvailable !== undefined) {
          updateCopilotButtonVisibility(message.copilotAvailable);
        }
        
        // Update OpenAI button visibility
        if (message.openaiAvailable !== undefined) {
          updateOpenAIButtonVisibility(message.openaiAvailable);
        }
        
        // Update Claude button visibility
        if (message.claudeAvailable !== undefined) {
          updateClaudeButtonVisibility(message.claudeAvailable);
        }
        
        // Update Gemini button visibility
        if (message.geminiAvailable !== undefined) {
          updateGeminiButtonVisibility(message.geminiAvailable);
        }
        
        // Update environment settings
        stripBlockWhitespace = updateSetting('Strip Blocks', stripBlockWhitespace, message.settings.stripBlockWhitespace !== undefined ? message.settings.stripBlockWhitespace : false);
        
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
        
        // Check if template settings changed - if so, request template reload
        if (message.settings.templates) {
          // Request template reload from extension
          vscode.postMessage({ type: 'reloadTemplates' });
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
        setVariablesText(JSON.stringify(message.variables, null, 2));
        autoResizeVariablesSection();
        await update();
      }
      break;
    
    case 'extensionEnabled':
      // Extension was enabled, update the UI
      if (message.extension && message.settings && message.settings.extensions) {
        enabledExtensions.i18n = message.settings.extensions.i18n || false;
        enabledExtensions.do = message.settings.extensions.do || false;
        enabledExtensions.loopcontrols = message.settings.extensions.loopcontrols || false;
        enabledExtensions.with = message.settings.extensions.with || false;
        enabledExtensions.autoescape = message.settings.extensions.autoescape || false;
        enabledExtensions.debug = message.settings.extensions.debug || false;
        customExtensions = message.settings.extensions.custom || '';
        updateExtensionsIndicator();
        updateExtensionSuggestions();
        await update();
      }
      break;
    
    case 'updateTemplates':
      // Update loaded templates for includes/extends
      loadedTemplates = message.templates || {};
      templateSummary = message.summary || { enabled: false, count: 0, paths: [], error: null };
      usedTemplates = message.usedTemplates || [];
      updateTemplateIndicator();
      refreshTemplateDropdownIfOpen();
      // Re-render with new templates if we have a template and auto-rerender is on
      if (autoRerender && currentTemplate) {
        await update();
      }
      break;
    
    case 'updateUsedTemplates':
      // Update which templates are being used (live update as template content changes)
      usedTemplates = message.usedTemplates || [];
      updateTemplateIndicator();
      refreshTemplateDropdownIfOpen();
      break;
    
    case 'execCommand':
      if (message.command) {
        variablesEditor.focus();
        document.execCommand(message.command);
      }
      break;
    
    case 'hideOutput':
      // Hide output section when detached panel is opened
      if (!isDetachedMode && message.fileUri === currentFileUri) {
        document.body.classList.add('detached-active');
        // Update indicators - they stay in status footer which remains visible
        updateRenderTimeDisplay();
        updateWhitespaceIndicators();
        updateTemplateIndicator();
      }
      break;
    
    case 'showOutput':
      // Show output section when detached panel is closed
      if (!isDetachedMode && message.fileUri === currentFileUri) {
        document.body.classList.remove('detached-active');
        // Update indicators - render time moves back to header
        updateRenderTimeDisplay();
        updateWhitespaceIndicators();
        updateTemplateIndicator();
      }
      break;
    
    case 'smartGeneratedData':
      // Smart data generation complete
      const smartGenerateBtnEl = document.getElementById('smart-generate-btn');
      if (smartGenerateBtnEl) {
        smartGenerateBtnEl.classList.remove('loading');
        smartGenerateBtnEl.classList.add('success');
        setTimeout(() => {
          smartGenerateBtnEl.classList.remove('success');
        }, 1000);
      }
      
      if (message.generatedData) {
        setVariablesText(JSON.stringify(message.generatedData, null, 2));
        validateJsonAndShowError();
        autoResizeVariablesSection();
        debouncedGhostSave();
        if (autoRerender) {
          await update();
        }
      }
      break;
    
    case 'llmStreamChunk':
      // Streaming chunk from Copilot - update textarea in real-time
      if (message.text !== undefined) {
        setVariablesText(message.text);
        variablesEditor.classList.add('streaming');
        variablesEditor.classList.add('streaming-copilot');
        
        // Auto-scroll to bottom to show latest content
        scrollVariablesEditorToBottom();
        
        // Update status to show streaming
        const statusEl = document.getElementById('ai-status');
        if (statusEl && !message.isDone) {
          statusEl.innerHTML = `<i class="codicon codicon-copilot"></i> Generating...`;
        }
        
        // Auto-resize as content grows
        autoResizeVariablesSection();
      }
      break;
    
    case 'llmGeneratedData':
      // LLM (Copilot) data generation complete
      variablesEditor.classList.remove('streaming');
      variablesEditor.classList.remove('streaming-copilot');
      
      const llmGenerateBtnEl = document.getElementById('llm-generate-btn');
      if (llmGenerateBtnEl) {
        llmGenerateBtnEl.classList.remove('loading');
        
        if (message.error) {
          // Show error state briefly
          llmGenerateBtnEl.classList.add('error');
          hideAIStatus(false, 'copilot');
          setTimeout(() => {
            llmGenerateBtnEl.classList.remove('error');
          }, 2000);
        } else {
          llmGenerateBtnEl.classList.add('success');
          hideAIStatus(true, 'copilot');
          setTimeout(() => {
            llmGenerateBtnEl.classList.remove('success');
          }, 1000);
        }
      }
      
      if (message.generatedData) {
        // Set final formatted JSON
        setVariablesText(JSON.stringify(message.generatedData, null, 2));
        validateJsonAndShowError();
        autoResizeVariablesSection();
        debouncedGhostSave();
        if (autoRerender) {
          await update();
        }
      }
      break;
    
    case 'openaiStreamChunk':
      // Streaming chunk from OpenAI - update textarea in real-time
      if (message.text !== undefined) {
        setVariablesText(message.text);
        variablesEditor.classList.add('streaming');
        variablesEditor.classList.add('streaming-openai');
        
        // Auto-scroll to bottom to show latest content
        scrollVariablesEditorToBottom();
        
        // Update status to show streaming
        const openaiStatusEl = document.getElementById('ai-status');
        if (openaiStatusEl && !message.isDone) {
          openaiStatusEl.innerHTML = `${OPENAI_ICON_SVG} Generating...`;
        }
        
        // Auto-resize as content grows
        autoResizeVariablesSection();
      }
      break;
    
    case 'openaiGeneratedData':
      // OpenAI data generation complete
      variablesEditor.classList.remove('streaming');
      variablesEditor.classList.remove('streaming-openai');
      
      const openaiGenerateBtnEl = document.getElementById('openai-generate-btn');
      if (openaiGenerateBtnEl) {
        openaiGenerateBtnEl.classList.remove('loading');
        
        if (message.error) {
          // Show error state briefly
          openaiGenerateBtnEl.classList.add('error');
          hideAIStatus(false, 'openai');
          setTimeout(() => {
            openaiGenerateBtnEl.classList.remove('error');
          }, 2000);
        } else {
          openaiGenerateBtnEl.classList.add('success');
          hideAIStatus(true, 'openai');
          setTimeout(() => {
            openaiGenerateBtnEl.classList.remove('success');
          }, 1000);
        }
      }
      
      if (message.generatedData) {
        // Set final formatted JSON
        setVariablesText(JSON.stringify(message.generatedData, null, 2));
        validateJsonAndShowError();
        autoResizeVariablesSection();
        debouncedGhostSave();
        if (autoRerender) {
          await update();
        }
      }
      break;
    
    case 'openaiKeyUpdated':
      // Key was added or removed - update UI
      updateOpenAIButtonVisibility(message.available);
      break;
    
    case 'claudeStreamChunk':
      // Streaming chunk from Claude - update textarea in real-time
      if (message.text !== undefined) {
        setVariablesText(message.text);
        variablesEditor.classList.add('streaming');
        variablesEditor.classList.add('streaming-claude');
        
        // Auto-scroll to bottom to show latest content
        scrollVariablesEditorToBottom();
        
        // Update status to show streaming
        const claudeStatusEl = document.getElementById('ai-status');
        if (claudeStatusEl && !message.isDone) {
          claudeStatusEl.innerHTML = `${CLAUDE_ICON_SVG} Generating...`;
        }
        
        // Auto-resize as content grows
        autoResizeVariablesSection();
      }
      break;
    
    case 'claudeGeneratedData':
      // Claude data generation complete
      variablesEditor.classList.remove('streaming');
      variablesEditor.classList.remove('streaming-claude');
      
      const claudeGenerateBtnEl = document.getElementById('claude-generate-btn');
      if (claudeGenerateBtnEl) {
        claudeGenerateBtnEl.classList.remove('loading');
        
        if (message.error) {
          // Show error state briefly
          claudeGenerateBtnEl.classList.add('error');
          hideAIStatus(false, 'claude');
          setTimeout(() => {
            claudeGenerateBtnEl.classList.remove('error');
          }, 2000);
        } else {
          claudeGenerateBtnEl.classList.add('success');
          hideAIStatus(true, 'claude');
          setTimeout(() => {
            claudeGenerateBtnEl.classList.remove('success');
          }, 1000);
        }
      }
      
      if (message.generatedData) {
        // Set final formatted JSON
        setVariablesText(JSON.stringify(message.generatedData, null, 2));
        validateJsonAndShowError();
        autoResizeVariablesSection();
      }
      break;
    
    case 'claudeKeyUpdated':
      // Key was added or removed - update UI
      updateClaudeButtonVisibility(message.available);
      break;
    
    case 'geminiStreamChunk':
      // Streaming chunk from Gemini - update textarea in real-time
      if (message.text !== undefined) {
        setVariablesText(message.text);
        variablesEditor.classList.add('streaming');
        variablesEditor.classList.add('streaming-gemini');
        
        // Auto-scroll to bottom to show latest content
        scrollVariablesEditorToBottom();
        
        // Update status to show streaming
        const geminiStatusEl = document.getElementById('ai-status');
        if (geminiStatusEl && !message.isDone) {
          geminiStatusEl.innerHTML = `${GEMINI_ICON_SVG} Generating...`;
        }
        
        // Auto-resize as content grows
        autoResizeVariablesSection();
      }
      break;
    
    case 'geminiGeneratedData':
      // Gemini data generation complete
      variablesEditor.classList.remove('streaming');
      variablesEditor.classList.remove('streaming-gemini');
      
      const geminiGenerateBtnEl = document.getElementById('gemini-generate-btn');
      if (geminiGenerateBtnEl) {
        geminiGenerateBtnEl.classList.remove('loading');
        
        if (message.error) {
          // Show error state briefly
          geminiGenerateBtnEl.classList.add('error');
          hideAIStatus(false, 'gemini');
          setTimeout(() => {
            geminiGenerateBtnEl.classList.remove('error');
          }, 2000);
        } else {
          geminiGenerateBtnEl.classList.add('success');
          hideAIStatus(true, 'gemini');
          setTimeout(() => {
            geminiGenerateBtnEl.classList.remove('success');
          }, 1000);
        }
      }
      
      if (message.generatedData) {
        // Set final formatted JSON
        setVariablesText(JSON.stringify(message.generatedData, null, 2));
        validateJsonAndShowError();
        autoResizeVariablesSection();
        debouncedGhostSave();
        if (autoRerender) {
          await update();
        }
      }
      break;
    
    case 'geminiKeyUpdated':
      // Key was added or removed - update UI
      updateGeminiButtonVisibility(message.available);
      break;
    
    case 'aiDebugStreamChunk':
      // Streaming chunk from AI debug - show in panel
      if (message.text !== undefined && aiDebugContent) {
        aiDebugContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word; margin: 0; font-family: var(--vscode-editor-font-family); font-size: 11px; color: var(--vscode-descriptionForeground);">${escapeHtml(message.text)}</pre>`;
        aiDebugContent.classList.add('streaming');
        aiDebugContent.classList.remove('loading');
      }
      break;
    
    case 'aiDebugResult':
      // AI debug analysis complete
      const aiDebugBtnEl = document.getElementById('ai-debug-btn');
      if (aiDebugBtnEl) {
        aiDebugBtnEl.classList.remove('loading');
      }
      
      if (message.error) {
        // Show error in panel
        hideAIStatus(false, message.provider || 'copilot');
        if (aiDebugContent) {
          aiDebugContent.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">
            <i class="codicon codicon-error" style="font-size: 24px; margin-bottom: 8px;"></i>
            <div>Failed to analyze error</div>
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.8;">${escapeHtml(message.error)}</div>
          </div>`;
          aiDebugContent.classList.remove('loading', 'streaming');
        }
      } else if (message.result) {
        // Show success and render result
        hideAIStatus(true, message.provider || 'copilot');
        renderDebugResult(message.result);
      }
      break;
    
    case 'showVariableInspector':
      // Open the variable inspector panel
      if (inspectorPanel) {
        inspectorPanel.classList.add('active');
        refreshInspectorTree();
      }
      break;
    
    case 'dependencyGraphData':
      // Received dependency graph data from extension
      if (message.graph) {
        showDependencyGraph(message.graph);
      }
      break;
  }
}

/* ===== TEMPLATE DEPENDENCY GRAPH ===== */

function showDependencyGraph(graph) {
  const panel = document.getElementById('dependency-graph-panel');
  const container = document.getElementById('graph-container');
  
  if (!panel || !container) return;
  
  panel.classList.add('active');
  
  // Build HTML for graph
  let html = '';
  
  if (graph.hasCircularDeps) {
    html += `
      <div class="graph-warning">
        <i class="codicon codicon-warning"></i>
        <span><strong>Warning:</strong> Circular dependencies detected!</span>
      </div>
    `;
  }
  
  if (graph.nodes.length === 0) {
    html += '<div style="color: var(--vscode-descriptionForeground); padding: 20px; text-align: center;">No template dependencies found.</div>';
  } else {
    // Group nodes by depth
    const byDepth = new Map();
    for (const node of graph.nodes) {
      if (!byDepth.has(node.depth)) {
        byDepth.set(node.depth, []);
      }
      byDepth.get(node.depth).push(node);
    }
    
    // Sort by depth
    const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
    
    for (const depth of depths) {
      const nodes = byDepth.get(depth);
      const levelLabel = depth === 0 ? 'Root Template' : `Level ${depth}`;
      
      html += `<div class="graph-level">`;
      html += `<div class="graph-level-label">${levelLabel}</div>`;
      
      for (const node of nodes) {
        const nodeClass = depth === 0 ? 'graph-node root' : (node.exists ? 'graph-node' : 'graph-node missing');
        const icon = node.exists ? 'file' : 'error';
        
        html += `
          <div class="${nodeClass}" data-template="${node.id}">
            <i class="codicon codicon-${icon}"></i>
            <span>${node.label}</span>
          </div>
        `;
        
        // Show outgoing edges
        const outgoingEdges = graph.edges.filter(e => e.from === node.id);
        if (outgoingEdges.length > 0) {
          for (const edge of outgoingEdges) {
            html += `
              <div class="graph-edge">
                <i class="codicon codicon-arrow-right"></i>
                <span class="graph-edge-type">${edge.type}</span>
                ${edge.to}
              </div>
            `;
          }
        }
      }
      
      html += `</div>`;
    }
  }
  
  container.innerHTML = html;
  
  // Add click handlers to navigate to templates
  const templateNodes = container.querySelectorAll('.graph-node');
  templateNodes.forEach(node => {
    const templateName = node.getAttribute('data-template');
    if (templateName && templateName !== 'main') {
      node.addEventListener('click', () => {
        vscode.postMessage({
          type: 'openTemplate',
          templateName: templateName
        });
      });
    }
  });
}

const showGraphBtn = document.getElementById('show-graph-btn');
const closeGraphBtn = document.getElementById('close-graph-btn');
const graphPanel = document.getElementById('dependency-graph-panel');

if (showGraphBtn) {
  showGraphBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'requestDependencyGraph' });
  });
}

if (closeGraphBtn) {
  closeGraphBtn.addEventListener('click', () => {
    if (graphPanel) graphPanel.classList.remove('active');
  });
}

/* ===== VARIABLE INSPECTOR ===== */

let expandedPaths = new Set();

function buildVariableTree(obj, path = '', parentIsArray = false) {
  const tree = [];
  
  if (obj === null || obj === undefined) {
    return tree;
  }
  
  if (typeof obj !== 'object') {
    return tree;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`;
      tree.push({
        key: `[${index}]`,
        value: item,
        type: getValueType(item),
        path: itemPath,
        isExpandable: typeof item === 'object' && item !== null,
        isArrayItem: true,
        arrayIndex: index,
        children: buildVariableTree(item, itemPath, true)
      });
    });
  } else {
    Object.keys(obj).forEach(key => {
      const itemPath = path ? `${path}.${key}` : key;
      tree.push({
        key: key,
        value: obj[key],
        type: getValueType(obj[key]),
        path: itemPath,
        isExpandable: typeof obj[key] === 'object' && obj[key] !== null,
        isArrayItem: false,
        children: buildVariableTree(obj[key], itemPath, false)
      });
    });
  }
  
  return tree;
}

function getValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `Array[${value.length}]`;
  if (typeof value === 'object') return `Object{${Object.keys(value).length}}`;
  return typeof value;
}

function getValuePreview(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return `{${Object.keys(value).length} props}`;
  return String(value);
}

function renderTreeNode(node, depth = 0) {
  const isExpanded = expandedPaths.has(node.path);
  const indent = depth * 16;
  const isArray = Array.isArray(node.value);
  
  let html = `
    <div class="tree-node" data-path="${node.path}">
      <div class="tree-node-header" style="padding-left: ${indent}px;">
        ${node.isExpandable ? `
          <i class="codicon codicon-chevron-right tree-expand-icon ${isExpanded ? 'expanded' : ''}"></i>
        ` : '<span class="tree-indent"></span>'}
        <div class="tree-node-label">
          <span class="tree-node-key">${node.key}</span>
          <span class="tree-node-type">${node.type}</span>
          ${!node.isExpandable ? `<span class="tree-node-value ${node.type}">${getValuePreview(node.value)}</span>` : ''}
        </div>
        <div class="tree-node-actions">
          ${isArray ? `
            <button class="tree-action-btn tree-array-add-btn" title="Add item to array">
              <i class="codicon codicon-add"></i>
            </button>
          ` : ''}
          ${node.isArrayItem ? `
            <button class="tree-action-btn tree-delete-btn" title="Delete from array">
              <i class="codicon codicon-trash"></i>
            </button>
          ` : ''}
          ${!node.isExpandable ? `
            <button class="tree-action-btn tree-edit-btn" title="Edit value">
              <i class="codicon codicon-edit"></i>
            </button>
          ` : ''}
        </div>
      </div>
  `;
  
  if (node.isExpandable && node.children) {
    html += `<div class="tree-children ${isExpanded ? 'expanded' : ''}">`;
    node.children.forEach(child => {
      html += renderTreeNode(child, depth + 1);
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  return html;
}

function refreshInspectorTree() {
  const inspectorTree = document.getElementById('inspector-tree');
  if (!inspectorTree) return;
  
  let variables = {};
  try {
    variables = JSON.parse(variablesEditor.value || '{}');
  } catch (e) {
    inspectorTree.innerHTML = `
      <div style="color: var(--vscode-errorForeground); padding: 16px; text-align: center;">
        <i class="codicon codicon-error"></i> Invalid JSON
      </div>
    `;
    return;
  }
  
  const tree = buildVariableTree(variables);
  
  if (tree.length === 0) {
    inspectorTree.innerHTML = `
      <div style="color: var(--vscode-descriptionForeground); padding: 16px; text-align: center;">
        No variables defined
      </div>
    `;
    return;
  }
  
  // Auto-expand all nodes on first render if expandedPaths is empty
  if (expandedPaths.size === 0) {
    const expandAll = (nodes) => {
      nodes.forEach(node => {
        if (node.isExpandable) {
          expandedPaths.add(node.path);
          if (node.children) {
            expandAll(node.children);
          }
        }
      });
    };
    expandAll(tree);
  }
  
  let html = '';
  tree.forEach(node => {
    html += renderTreeNode(node, 0);
  });
  
  inspectorTree.innerHTML = html;
  
  // Add event listeners
  attachTreeEventListeners();
}

function attachTreeEventListeners() {
  const inspectorTree = document.getElementById('inspector-tree');
  if (!inspectorTree) return;
  
  // Expand/collapse
  inspectorTree.querySelectorAll('.tree-expand-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const node = icon.closest('.tree-node');
      const path = node.getAttribute('data-path');
      
      if (expandedPaths.has(path)) {
        expandedPaths.delete(path);
      } else {
        expandedPaths.add(path);
      }
      
      refreshInspectorTree();
    });
  });
  
  // Add item to array
  inspectorTree.querySelectorAll('.tree-array-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const node = btn.closest('.tree-node');
      const path = node.getAttribute('data-path');
      
      const currentArray = getValueAtPath(path);
      if (!Array.isArray(currentArray)) return;
      
      // Determine default value based on array type
      let newValue = '';
      if (currentArray.length > 0) {
        const lastItem = currentArray[currentArray.length - 1];
        if (typeof lastItem === 'number') newValue = 0;
        else if (typeof lastItem === 'boolean') newValue = false;
        else if (typeof lastItem === 'object' && lastItem !== null) {
          newValue = Array.isArray(lastItem) ? [] : {};
        }
      }
      
      currentArray.push(newValue);
      setValueAtPath(path, currentArray);
      
      // Update variables editor
      const variables = JSON.parse(getVariablesText() || '{}');
      setVariablesText(JSON.stringify(variables, null, 2), { emitInputEvent: true });
      debouncedGhostSave();
      autoResizeVariablesSection();
      
      // Expand the array to show new item
      expandedPaths.add(path);
      refreshInspectorTree();
      
      if (autoRerender) {
        update();
      }
    });
  });

  // Delete item from array
  inspectorTree.querySelectorAll('.tree-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const node = btn.closest('.tree-node');
      const path = node.getAttribute('data-path');
      
      // Extract parent path and index
      const match = path.match(/^(.+)\[(\d+)\]$/);
      if (!match) return;
      
      const parentPath = match[1];
      const index = parseInt(match[2]);
      
      const parentArray = getValueAtPath(parentPath);
      if (!Array.isArray(parentArray)) return;
      
      // Remove item
      parentArray.splice(index, 1);
      setValueAtPath(parentPath, parentArray);
      
      // Update variables editor
      const variables = JSON.parse(getVariablesText() || '{}');
      setVariablesText(JSON.stringify(variables, null, 2), { emitInputEvent: true });
      debouncedGhostSave();
      autoResizeVariablesSection();
      
      refreshInspectorTree();
      
      if (autoRerender) {
        update();
      }
    });
  });
  
  // Edit value (supports primitives and JSON editing for objects)
  inspectorTree.querySelectorAll('.tree-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const node = btn.closest('.tree-node');
      const path = node.getAttribute('data-path');
      const header = node.querySelector('.tree-node-header');
      
      // Get indent from header padding
      const headerStyle = window.getComputedStyle(header);
      const indent = parseInt(headerStyle.paddingLeft) || 0;
      
      const currentValue = getValueAtPath(path);
      const isObject = typeof currentValue === 'object' && currentValue !== null;
      
      // Create edit container
      const editContainer = document.createElement('div');
      editContainer.className = 'tree-edit-container';
      editContainer.style.cssText = `
        padding: 8px ${indent + 16}px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        margin: 4px 0;
      `;
      
      if (isObject) {
        // Multi-line textarea for objects/arrays
        const textarea = document.createElement('textarea');
        textarea.className = 'tree-edit-input';
        textarea.style.cssText = `
          width: 100%;
          min-height: 100px;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: none;
          outline: none;
          resize: vertical;
        `;
        textarea.value = JSON.stringify(currentValue, null, 2);
        editContainer.appendChild(textarea);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';
        
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'button-primary';
        saveBtn.style.cssText = 'flex: 1;';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'button-secondary';
        cancelBtn.style.cssText = 'flex: 1;';
        
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);
        editContainer.appendChild(buttonContainer);
        
        // Hide children while editing to avoid confusion
        const childrenContainer = node.querySelector('.tree-children');
        if (childrenContainer) {
          childrenContainer.style.display = 'none';
        }
        
        header.after(editContainer);
        textarea.focus();
        
        const saveEdit = () => {
          try {
            const newValue = JSON.parse(textarea.value);
            setValueAtPath(path, newValue);
            
            // Update variables editor
            const variables = JSON.parse(getVariablesText() || '{}');
            setVariablesText(JSON.stringify(variables, null, 2), { emitInputEvent: true });
            debouncedGhostSave();
            autoResizeVariablesSection();
            
            refreshInspectorTree();
            
            if (autoRerender) {
              update();
            }
          } catch (err) {
            textarea.style.borderColor = 'var(--vscode-inputValidation-errorBorder)';
            textarea.title = `Invalid JSON: ${err.message}`;
          }
        };
        
        saveBtn.addEventListener('click', saveEdit);
        cancelBtn.addEventListener('click', () => {
          editContainer.remove();
          if (childrenContainer) {
            childrenContainer.style.display = '';
          }
        });
        
      } else {
        // Single-line input for primitives
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-edit-input';
        input.style.cssText = `
          width: 100%;
          font-family: var(--vscode-editor-font-family);
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: none;
          outline: none;
          padding: 4px;
        `;
        input.value = typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue);
        
        editContainer.appendChild(input);
        header.after(editContainer);
        input.focus();
        input.select();
        
        const saveEdit = () => {
          let newValue = input.value;
          
          // Try to parse as JSON for numbers, booleans, etc.
          try {
            newValue = JSON.parse(newValue);
          } catch {
            // Keep as string if not valid JSON
          }
          
          setValueAtPath(path, newValue);
          
          // Update variables editor
          const variables = JSON.parse(getVariablesText() || '{}');
          setVariablesText(JSON.stringify(variables, null, 2), { emitInputEvent: true });
          debouncedGhostSave();
          autoResizeVariablesSection();
          
          refreshInspectorTree();
          
          if (autoRerender) {
            update();
          }
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saveEdit();
          } else if (e.key === 'Escape') {
            editContainer.remove();
          }
        });
      }
    });
  });
}

function getValueAtPath(path) {
  let variables = {};
  try {
    variables = JSON.parse(getVariablesText() || '{}');
  } catch {
    return undefined;
  }
  
  const parts = path.split(/\.|\[|\]/).filter(p => p);
  let current = variables;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

function setValueAtPath(path, value) {
  let variables = {};
  try {
    variables = JSON.parse(getVariablesText() || '{}');
  } catch {
    variables = {};
  }
  
  const parts = path.split(/\.|\[|\]/).filter(p => p);
  let current = variables;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
  setVariablesText(JSON.stringify(variables, null, 2), { emitInputEvent: true });
  debouncedGhostSave();
}

const showInspectorBtn = document.getElementById('show-inspector-btn');
const closeInspectorBtn = document.getElementById('close-inspector-btn');
const inspectorPanel = document.getElementById('variable-inspector-panel');
const collapseAllBtn = document.getElementById('collapse-all-btn');
const expandAllBtn = document.getElementById('expand-all-btn');

if (showInspectorBtn) {
  showInspectorBtn.addEventListener('click', () => {
    if (inspectorPanel) {
      inspectorPanel.classList.add('active');
      refreshInspectorTree();
    }
  });
}

if (closeInspectorBtn) {
  closeInspectorBtn.addEventListener('click', () => {
    if (inspectorPanel) inspectorPanel.classList.remove('active');
  });
}

if (collapseAllBtn) {
  collapseAllBtn.addEventListener('click', () => {
    expandedPaths.clear();
    refreshInspectorTree();
  });
}

if (expandAllBtn) {
  expandAllBtn.addEventListener('click', () => {
    // Expand all paths
    const inspectorTree = document.getElementById('inspector-tree');
    if (inspectorTree) {
      inspectorTree.querySelectorAll('.tree-node').forEach(node => {
        const path = node.getAttribute('data-path');
        if (path) expandedPaths.add(path);
      });
      refreshInspectorTree();
    }
  });
}

// Refresh inspector when variables change
variablesEditor.addEventListener('input', () => {
  if (inspectorPanel && inspectorPanel.classList.contains('active')) {
    // Debounce the refresh
    clearTimeout(variablesEditor.inspectorRefreshTimeout);
    variablesEditor.inspectorRefreshTimeout = setTimeout(() => {
      refreshInspectorTree();
    }, 500);
  }
});

// Listen for messages from the extension
window.addEventListener('message', async event => {
  const message = event.data;
  
  // Queue messages if Pyodide not initialized yet (except forceRender which needs initialized state)
  if (!isInitialized && message.type !== 'forceRender') {
    messageQueue.push(message);
    return;
  }
  
  await handleMessage(message);
});

// Footer toggle click handler - clicking disables the setting
if (whitespaceIndicators) {
  whitespaceIndicators.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target && target.classList && target.classList.contains('footer-toggle')) {
      const setting = target.getAttribute('data-setting');
      
      // Toggle the setting off
      switch (setting) {
        case 'Markdown':
          isMarkdownMode = false;
          trackSettingChange('Markdown', false);
          break;
        case 'Mermaid':
          isMermaidMode = false;
          trackSettingChange('Mermaid', false);
          break;
        case 'Auto-rerender':
          autoRerender = false;
          trackSettingChange('Auto-rerender', false);
          updateAutoRerenderToggle();
          break;
        case 'Show Whitespace':
          showWhitespace = false;
          trackSettingChange('Show Whitespace', false);
          break;
        case 'Cull Whitespace':
          cullWhitespace = false;
          trackSettingChange('Cull Whitespace', false);
          break;
        case 'Strip Blocks':
          stripBlockWhitespace = false;
          trackSettingChange('Strip Blocks', false);
          break;
      }
      
      updateWhitespaceIndicators();
      await update();
    }
  });
}

// Start Pyodide and initial render
setupPyodide();

