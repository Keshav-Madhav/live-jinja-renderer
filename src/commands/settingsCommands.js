const vscode = require('vscode');
const { updateStatusBar } = require('../utils/statusBar');
const { setOpenAIApiKey, validateOpenAIKey, setGeminiApiKey, validateGeminiKey } = require('../utils/llmDataGenerator');

// Secret storage key constants
const OPENAI_API_KEY_SECRET = 'liveJinjaRenderer.openai.apiKey';
const GEMINI_API_KEY_SECRET = 'liveJinjaRenderer.gemini.apiKey';

/**
 * Update context keys based on configuration
 */
async function updateContextKeys() {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  
  // Read from new settings first, then fallback to old settings
  let markdownEnabled = config.get('rendering.enableMarkdown');
  if (markdownEnabled === undefined) {
    markdownEnabled = config.get('enableMarkdown', false);
  }
  
  let mermaidEnabled = config.get('rendering.enableMermaid');
  if (mermaidEnabled === undefined) {
    mermaidEnabled = config.get('enableMermaid', false);
  }
  
  let showWhitespaceEnabled = config.get('rendering.showWhitespace');
  if (showWhitespaceEnabled === undefined) {
    showWhitespaceEnabled = config.get('showWhitespace', true);
  }
  
  let cullWhitespaceEnabled = config.get('rendering.cullWhitespace');
  if (cullWhitespaceEnabled === undefined) {
    cullWhitespaceEnabled = config.get('cullWhitespace', false);
  }
  
  // Update context keys for when clauses
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.markdownEnabled', markdownEnabled);
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.mermaidEnabled', mermaidEnabled);
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.showWhitespaceEnabled', showWhitespaceEnabled);
  await vscode.commands.executeCommand('setContext', 'liveJinjaRenderer.cullWhitespaceEnabled', cullWhitespaceEnabled);
  
  // Update status bar
  updateStatusBar();
}

// Reference to sidebar provider for notifying webview of key changes
let _sidebarProvider = null;

/**
 * Set the sidebar provider reference for API key notifications
 * @param {any} provider - The sidebar provider instance
 */
function setSidebarProvider(provider) {
  _sidebarProvider = provider;
}

/**
 * Notify webview about OpenAI key status change
 * @param {boolean} available - Whether the key is now available
 */
function notifyOpenAIKeyChange(available) {
  if (_sidebarProvider && _sidebarProvider._view) {
    _sidebarProvider._view.webview.postMessage({
      type: 'openaiKeyUpdated',
      available: available
    });
  }
}

/**
 * Notify webview about Gemini key status change
 * @param {boolean} available - Whether the key is now available
 */
function notifyGeminiKeyChange(available) {
  if (_sidebarProvider && _sidebarProvider._view) {
    _sidebarProvider._view.webview.postMessage({
      type: 'geminiKeyUpdated',
      available: available
    });
  }
}

/**
 * Register commands for toggling settings
 */
function registerSettingsCommands(context) {
  // Initialize context keys
  updateContextKeys();
  
  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('liveJinjaRenderer')) {
        updateContextKeys();
      }
    })
  );
  
  // Toggle Markdown
  const toggleMarkdownCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMarkdown', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.enableMarkdown');
    if (currentValue === undefined) {
      currentValue = config.get('enableMarkdown', false);
    }
    
    // Always write to new setting
    await config.update('rendering.enableMarkdown', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMarkdownCommand);
  
  // Toggle Mermaid
  const toggleMermaidCommand = vscode.commands.registerCommand('live-jinja-tester.toggleMermaid', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.enableMermaid');
    if (currentValue === undefined) {
      currentValue = config.get('enableMermaid', false);
    }
    
    // Always write to new setting
    await config.update('rendering.enableMermaid', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleMermaidCommand);
  
  // Toggle Show Whitespace
  const toggleShowWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleShowWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.showWhitespace');
    if (currentValue === undefined) {
      currentValue = config.get('showWhitespace', true);
    }
    
    // Always write to new setting
    await config.update('rendering.showWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleShowWhitespaceCommand);
  
  // Toggle Cull Whitespace
  const toggleCullWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleCullWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Read from new setting first, then fallback to old
    let currentValue = config.get('rendering.cullWhitespace');
    if (currentValue === undefined) {
      currentValue = config.get('cullWhitespace', false);
    }
    
    // Always write to new setting
    await config.update('rendering.cullWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleCullWhitespaceCommand);
  
  // Toggle Strip Block Whitespace (enables both trim_blocks and lstrip_blocks)
  const toggleStripBlockWhitespaceCommand = vscode.commands.registerCommand('live-jinja-tester.toggleStripBlockWhitespace', async () => {
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const currentValue = config.get('environment.stripBlockWhitespace', false);
    await config.update('environment.stripBlockWhitespace', !currentValue, vscode.ConfigurationTarget.Global);
  });
  context.subscriptions.push(toggleStripBlockWhitespaceCommand);
  
  // Open Extension Settings
  const openExtensionSettingsCommand = vscode.commands.registerCommand('live-jinja-tester.openExtensionSettings', async () => {
    // Open VS Code settings UI directly to the extensions section
    await vscode.commands.executeCommand('workbench.action.openSettings', 'liveJinjaRenderer.extensions');
  });
  context.subscriptions.push(openExtensionSettingsCommand);
  
  // ============================================
  // AI API KEY MANAGEMENT COMMANDS
  // ============================================
  
  // Add/Update OpenAI API Key
  const openaiAddKeyCommand = vscode.commands.registerCommand('live-jinja-tester.openaiAddKey', async () => {
    try {
      const newKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API key',
        placeHolder: 'sk-...',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'API key cannot be empty';
          }
          if (!value.startsWith('sk-')) {
            return 'OpenAI API keys typically start with "sk-"';
          }
          return null;
        }
      });
      
      if (newKey) {
        // Show progress while validating
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Validating OpenAI API key...',
          cancellable: false
        }, async () => {
          const isValid = await validateOpenAIKey(newKey.trim());
          
          if (isValid) {
            // Store in SecretStorage
            await context.secrets.store(OPENAI_API_KEY_SECRET, newKey.trim());
            // Update llmDataGenerator cache
            setOpenAIApiKey(newKey.trim());
            
            // Notify webview to show the OpenAI button
            notifyOpenAIKeyChange(true);
            
            vscode.window.showInformationMessage('✓ OpenAI API key saved securely!');
          } else {
            vscode.window.showErrorMessage('Invalid OpenAI API key. Please check and try again.');
          }
        });
      }
    } catch (err) {
      console.error('Error adding OpenAI key:', err);
      vscode.window.showErrorMessage(`Failed to save API key: ${err.message}`);
    }
  });
  context.subscriptions.push(openaiAddKeyCommand);
  
  // View OpenAI API Key
  const openaiViewKeyCommand = vscode.commands.registerCommand('live-jinja-tester.openaiViewKey', async () => {
    try {
      const storedKey = await context.secrets.get(OPENAI_API_KEY_SECRET);
      
      if (storedKey) {
        // Show masked version of the key
        const maskedKey = storedKey.substring(0, 7) + '...' + storedKey.substring(storedKey.length - 4);
        
        const action = await vscode.window.showInformationMessage(
          `🔑 OpenAI API Key: ${maskedKey}`,
          'Copy Full Key',
          'Close'
        );
        
        if (action === 'Copy Full Key') {
          await vscode.env.clipboard.writeText(storedKey);
          vscode.window.showInformationMessage('API key copied to clipboard!');
        }
      } else {
        vscode.window.showWarningMessage('No OpenAI API key configured. Use "Add / Update OpenAI API Key" to add one.');
      }
    } catch (err) {
      console.error('Error viewing OpenAI key:', err);
      vscode.window.showErrorMessage(`Failed to view API key: ${err.message}`);
    }
  });
  context.subscriptions.push(openaiViewKeyCommand);
  
  // Remove OpenAI API Key
  const openaiRemoveKeyCommand = vscode.commands.registerCommand('live-jinja-tester.openaiRemoveKey', async () => {
    try {
      const storedKey = await context.secrets.get(OPENAI_API_KEY_SECRET);
      
      if (!storedKey) {
        vscode.window.showWarningMessage('No OpenAI API key to remove.');
        return;
      }
      
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to remove your OpenAI API key?',
        { modal: true },
        'Remove'
      );
      
      if (confirm === 'Remove') {
        await context.secrets.delete(OPENAI_API_KEY_SECRET);
        setOpenAIApiKey(null);
        
        // Notify webview to hide the OpenAI button
        notifyOpenAIKeyChange(false);
        
        vscode.window.showInformationMessage('OpenAI API key removed.');
      }
    } catch (err) {
      console.error('Error removing OpenAI key:', err);
      vscode.window.showErrorMessage(`Failed to remove API key: ${err.message}`);
    }
  });
  context.subscriptions.push(openaiRemoveKeyCommand);
  
  // ============================================
  // GEMINI API KEY MANAGEMENT COMMANDS
  // ============================================
  
  // Add/Update Gemini API Key
  const geminiAddKeyCommand = vscode.commands.registerCommand('live-jinja-tester.geminiAddKey', async () => {
    try {
      const newKey = await vscode.window.showInputBox({
        prompt: 'Enter your Google Gemini API key',
        placeHolder: 'AI...',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'API key cannot be empty';
          }
          return null;
        }
      });
      
      if (newKey) {
        // Show progress while validating
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Validating Gemini API key...',
          cancellable: false
        }, async () => {
          const isValid = await validateGeminiKey(newKey.trim());
          
          if (isValid) {
            // Store in SecretStorage
            await context.secrets.store(GEMINI_API_KEY_SECRET, newKey.trim());
            // Update llmDataGenerator cache
            setGeminiApiKey(newKey.trim());
            
            // Notify webview to show the Gemini button
            notifyGeminiKeyChange(true);
            
            vscode.window.showInformationMessage('✓ Gemini API key saved securely!');
          } else {
            vscode.window.showErrorMessage('Invalid Gemini API key. Please check and try again.');
          }
        });
      }
    } catch (err) {
      console.error('Error adding Gemini key:', err);
      vscode.window.showErrorMessage(`Failed to save API key: ${err.message}`);
    }
  });
  context.subscriptions.push(geminiAddKeyCommand);
  
  // View Gemini API Key
  const geminiViewKeyCommand = vscode.commands.registerCommand('live-jinja-tester.geminiViewKey', async () => {
    try {
      const storedKey = await context.secrets.get(GEMINI_API_KEY_SECRET);
      
      if (storedKey) {
        // Show masked version of the key
        const maskedKey = storedKey.substring(0, 5) + '...' + storedKey.substring(storedKey.length - 4);
        
        const action = await vscode.window.showInformationMessage(
          `🔑 Gemini API Key: ${maskedKey}`,
          'Copy Full Key',
          'Close'
        );
        
        if (action === 'Copy Full Key') {
          await vscode.env.clipboard.writeText(storedKey);
          vscode.window.showInformationMessage('API key copied to clipboard!');
        }
      } else {
        vscode.window.showWarningMessage('No Gemini API key configured. Use "Add / Update Gemini API Key" to add one.');
      }
    } catch (err) {
      console.error('Error viewing Gemini key:', err);
      vscode.window.showErrorMessage(`Failed to view API key: ${err.message}`);
    }
  });
  context.subscriptions.push(geminiViewKeyCommand);
  
  // Remove Gemini API Key
  const geminiRemoveKeyCommand = vscode.commands.registerCommand('live-jinja-tester.geminiRemoveKey', async () => {
    try {
      const storedKey = await context.secrets.get(GEMINI_API_KEY_SECRET);
      
      if (!storedKey) {
        vscode.window.showWarningMessage('No Gemini API key to remove.');
        return;
      }
      
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to remove your Gemini API key?',
        { modal: true },
        'Remove'
      );
      
      if (confirm === 'Remove') {
        await context.secrets.delete(GEMINI_API_KEY_SECRET);
        setGeminiApiKey(null);
        
        // Notify webview to hide the Gemini button
        notifyGeminiKeyChange(false);
        
        vscode.window.showInformationMessage('Gemini API key removed.');
      }
    } catch (err) {
      console.error('Error removing Gemini key:', err);
      vscode.window.showErrorMessage(`Failed to remove API key: ${err.message}`);
    }
  });
  context.subscriptions.push(geminiRemoveKeyCommand);
}

module.exports = {
  registerSettingsCommands,
  setSidebarProvider
};
