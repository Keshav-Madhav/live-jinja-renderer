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
const renderTimeHeader = /** @type {HTMLSpanElement | null} */ (document.getElementById('render-time-header'));
const sidebarRenderTime = /** @type {HTMLDivElement | null} */ (document.getElementById('sidebar-render-time'));
const renderTimeSidebar = /** @type {HTMLSpanElement | null} */ (document.getElementById('render-time-sidebar'));
const sidebarWhitespaceStatus = /** @type {HTMLDivElement | null} */ (document.getElementById('sidebar-whitespace-status'));
const whitespaceSidebar = /** @type {HTMLSpanElement | null} */ (document.getElementById('whitespace-status-sidebar'));
const sidebarTemplateStatus = /** @type {HTMLDivElement | null} */ (document.getElementById('sidebar-template-status'));
const templateSidebar = /** @type {HTMLSpanElement | null} */ (document.getElementById('template-status-sidebar'));
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

// Last render time for UI updates
let lastRenderTime = 0;

// Track order of enabled settings (most recent first)
let settingsEnableOrder = [];

// Pyodide setup
let pyodide = null;
let isInitialized = false;
let messageQueue = []; // Queue for messages received before initialization

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
    
    // Add data-line attribute for click handling (only if lineNo is valid)
    // Use the adjusted line number for click handling
    const lineAttr = adjustedLineNo !== null ? `data-line="${adjustedLineNo}"` : '';
    
    html += `<div class="output-row ${cycleClass} ${groupEndClass}" ${lineAttr}>
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

function updateErrorButton(container) {
  const errorButton = document.getElementById('error-goto-button');
  if (!errorButton) {
    console.warn('Error button not found');
    return;
  }
  
  const text = container.textContent || container.innerText;
  
  const lineMatches = [
    ...text.matchAll(/📍 Line (\d+)/g),
    ...text.matchAll(/line (\d+)/gi)
  ];
  
  if (lineMatches.length === 0) {
    errorButton.style.display = 'none';
    return;
  }
  
  const lineNumbers = Array.from(new Set(lineMatches.map(match => parseInt(match[1]))));
  
  if (lineNumbers.length > 0) {
    const lineNumber = lineNumbers[0];
    
    errorButton.style.display = 'flex';
    errorButton.onclick = () => {
      vscode.postMessage({
        type: 'goToLine',
        line: lineNumber,
        fileUri: currentFileUri,
        selectionRange: currentSelectionRange
      });
    };
  } else {
    errorButton.style.display = 'none';
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
 * - In normal mode: shows in output header
 * - When output is detached: shows in sidebar status
 */
function updateRenderTimeDisplay(renderTime) {
  // Store the render time for later updates (e.g., when detach state changes)
  if (renderTime !== undefined) {
    lastRenderTime = renderTime;
  }
  
  if (!showPerformanceMetrics || lastRenderTime === 0) {
    if (renderTimeHeader) renderTimeHeader.style.display = 'none';
    if (sidebarRenderTime) sidebarRenderTime.style.display = 'none';
    return;
  }
  
  const timeText = `${lastRenderTime}ms`;
  const isOutputDetached = document.body.classList.contains('detached-active');
  
  // Determine color class based on performance
  let colorClass = '';
  if (lastRenderTime > 1000) {
    colorClass = 'very-slow';
  } else if (lastRenderTime > 500) {
    colorClass = 'slow';
  }
  
  if (isOutputDetached && !isDetachedMode) {
    // Output is detached - show in sidebar
    if (renderTimeHeader) renderTimeHeader.style.display = 'none';
    if (sidebarRenderTime) sidebarRenderTime.style.display = 'block';
    if (renderTimeSidebar) {
      renderTimeSidebar.innerHTML = `<i class="codicon codicon-pulse"></i> Render time: ${timeText}`;
      renderTimeSidebar.className = 'render-time-sidebar' + (colorClass ? ' ' + colorClass : '');
    }
  } else if (!isDetachedMode) {
    // Normal mode - show in output header
    if (renderTimeHeader) {
      renderTimeHeader.textContent = `Render time: ${timeText}`;
      renderTimeHeader.className = 'render-time-header' + (colorClass ? ' ' + colorClass : '');
      renderTimeHeader.style.display = 'inline';
    }
    if (sidebarRenderTime) sidebarRenderTime.style.display = 'none';
  }
}

/**
 * Update settings indicators
 * Shows enabled settings in footer (or sidebar when detached)
 * Ordered by most recently enabled
 */
function updateWhitespaceIndicators() {
  const isOutputDetached = document.body.classList.contains('detached-active');
  
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
  
  if (isOutputDetached && !isDetachedMode) {
    // Show in sidebar when output is detached
    if (whitespaceIndicators) whitespaceIndicators.style.display = 'none';
    if (activeSettings.length > 0) {
      if (whitespaceSidebar) {
        whitespaceSidebar.innerHTML = activeSettings.join(' · ');
      }
      if (sidebarWhitespaceStatus) sidebarWhitespaceStatus.style.display = 'block';
    } else {
      if (whitespaceSidebar) whitespaceSidebar.innerHTML = '';
      if (sidebarWhitespaceStatus) sidebarWhitespaceStatus.style.display = 'none';
    }
  } else if (!isDetachedMode) {
    // Show in footer when not detached
    if (sidebarWhitespaceStatus) sidebarWhitespaceStatus.style.display = 'none';
    if (whitespaceIndicators) {
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
 */
function updateTemplateIndicator() {
  const templateIndicator = document.getElementById('template-indicator');
  const templateList = document.getElementById('template-list');
  const isOutputDetached = document.body.classList.contains('detached-active');
  
  // Ensure templateSummary has default values
  const summary = templateSummary || { enabled: false, count: 0, paths: [], error: null };
  
  // Build tooltip with ALL template names
  const allPaths = summary.paths || [];
  let tooltip = `Templates available for {% include %} and {% extends %}:\n\n`;
  tooltip += allPaths.map(p => `• ${p}`).join('\n');
  if (summary.searchDirs && summary.searchDirs.length > 0) {
    tooltip += `\n\nSearch directories:\n`;
    tooltip += summary.searchDirs.map(d => `• ${d}`).join('\n');
  }
  tooltip += '\n\nClick to reload templates';
  
  const contentHtml = summary.error
    ? `<i class="codicon codicon-warning" style="color: var(--vscode-inputValidation-warningBorder);"></i> Error: ${summary.error}`
    : `<i class="codicon codicon-file-symlink-directory" style="margin-right: 4px;"></i> ${summary.count} template${summary.count !== 1 ? 's' : ''} loaded`;
  
  const errorTooltip = summary.error ? `Template loading error: ${summary.error}` : tooltip;
  
  if (isOutputDetached && !isDetachedMode) {
    // Show in sidebar when output is detached (main window)
    if (templateIndicator) templateIndicator.style.display = 'none';
    
    if (summary.enabled && summary.count > 0 || summary.error) {
      if (templateSidebar) {
        templateSidebar.innerHTML = contentHtml;
      }
      if (sidebarTemplateStatus) {
        sidebarTemplateStatus.style.display = 'block';
        sidebarTemplateStatus.title = errorTooltip;
        if (summary.error) {
          sidebarTemplateStatus.classList.add('error');
        } else {
          sidebarTemplateStatus.classList.remove('error');
        }
      }
    } else {
      if (sidebarTemplateStatus) sidebarTemplateStatus.style.display = 'none';
    }
  } else if (!isDetachedMode) {
    // Show in footer when not detached (normal mode)
    if (sidebarTemplateStatus) sidebarTemplateStatus.style.display = 'none';
    
    if (!templateIndicator || !templateList) return;
    
    if (summary.error) {
      templateList.innerHTML = contentHtml;
      templateIndicator.style.display = 'block';
      templateIndicator.classList.add('error');
      templateIndicator.title = errorTooltip;
    } else if (summary.enabled && summary.count > 0) {
      templateList.innerHTML = contentHtml;
      templateIndicator.style.display = 'block';
      templateIndicator.classList.remove('error');
      templateIndicator.title = tooltip;
    } else {
      templateIndicator.style.display = 'none';
    }
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
    context = JSON.parse(variablesEditor.value || '{}');
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
    
    // Update render time and whitespace indicators
    updateRenderTimeDisplay(renderTime);
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
      
      if (showWhitespace) {
        // renderWhitespace now handles parsing markers and culling
        outputDisplay.innerHTML = renderWhitespace(result);
        if (isError) {
          outputDisplay.classList.add('error');
          updateErrorButton(outputDisplay);
        } else {
          outputDisplay.classList.remove('error');
          const errorButton = document.getElementById('error-goto-button');
          if (errorButton) errorButton.style.display = 'none';
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
          updateErrorButton(outputDisplay);
        } else {
          outputDisplay.classList.remove('error');
          const errorButton = document.getElementById('error-goto-button');
          if (errorButton) errorButton.style.display = 'none';
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

const debouncedGhostSave = debounce(ghostSaveVariables, 300);

function autoResizeVariablesSection() {
  if (!variablesEditor) {
    console.warn('Variables editor not found for resize');
    return;
  }
  
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
  
  if (!variablesSection || !outputSection) {
    console.warn('Cannot auto-resize: required DOM elements not found');
    return;
  }
  
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
    trackSettingChange('Auto-rerender', autoRerender);
    updateAutoRerenderToggle();
    updateWhitespaceIndicators();
    
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

// Extensions indicator click handler
if (extensionsIndicator) {
  extensionsIndicator.addEventListener('click', () => {
    vscode.postMessage({ type: 'executeCommand', command: 'live-jinja-tester.openExtensionSettings' });
  });
}

// Template indicator click handler - toggle dropdown
const templateIndicatorEl = document.getElementById('template-indicator');
const templateDropdown = document.getElementById('template-dropdown');

if (templateIndicatorEl && templateDropdown) {
  templateIndicatorEl.addEventListener('click', (e) => {
    // Don't toggle if clicking on reload button inside dropdown
    if (e.target.closest('.template-dropdown-reload')) {
      return;
    }
    
    const isExpanded = templateIndicatorEl.classList.toggle('expanded');
    templateDropdown.style.display = isExpanded ? 'block' : 'none';
    
    if (isExpanded) {
      // Populate dropdown with templates
      const summary = templateSummary || { paths: [], searchDirs: [] };
      const allPaths = summary.paths || [];
      
      let html = '<div class="template-dropdown-header">Available Templates</div>';
      
      if (allPaths.length === 0) {
        html += '<div class="template-dropdown-item" style="opacity: 0.6; cursor: default;">No templates loaded</div>';
      } else {
        allPaths.forEach(p => {
          html += `<div class="template-dropdown-item template-file" data-path="${p}" title="Click to open: ${p}">${p}</div>`;
        });
      }
      
      if (summary.searchDirs && summary.searchDirs.length > 0) {
        html += '<div class="template-dropdown-header">Search Directories</div>';
        summary.searchDirs.forEach(d => {
          html += `<div class="template-dropdown-item" style="opacity: 0.7;" title="${d}">${d}</div>`;
        });
      }
      
      html += '<div class="template-dropdown-reload"><i class="codicon codicon-refresh"></i> Reload Templates</div>';
      
      templateDropdown.innerHTML = html;
      
      // Add click handler for reload button
      const reloadBtn = templateDropdown.querySelector('.template-dropdown-reload');
      if (reloadBtn) {
        reloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ type: 'reloadTemplates' });
          templateIndicatorEl.classList.remove('expanded');
          templateDropdown.style.display = 'none';
        });
      }
      
      // Add click handlers for template files
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
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!templateIndicatorEl.contains(e.target)) {
      templateIndicatorEl.classList.remove('expanded');
      templateDropdown.style.display = 'none';
    }
  });
}

// Sidebar template status click handler - reload templates
if (sidebarTemplateStatus) {
  sidebarTemplateStatus.addEventListener('click', () => {
    vscode.postMessage({ type: 'reloadTemplates' });
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
        const variables = JSON.parse(variablesEditor.value || '{}');
        
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
        console.log('[Webview] Received replaceVariables:', { isDetachedMode, variables: message.extractedVariables });
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
          console.log('[Webview] Detached mode: Using variables directly');
          variablesEditor.value = JSON.stringify(message.extractedVariables, null, 2);
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
          
          variablesEditor.value = JSON.stringify(mergedVars, null, 2);
        }
        
        autoResizeVariablesSection();
        hideLoading();
        console.log('[Webview] About to call update()');
        await update();
        console.log('[Webview] Update complete');
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
        variablesEditor.value = JSON.stringify(message.variables, null, 2);
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
      updateTemplateIndicator();
      // Re-render with new templates if we have a template and auto-rerender is on
      if (autoRerender && currentTemplate) {
        await update();
      }
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
        console.log('[Webview] Hiding output - detached panel opened');
        document.body.classList.add('detached-active');
        // Update indicators to show in sidebar
        updateRenderTimeDisplay();
        updateWhitespaceIndicators();
        updateTemplateIndicator();
      }
      break;
    
    case 'showOutput':
      // Show output section when detached panel is closed
      if (!isDetachedMode && message.fileUri === currentFileUri) {
        console.log('[Webview] Showing output - detached panel closed');
        document.body.classList.remove('detached-active');
        // Update indicators to show in footer
        updateRenderTimeDisplay();
        updateWhitespaceIndicators();
        updateTemplateIndicator();
      }
      break;
  }
}

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

