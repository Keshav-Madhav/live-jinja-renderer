const vscode = require('vscode');
const { extractVariablesFromTemplate } = require('../utils/variableExtractor');
const { handleExportVariables } = require('../commands/importExportCommands');
const { loadTemplates, getTemplateSummary, watchTemplateChanges, usesExternalTemplates, extractReferencedTemplates } = require('../utils/templateLoader');
const { generateSmartData, analyzeTemplate } = require('../utils/smartDataGenerator');
const { generateWithLLMStreaming, isCopilotAvailable, setOpenAIApiKey, isOpenAIConfigured, validateOpenAIKey, generateWithOpenAIStreaming, setClaudeApiKey, isClaudeConfigured, validateClaudeKey, generateWithClaudeStreaming, setGeminiApiKey, isGeminiConfigured, validateGeminiKey, generateWithGeminiStreaming } = require('../utils/llmDataGenerator');
const { buildDependencyGraph, graphToText } = require('../utils/templateDependencyGraph');
const path = require('path');

// Secret storage key constants (shared with settingsCommands.js)
const OPENAI_API_KEY_SECRET = 'liveJinjaRenderer.openai.apiKey';
const CLAUDE_API_KEY_SECRET = 'liveJinjaRenderer.claude.apiKey';
const GEMINI_API_KEY_SECRET = 'liveJinjaRenderer.gemini.apiKey';

/**
 * Sets up webview with template rendering capabilities
 * @param {vscode.Webview} webview - The webview to set up
 * @param {vscode.TextEditor} editor - The active text editor
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {Object} selectionRange - Optional selection range {startLine, endLine}
 * @param {Object} intelliSenseManager - Optional IntelliSense manager to update with variables
 * @returns {vscode.Disposable} - The change document subscription
 */
function setupWebviewForEditor(webview, editor, context, selectionRange = null, intelliSenseManager = null) {
  // If selection range provided, extract only that portion
  let templateContent;
  
  if (selectionRange && selectionRange.startLine !== undefined && selectionRange.endLine !== undefined) {
    const doc = editor.document;
    const startPos = new vscode.Position(selectionRange.startLine, 0);
    const endLine = Math.min(selectionRange.endLine, doc.lineCount - 1);
    const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
    const range = new vscode.Range(startPos, endPos);
    templateContent = doc.getText(range);
  } else {
    templateContent = editor.document.getText();
  }
  
  let lastTemplate = templateContent;
  let lastFileUri = editor.document.uri.toString(); // Track the file URI
  let lastSelectionRange = selectionRange; // Track the selection range
  let isInitialLoad = true; // Track if this is the first load
  let currentDecoration = null; // Track active highlight decoration
  let decorationDisposables = []; // Track event listeners for decoration removal
  let selectionRangeDecoration = null; // Track selection range highlight
  let loadedTemplates = {}; // Track loaded templates for includes/extends
  let templateWatcher = null; // File watcher for template changes
  
  // Create subtle decoration for selection range highlighting
  const selectionRangeDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(100, 149, 237, 0.08)', // Very subtle blue tint
    isWholeLine: true,
    overviewRulerColor: 'rgba(100, 149, 237, 0.3)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
      backgroundColor: 'rgba(100, 149, 237, 0.05)' // Even more subtle in light theme
    },
    dark: {
      backgroundColor: 'rgba(100, 149, 237, 0.08)'
    }
  });
  
  // Apply selection range highlighting if applicable
  function applySelectionHighlight() {
    if (lastSelectionRange && lastSelectionRange.startLine !== undefined && lastSelectionRange.endLine !== undefined) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.toString() === lastFileUri) {
        const startPos = new vscode.Position(lastSelectionRange.startLine, 0);
        const endLine = Math.min(lastSelectionRange.endLine, activeEditor.document.lineCount - 1);
        const endPos = new vscode.Position(endLine, activeEditor.document.lineAt(endLine).text.length);
        const range = new vscode.Range(startPos, endPos);
        
        activeEditor.setDecorations(selectionRangeDecorationType, [range]);
        selectionRangeDecoration = selectionRangeDecorationType;
      }
    }
  }
  
  // Clear selection range highlighting
  function clearSelectionHighlight() {
    if (selectionRangeDecoration) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        activeEditor.setDecorations(selectionRangeDecoration, []);
      }
    }
  }
  
  // Apply initial highlight
  setTimeout(() => {
    applySelectionHighlight();
  }, 150);
  
  // Reapply highlight when switching back to this editor
  const activeEditorChangeSubscription = vscode.window.onDidChangeActiveTextEditor(activeEditor => {
    if (activeEditor && activeEditor.document.uri.toString() === lastFileUri) {
      // Small delay to ensure editor is fully active
      setTimeout(() => {
        applySelectionHighlight();
      }, 50);
    }
  });
  
  // Get current settings from VS Code configuration
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  
  // Try new setting names first, fallback to old names for backwards compatibility
  let enableMarkdown = config.get('rendering.enableMarkdown');
  if (enableMarkdown === undefined) enableMarkdown = config.get('enableMarkdown', false);
  
  let enableMermaid = config.get('rendering.enableMermaid');
  if (enableMermaid === undefined) enableMermaid = config.get('enableMermaid', false);
  
  const mermaidZoomSensitivity = config.get('rendering.mermaidZoomSensitivity', 0.05);
  
  let showWhitespace = config.get('rendering.showWhitespace');
  if (showWhitespace === undefined) showWhitespace = config.get('showWhitespace', true);
  
  let cullWhitespace = config.get('rendering.cullWhitespace');
  if (cullWhitespace === undefined) cullWhitespace = config.get('cullWhitespace', false);
  
  let autoRerender = config.get('rendering.autoRerender');
  if (autoRerender === undefined) autoRerender = config.get('autoRerender', true);
  
  const settings = {
    enableMarkdown,
    enableMermaid,
    mermaidZoomSensitivity,
    showWhitespace,
    cullWhitespace,
    autoRerender,
    autoExtractVariables: config.get('variables.autoExtract', true),
    ghostSaveEnabled: config.get('advanced.ghostSave', true),
    historyEnabled: config.get('history.enabled', true),
    historySize: config.get('history.size', 5),
    showPerformanceMetrics: config.get('advanced.showPerformanceMetrics', true),
    suggestExtensions: config.get('advanced.suggestExtensions', true),
    selectionRange: lastSelectionRange, // Include selection range in settings
    stripBlockWhitespace: config.get('environment.stripBlockWhitespace', false),
    extensions: config.get('extensions', {
      i18n: false,
      do: false,
      loopcontrols: false,
      with: false,
      autoescape: false,
      debug: false,
      custom: ''
    }),
    templates: {
      enableIncludes: config.get('templates.enableIncludes', true),
      searchPaths: config.get('templates.searchPaths', []),
      filePatterns: config.get('templates.filePatterns', ['**/*.jinja', '**/*.jinja2', '**/*.j2', '**/*.html', '**/*.txt']),
      maxFiles: config.get('templates.maxFiles', 100)
    }
  };
  
  // Track if we need external templates
  let needsExternalTemplates = usesExternalTemplates(lastTemplate);
  
  // Load templates for includes/extends support (only if needed)
  async function loadAndSendTemplates(forceCheck = false) {
    // Re-check if external templates are needed
    if (forceCheck) {
      needsExternalTemplates = usesExternalTemplates(lastTemplate);
    }
    
    // Extract which templates are actually used in the current template
    const usedTemplates = extractReferencedTemplates(lastTemplate);
    
    // Skip loading if template doesn't use external references
    if (!needsExternalTemplates) {
      // Send empty templates to webview
      webview.postMessage({
        type: 'updateTemplates',
        templates: {},
        summary: {
          enabled: false,
          count: 0,
          paths: [],
          searchDirs: [],
          error: null,
          skipped: true,
          reason: 'No include/extends/import/from tags detected'
        },
        usedTemplates: []
      });
      return;
    }
    
    const filePath = editor.document.uri.fsPath;
    const result = await loadTemplates(filePath);
    loadedTemplates = result.templates;
    const summary = getTemplateSummary(result);
    
    webview.postMessage({
      type: 'updateTemplates',
      templates: loadedTemplates,
      summary: summary,
      usedTemplates: usedTemplates
    });
  }
  
  // Setup template watcher (only if needed, and lazily)
  function ensureTemplateWatcher() {
    if (!templateWatcher && needsExternalTemplates) {
      templateWatcher = watchTemplateChanges(async () => {
        // Reload templates when any template file changes
        await loadAndSendTemplates();
      });
    }
  }
  
  // Debounced function to send used templates update
  // Prevents excessive updates on rapid typing
  let usedTemplatesTimeout = null;
  function debouncedSendUsedTemplates() {
    if (usedTemplatesTimeout) {
      clearTimeout(usedTemplatesTimeout);
    }
    usedTemplatesTimeout = setTimeout(() => {
      const currentUsedTemplates = extractReferencedTemplates(lastTemplate);
      webview.postMessage({
        type: 'updateUsedTemplates',
        usedTemplates: currentUsedTemplates
      });
    }, 150); // 150ms debounce for responsive but not excessive updates
  }
  
  // Send initial settings to webview
  setTimeout(async () => {
    // Check if Copilot is available
    const copilotAvailable = await isCopilotAvailable();
    
    // Check if OpenAI is configured and valid (using SecretStorage)
    let openaiAvailable = false;
    try {
      const storedKey = await context.secrets.get(OPENAI_API_KEY_SECRET);
      if (storedKey) {
        // Set the key in llmDataGenerator for use
        setOpenAIApiKey(storedKey);
        // Validate the key
        openaiAvailable = await validateOpenAIKey(storedKey);
      }
    } catch (err) {
      console.error('Error checking OpenAI API key:', err);
    }
    
    // Check if Claude is configured and valid (using SecretStorage)
    let claudeAvailable = false;
    try {
      const storedClaudeKey = await context.secrets.get(CLAUDE_API_KEY_SECRET);
      if (storedClaudeKey) {
        // Set the key in llmDataGenerator for use
        setClaudeApiKey(storedClaudeKey);
        // Validate the key
        claudeAvailable = await validateClaudeKey(storedClaudeKey);
      }
    } catch (err) {
      console.error('Error checking Claude API key:', err);
    }
    
    // Check if Gemini is configured and valid (using SecretStorage)
    let geminiAvailable = false;
    try {
      const storedGeminiKey = await context.secrets.get(GEMINI_API_KEY_SECRET);
      if (storedGeminiKey) {
        // Set the key in llmDataGenerator for use
        setGeminiApiKey(storedGeminiKey);
        // Validate the key
        geminiAvailable = await validateGeminiKey(storedGeminiKey);
      }
    } catch (err) {
      console.error('Error checking Gemini API key:', err);
    }
    
    webview.postMessage({
      type: 'updateSettings',
      settings: settings,
      copilotAvailable: copilotAvailable,
      openaiAvailable: openaiAvailable,
      claudeAvailable: claudeAvailable,
      geminiAvailable: geminiAvailable
    });
    
    // Load templates after settings (only if needed)
    await loadAndSendTemplates();
    ensureTemplateWatcher();
  }, 100);
  
  // Update template if the original file changes
  // The webview will decide whether to auto-render based on autoRerender setting
  const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
    // Early return if not the active editor to avoid unnecessary processing
    if (e.document.uri.toString() !== editor.document.uri.toString()) {
      return;
    }
    
    if (e.document.uri.toString() === editor.document.uri.toString()) {
      // Adjust selection range dynamically if changes occur within the selected range
      if (lastSelectionRange && lastSelectionRange.startLine !== undefined && lastSelectionRange.endLine !== undefined) {
        // Process each content change to adjust the selection range
        for (const change of e.contentChanges) {
          const changeStartLine = change.range.start.line;
          const changeStartCol = change.range.start.character;
          const changeEndLine = change.range.end.line;
          const newText = change.text;
          
          // Count lines in the change
          const oldLineCount = changeEndLine - changeStartLine;
          const newLineCount = (newText.match(/\n/g) || []).length;
          const lineDelta = newLineCount - oldLineCount;
          
          // Special case: change at the very start of the first line (column 0)
          // This should shift the selection, not expand it
          if (changeStartLine === lastSelectionRange.startLine && changeStartCol === 0 && lineDelta !== 0) {
            // Shift both start and end
            lastSelectionRange.startLine += lineDelta;
            lastSelectionRange.endLine += lineDelta;
          }
          // Change is within the selected range (but not at the very start) - expand/shrink
          else if (changeStartLine >= lastSelectionRange.startLine && changeStartLine <= lastSelectionRange.endLine) {
            // Change is within the selected range - adjust endLine
            lastSelectionRange.endLine = Math.max(
              lastSelectionRange.startLine,
              lastSelectionRange.endLine + lineDelta
            );
          } 
          // Change is before the selected range - shift both start and end
          else if (changeStartLine < lastSelectionRange.startLine) {
            lastSelectionRange.startLine += lineDelta;
            lastSelectionRange.endLine += lineDelta;
          }
        }
        
        // Ensure range is valid
        lastSelectionRange.endLine = Math.max(
          lastSelectionRange.startLine,
          Math.min(lastSelectionRange.endLine, e.document.lineCount - 1)
        );
        lastSelectionRange.startLine = Math.max(0, lastSelectionRange.startLine);
        
        // Validate range is still meaningful
        if (lastSelectionRange.startLine > lastSelectionRange.endLine) {
          console.warn('Invalid selection range detected after document changes, resetting');
          lastSelectionRange = null;
        }
      }
      
      // Extract only the selected range if applicable
      if (lastSelectionRange && lastSelectionRange.startLine !== undefined && lastSelectionRange.endLine !== undefined) {
        const doc = e.document;
        const startPos = new vscode.Position(lastSelectionRange.startLine, 0);
        const endLine = Math.min(lastSelectionRange.endLine, doc.lineCount - 1);
        const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
        const range = new vscode.Range(startPos, endPos);
        lastTemplate = doc.getText(range);
      } else {
        lastTemplate = e.document.getText();
      }
      
      // Clear error highlight on document change
      clearHighlight();
      
      // Reapply selection range highlight (if applicable)
      setTimeout(() => {
        applySelectionHighlight();
      }, 50);
      
      // Check if external templates usage changed and reload if needed
      const previouslyNeededTemplates = needsExternalTemplates;
      needsExternalTemplates = usesExternalTemplates(lastTemplate);
      
      // If template now needs external templates but didn't before, load them
      if (needsExternalTemplates && !previouslyNeededTemplates) {
        loadAndSendTemplates();
        ensureTemplateWatcher();
      } else if (!needsExternalTemplates && previouslyNeededTemplates) {
        // If template no longer needs external templates, send empty
        loadAndSendTemplates();
      } else if (needsExternalTemplates) {
        // Template still uses external templates - send updated usedTemplates list (debounced)
        debouncedSendUsedTemplates();
      }
      
      // Send updated template to the webview (without auto-extraction)
      webview.postMessage({ 
        type: 'updateTemplate',
        template: lastTemplate,
        fileUri: lastFileUri,
        selectionRange: lastSelectionRange
      });
    }
  });
  
  // Helper function to clear the current highlight
  function clearHighlight() {
    if (currentDecoration) {
      currentDecoration.dispose();
      currentDecoration = null;
    }
    // Dispose all decoration-related event listeners
    decorationDisposables.forEach(d => d.dispose());
    decorationDisposables = [];
  }
  
  // Handle messages from the webview
  const messageSubscription = webview.onDidReceiveMessage(
    async message => {
      switch (message.type) {
        case 'ready':
          // On initial load or forced refresh, auto-extract variables if enabled
          const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
          const autoExtract = config.get('variables.autoExtract', true);
          
          if ((isInitialLoad || message.force) && autoExtract) {
            const extractedVars = extractVariablesFromTemplate(lastTemplate);
            
            // Try to load ghost-saved variables for this file (with selection range)
            const ghostSaveEnabled = config.get('advanced.ghostSave', true);
            const ghostVariables = context.workspaceState.get('jinjaGhostVariables', {});
            const ghostKey = lastSelectionRange 
              ? `${lastFileUri}:${lastSelectionRange.startLine}-${lastSelectionRange.endLine}`
              : lastFileUri;
            const ghostVars = (ghostSaveEnabled && ghostVariables[ghostKey]) || null;
            
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              extractedVariables: extractedVars,
              ghostVariables: ghostVars,
              fileUri: lastFileUri,
              selectionRange: lastSelectionRange
            });
            // Only mark as no longer initial load if not forced
            // This allows repeated force refreshes to work
            if (!message.force) {
              isInitialLoad = false;
            }
          } else {
            // Subsequent loads or auto-extract disabled: just send template without extraction
            webview.postMessage({
              type: 'updateTemplate',
              template: lastTemplate,
              fileUri: lastFileUri,
              selectionRange: lastSelectionRange
            });
          }
          return;
        
        case 'reextractVariables':
          // Extract variables from the current template
          const reextractedVars = extractVariablesFromTemplate(lastTemplate);
          
          // Update IntelliSense with newly extracted variables
          if (intelliSenseManager && reextractedVars) {
            intelliSenseManager.updateVariables(reextractedVars);
          }
          
          // Send fresh extraction (this will replace existing variables)
          webview.postMessage({
            type: 'replaceVariables',
            extractedVariables: reextractedVars
          });
          return;
        
        case 'copyToClipboard':
          // Copy text to clipboard (sent from webview)
          try {
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Output copied to clipboard');
          } catch (err) {
            vscode.window.showErrorMessage('Failed to copy output to clipboard');
            console.error('Copy failed:', err);
          }
          return;
        
        case 'outputCopied':
          // Legacy message - show confirmation when output is copied
          vscode.window.showInformationMessage('Output copied to clipboard');
          return;
        
        case 'enableExtension':
          // Enable an extension from the webview suggestion
          try {
            const extensionKey = message.extension;
            const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
            const currentExtensions = config.get('extensions', {});
            
            // Enable the requested extension
            currentExtensions[extensionKey] = true;
            
            await config.update('extensions', currentExtensions, vscode.ConfigurationTarget.Global);
            
            // Send updated settings back to webview
            webview.postMessage({
              type: 'extensionEnabled',
              extension: extensionKey,
              settings: {
                extensions: currentExtensions
              }
            });
            
            vscode.window.showInformationMessage(`✅ Enabled ${extensionKey} extension`);
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to enable extension: ${err.message}`);
            console.error('Enable extension failed:', err);
          }
          return;
        
        case 'saveVariables':
          // Save variables preset
          try {
            const presetName = message.presetName;
            const variables = message.variables;
            
            // Get existing presets
            const savedPresets = context.globalState.get('jinjaVariablePresets', {});
            
            // Save new preset
            savedPresets[presetName] = variables;
            await context.globalState.update('jinjaVariablePresets', savedPresets);
            
            vscode.window.showInformationMessage(`Saved preset: ${presetName}`);
          } catch (err) {
            vscode.window.showErrorMessage('Failed to save variables preset');
            console.error('Save failed:', err);
          }
          return;
        
        case 'ghostSaveVariables':
          // Ghost save variables for the current file (automatic background save)
          try {
            // Check if ghost save is enabled
            const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
            const ghostSaveEnabled = config.get('advanced.ghostSave', true);
            
            if (!ghostSaveEnabled) {
              // Ghost save is disabled, skip silently
              return;
            }
            
            const fileUri = message.fileUri;
            const variables = message.variables;
            const msgSelectionRange = message.selectionRange;
            
            // Update IntelliSense with the edited variables
            if (intelliSenseManager && variables) {
              intelliSenseManager.updateVariables(variables);
            }
            
            // Notify detached panels about variable updates
            if (fileUri) {
                vscode.commands.executeCommand('live-jinja-tester.notifyDetached', fileUri, variables);
            }
            
            if (fileUri) {
              // Get existing ghost variables
              const ghostVariables = context.workspaceState.get('jinjaGhostVariables', {});
              
              // Create unique key: include selection range if present
              const ghostKey = msgSelectionRange 
                ? `${fileUri}:${msgSelectionRange.startLine}-${msgSelectionRange.endLine}`
                : fileUri;
              
              // Save variables for this file (with optional selection range)
              ghostVariables[ghostKey] = variables;
              await context.workspaceState.update('jinjaGhostVariables', ghostVariables);
              
              // Silent save - no notification
            }
          } catch (err) {
            console.error('Ghost save failed:', err);
          }
          return;
        
        case 'detachOutput':
          // Open a detached output window
          try {
            const fileUri = message.fileUri;
            const variables = message.variables;
            
            if (fileUri) {
                vscode.commands.executeCommand('live-jinja-tester.openDetached', fileUri, variables, lastSelectionRange);
            }
          } catch (err) {
            vscode.window.showErrorMessage('Failed to detach output window');
            console.error('Detach failed:', err);
          }
          return;

        case 'requestVariablesForExport':
          // Handle export request from webview
          try {
            const exportType = message.exportType;
            const variables = message.variables;
            await handleExportVariables(variables, exportType, lastFileUri);
          } catch (err) {
            vscode.window.showErrorMessage('Failed to export variables');
            console.error('Export failed:', err);
          }
          return;
        
        case 'showSaveQuickPick':
          // Show native VS Code quick pick for save/export options
          try {
            const variables = message.variables;
            
            const saveOptions = [
              {
                label: '$(save) Save Preset',
                description: 'Save as a named preset for later use',
                action: 'preset'
              },
              {
                label: '$(export) Export to JSON File',
                description: 'Save as a formatted JSON file',
                action: 'file'
              },
              {
                label: '$(clippy) Copy to Clipboard',
                description: 'Copy to clipboard as JSON',
                action: 'clipboard'
              }
            ];
            
            const selected = await vscode.window.showQuickPick(saveOptions, {
              placeHolder: 'Choose how to save variables',
              title: 'Save Variables'
            });
            
            if (selected) {
              if (selected.action === 'preset') {
                await vscode.commands.executeCommand('live-jinja-tester.saveVariables');
              } else {
                await handleExportVariables(variables, selected.action, lastFileUri);
              }
            }
          } catch (err) {
            vscode.window.showErrorMessage('Failed to save variables');
            console.error('Save quick pick failed:', err);
          }
          return;
        
        case 'showLoadQuickPick':
          // Show native VS Code quick pick for load/import options
          try {
            const loadOptions = [
              {
                label: '$(folder-opened) Load Saved Preset',
                description: 'Load a previously saved preset',
                command: 'live-jinja-tester.loadVariables'
              },
              {
                label: '$(file-code) Import from Workspace',
                description: 'Choose from JSON files in your workspace',
                command: 'live-jinja-tester.importVariablesFromWorkspace'
              },
              {
                label: '$(folder) Import from File Browser',
                description: 'Browse and select any JSON file',
                command: 'live-jinja-tester.importVariablesFromFile'
              }
            ];
            
            const selected = await vscode.window.showQuickPick(loadOptions, {
              placeHolder: 'Choose how to load variables',
              title: 'Load Variables'
            });
            
            if (selected) {
              await vscode.commands.executeCommand(selected.command);
            }
          } catch (err) {
            console.error('Load quick pick failed:', err);
          }
          return;
        
        case 'showError':
          // Show error message from webview
          vscode.window.showErrorMessage(message.message || 'An error occurred');
          return;
        
        case 'executeCommand':
          // Execute a VS Code command from webview
          if (message.command) {
            try {
              await vscode.commands.executeCommand(message.command);
            } catch (err) {
              console.error('Failed to execute command:', message.command, err);
            }
          }
          return;
        
        case 'reloadTemplates':
          // Reload templates for includes/extends (force-check if needed)
          try {
            await loadAndSendTemplates(true);
            ensureTemplateWatcher();
          } catch (err) {
            console.error('Failed to reload templates:', err);
          }
          return;
        
        case 'requestDependencyGraph':
          // Build and send dependency graph for current template
          try {
            const currentFilePath = editor.document.fileName;
            const templateResult = await loadTemplates(currentFilePath);
            const templateContent = selectionRange && selectionRange.startLine !== undefined && selectionRange.endLine !== undefined
              ? (() => {
                  const doc = editor.document;
                  const startPos = new vscode.Position(selectionRange.startLine, 0);
                  const endLine = Math.min(selectionRange.endLine, doc.lineCount - 1);
                  const endPos = new vscode.Position(endLine, doc.lineAt(endLine).text.length);
                  const range = new vscode.Range(startPos, endPos);
                  return doc.getText(range);
                })()
              : editor.document.getText();
            
            const graph = buildDependencyGraph(
              templateContent,
              templateResult.templates,
              'main'
            );
            
            webview.postMessage({
              type: 'dependencyGraphData',
              graph: graph
            });
          } catch (err) {
            console.error('Failed to build dependency graph:', err);
            vscode.window.showErrorMessage(`Failed to build dependency graph: ${err.message}`);
          }
          return;
        
        case 'openTemplate':
          // Open a template file from the dependency graph
          try {
            const templateName = message.templateName;
            if (!templateName) return;
            
            // Try to find the template file
            const currentFilePath = editor.document.fileName;
            const currentDir = path.dirname(currentFilePath);
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            // Search for template file
            const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
            const searchPaths = config.get('templates.searchPaths', []);
            const filePatterns = config.get('templates.filePatterns', ['**/*.jinja', '**/*.jinja2', '**/*.j2', '**/*.html', '**/*.txt']);
            
            let templatePath = null;
            
            // Try direct path relative to current file
            const directPath = path.join(currentDir, templateName);
            try {
              await vscode.workspace.fs.stat(vscode.Uri.file(directPath));
              templatePath = directPath;
            } catch {
              // File not found, continue searching
            }
            
            // Search in configured paths if not found
            if (!templatePath && searchPaths.length > 0) {
              for (const searchPath of searchPaths) {
                let searchDir;
                if (searchPath === '.' || searchPath === './') {
                  searchDir = currentDir;
                } else if (searchPath.startsWith('./') || searchPath.startsWith('../') || searchPath === '..') {
                  searchDir = path.resolve(currentDir, searchPath);
                } else if (path.isAbsolute(searchPath)) {
                  searchDir = searchPath;
                } else if (workspaceFolders && workspaceFolders.length > 0) {
                  searchDir = path.join(workspaceFolders[0].uri.fsPath, searchPath);
                }
                
                if (searchDir) {
                  const candidatePath = path.join(searchDir, templateName);
                  try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(candidatePath));
                    templatePath = candidatePath;
                    break;
                  } catch {
                    // Continue searching
                  }
                }
              }
            }
            
            // Search in workspace if still not found
            if (!templatePath && workspaceFolders && workspaceFolders.length > 0) {
              const pattern = new vscode.RelativePattern(workspaceFolders[0], `**/${templateName}`);
              const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
              if (files.length > 0) {
                templatePath = files[0].fsPath;
              }
            }
            
            if (templatePath) {
              const document = await vscode.workspace.openTextDocument(templatePath);
              await vscode.window.showTextDocument(document, {
                preview: false,
                viewColumn: vscode.ViewColumn.One
              });
            } else {
              vscode.window.showWarningMessage(`Template file not found: ${templateName}`);
            }
          } catch (err) {
            console.error('Failed to open template:', err);
            vscode.window.showErrorMessage(`Failed to open template: ${err.message}`);
          }
          return;
        
        case 'showError':
          // Show error message from webview
          vscode.window.showErrorMessage(message.message || 'An error occurred');
          return;
        
        case 'executeCommand':
          // Execute a VS Code command from webview
          if (message.command) {
            try {
              await vscode.commands.executeCommand(message.command);
            } catch (err) {
              console.error('Failed to execute command:', message.command, err);
            }
          }
          return;
        
        case 'reloadTemplates_old':
          // Reload templates for includes/extends (force-check if needed)
          try {
            await loadAndSendTemplates(true);
            ensureTemplateWatcher();
          } catch (err) {
            console.error('Failed to reload templates:', err);
          }
          return;
        
        case 'openTemplateFile':
          // Open a template file in the editor
          try {
            const templatePath = message.templatePath;
            if (templatePath) {
              // Get workspace root
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                const path = require('path');
                const fullPath = path.join(workspaceRoot, templatePath);
                const fileUri = vscode.Uri.file(fullPath);
                
                try {
                  const doc = await vscode.workspace.openTextDocument(fileUri);
                  await vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.One,
                    preserveFocus: false
                  });
                } catch (fileErr) {
                  // Try without workspace root (might be absolute or different structure)
                  console.warn('Failed to open with workspace root, trying current file directory');
                  const currentDir = require('path').dirname(editor.document.uri.fsPath);
                  const altPath = path.join(currentDir, templatePath);
                  const altUri = vscode.Uri.file(altPath);
                  const doc = await vscode.workspace.openTextDocument(altUri);
                  await vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.One,
                    preserveFocus: false
                  });
                }
              }
            }
          } catch (err) {
            console.error('Failed to open template file:', err);
            vscode.window.showErrorMessage(`Could not open template: ${message.templatePath}`);
          }
          return;
        
        case 'smartGenerateData':
          // Generate smart test data based on variable names and template patterns
          try {
            const currentVariables = message.currentVariables || {};
            const template = message.template || lastTemplate;
            
            // Analyze template for context (filters, iterables, etc.)
            const templateAnalysis = analyzeTemplate(template);
            
            // Generate smart data based on the structure and names
            const generatedData = generateSmartData(currentVariables, templateAnalysis);
            
            // Send back to webview
            webview.postMessage({
              type: 'smartGeneratedData',
              generatedData: generatedData
            });
            
            vscode.window.showInformationMessage('✨ Smart data generated!');
          } catch (err) {
            console.error('Smart data generation failed:', err);
            vscode.window.showErrorMessage(`Failed to generate data: ${err.message}`);
            
            // Send back empty so button can reset
            webview.postMessage({
              type: 'smartGeneratedData',
              generatedData: null
            });
          }
          return;
        
        case 'llmGenerateData':
          // Generate test data using Copilot LLM with streaming
          try {
            const currentVariables = message.currentVariables || {};
            const template = message.template || lastTemplate;
            
            // Check if Copilot is available
            const copilotAvailable = await isCopilotAvailable();
            if (!copilotAvailable) {
              vscode.window.showWarningMessage('GitHub Copilot is not available. Please ensure Copilot is installed and activated.');
              webview.postMessage({
                type: 'llmGeneratedData',
                generatedData: null,
                error: 'Copilot not available'
              });
              return;
            }
            
            // Generate data using LLM with streaming
            const generatedData = await generateWithLLMStreaming(
              currentVariables, 
              template,
              (partialText, isDone) => {
                // Send streaming chunks to webview
                webview.postMessage({
                  type: 'llmStreamChunk',
                  text: partialText,
                  isDone: isDone
                });
              }
            );
            
            // Send final parsed data
            webview.postMessage({
              type: 'llmGeneratedData',
              generatedData: generatedData
            });
          } catch (err) {
            console.error('LLM data generation failed:', err);
            vscode.window.showErrorMessage(`AI generation failed: ${err.message}`);
            
            // Send back error so button can reset
            webview.postMessage({
              type: 'llmGeneratedData',
              generatedData: null,
              error: err.message
            });
          }
          return;
        
        case 'openaiGenerateData':
          // Generate test data using OpenAI API with streaming
          try {
            const currentVariables = message.currentVariables || {};
            const template = message.template || lastTemplate;
            
            // Check if OpenAI is configured
            if (!isOpenAIConfigured()) {
              vscode.window.showWarningMessage('OpenAI API key not configured. Please add your API key in Settings.');
              webview.postMessage({
                type: 'openaiGeneratedData',
                generatedData: null,
                error: 'OpenAI not configured'
              });
              return;
            }
            
            // Generate data using OpenAI with streaming
            const generatedData = await generateWithOpenAIStreaming(
              currentVariables, 
              template,
              (partialText, isDone) => {
                // Send streaming chunks to webview
                webview.postMessage({
                  type: 'openaiStreamChunk',
                  text: partialText,
                  isDone: isDone
                });
              }
            );
            
            // Send final parsed data
            webview.postMessage({
              type: 'openaiGeneratedData',
              generatedData: generatedData
            });
          } catch (err) {
            console.error('OpenAI data generation failed:', err);
            vscode.window.showErrorMessage(`OpenAI generation failed: ${err.message}`);
            
            // Send back error so button can reset
            webview.postMessage({
              type: 'openaiGeneratedData',
              generatedData: null,
              error: err.message
            });
          }
          return;
        
        case 'claudeGenerateData':
          // Generate test data using Claude API with streaming
          try {
            const currentVariables = message.currentVariables || {};
            const template = message.template || lastTemplate;
            
            // Check if Claude is configured
            if (!isClaudeConfigured()) {
              vscode.window.showWarningMessage('Claude API key not configured. Please add your API key via the menu.');
              webview.postMessage({
                type: 'claudeGeneratedData',
                generatedData: null,
                error: 'Claude not configured'
              });
              return;
            }
            
            // Generate data using Claude with streaming
            const generatedData = await generateWithClaudeStreaming(
              currentVariables, 
              template,
              (partialText, isDone) => {
                // Send streaming chunks to webview
                webview.postMessage({
                  type: 'claudeStreamChunk',
                  text: partialText,
                  isDone: isDone
                });
              }
            );
            
            // Send final parsed data
            webview.postMessage({
              type: 'claudeGeneratedData',
              generatedData: generatedData
            });
          } catch (err) {
            console.error('Claude data generation failed:', err);
            vscode.window.showErrorMessage(`Claude generation failed: ${err.message}`);
            
            // Send back error so button can reset
            webview.postMessage({
              type: 'claudeGeneratedData',
              generatedData: null,
              error: err.message
            });
          }
          return;
        
        case 'geminiGenerateData':
          // Generate test data using Gemini API with streaming
          try {
            const currentVariables = message.currentVariables || {};
            const template = message.template || lastTemplate;
            
            // Check if Gemini is configured
            if (!isGeminiConfigured()) {
              vscode.window.showWarningMessage('Gemini API key not configured. Please add your API key via the menu.');
              webview.postMessage({
                type: 'geminiGeneratedData',
                generatedData: null,
                error: 'Gemini not configured'
              });
              return;
            }
            
            // Generate data using Gemini with streaming
            const generatedData = await generateWithGeminiStreaming(
              currentVariables, 
              template,
              (partialText, isDone) => {
                // Send streaming chunks to webview
                webview.postMessage({
                  type: 'geminiStreamChunk',
                  text: partialText,
                  isDone: isDone
                });
              }
            );
            
            // Send final parsed data
            webview.postMessage({
              type: 'geminiGeneratedData',
              generatedData: generatedData
            });
          } catch (err) {
            console.error('Gemini data generation failed:', err);
            vscode.window.showErrorMessage(`Gemini generation failed: ${err.message}`);
            
            // Send back error so button can reset
            webview.postMessage({
              type: 'geminiGeneratedData',
              generatedData: null,
              error: err.message
            });
          }
          return;
        
        
        case 'goToLine':
          // Navigate to specific line in the editor
          try {
            const lineNumber = message.line;
            const fileUri = message.fileUri;
            const selectWholeLine = message.selectWholeLine || false;
            
            if (typeof lineNumber !== 'number' || lineNumber <= 0) {
              throw new Error('Invalid line number');
            }
            
            if (!fileUri) {
              throw new Error('No file URI provided');
            }
            
            if (typeof lineNumber === 'number' && lineNumber > 0 && fileUri) {
              // Line numbers from webview are already adjusted for selection range
              const actualLineNumber = lineNumber;
              
              // Clear any existing highlight
              clearHighlight();
              
              // Parse the URI and open the document
              const documentUri = vscode.Uri.parse(fileUri);
              const document = await vscode.workspace.openTextDocument(documentUri);
              
              // Show the document and get the active editor
              const activeEditor = await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
                preview: false
              });
              
              // Wait a bit for the editor to be ready
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Create a position for the line (0-indexed)
              const lineIndex = Math.max(0, actualLineNumber - 1);
              const position = new vscode.Position(lineIndex, 0);
              
              // Create a range for the entire line
              const line = activeEditor.document.lineAt(lineIndex);
              const range = line.range;
              
              if (selectWholeLine) {
                // Select the entire line (from start to end of line)
                activeEditor.selection = new vscode.Selection(range.start, range.end);
              } else {
                // Just move cursor to the beginning of the line
                activeEditor.selection = new vscode.Selection(position, position);
              }
              
              // Scroll to show the line in the center
              activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
          } catch (err) {
            console.error('Failed to navigate to line:', err);
            vscode.window.showErrorMessage(`Failed to navigate to line ${message.line}: ${err.message}`);
          }
          return;
      }
    },
    undefined,
    context.subscriptions
  );
  
  return {
    dispose: () => {
      clearHighlight(); // Clear error highlight when disposing
      clearSelectionHighlight(); // Clear selection range highlight
      selectionRangeDecorationType.dispose(); // Dispose decoration type
      changeDocumentSubscription.dispose();
      messageSubscription.dispose();
      activeEditorChangeSubscription.dispose(); // Dispose editor change listener
      if (templateWatcher) {
        templateWatcher.dispose(); // Dispose template file watcher
      }
    }
  };
}

module.exports = {
  setupWebviewForEditor
};
