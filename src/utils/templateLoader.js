const vscode = require('vscode');
const path = require('path');

/**
 * Template Loader Utility
 * Loads template files from configured paths for {% include %} and {% extends %} support
 */

/**
 * Get the workspace root folder
 * @returns {string|null} The workspace root path or null if no workspace is open
 */
function getWorkspaceRoot() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }
  return null;
}

/**
 * Load templates from configured search paths
 * @param {string} currentFilePath - Path to the current template file being edited
 * @returns {Promise<{templates: Object, templatePaths: string[], error: string|null}>}
 */
async function loadTemplates(currentFilePath) {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  const enableIncludes = config.get('templates.enableIncludes', true);
  
  if (!enableIncludes) {
    return { templates: {}, templatePaths: [], error: null };
  }
  
  const searchPaths = config.get('templates.searchPaths', []);
  const filePatterns = config.get('templates.filePatterns', ['**/*.jinja', '**/*.jinja2', '**/*.j2', '**/*.html', '**/*.txt']);
  const maxFiles = config.get('templates.maxFiles', 100);
  
  const workspaceRoot = getWorkspaceRoot();
  const templates = {};
  const templatePaths = [];
  let loadedCount = 0;
  
  try {
    // Determine search directories
    let searchDirs = [];
    
    if (searchPaths.length > 0 && workspaceRoot) {
      // Use configured search paths relative to workspace root
      for (const searchPath of searchPaths) {
        const fullPath = path.isAbsolute(searchPath) 
          ? searchPath 
          : path.join(workspaceRoot, searchPath);
        searchDirs.push(fullPath);
      }
    } else if (currentFilePath) {
      // Default to the directory containing the current file
      searchDirs.push(path.dirname(currentFilePath));
      
      // Also add workspace root if available
      if (workspaceRoot && workspaceRoot !== path.dirname(currentFilePath)) {
        searchDirs.push(workspaceRoot);
      }
    }
    
    // Remove duplicates
    searchDirs = [...new Set(searchDirs)];
    
    // Find and load template files
    for (const searchDir of searchDirs) {
      if (loadedCount >= maxFiles) break;
      
      try {
        // Create a relative pattern for this directory
        const dirUri = vscode.Uri.file(searchDir);
        
        for (const pattern of filePatterns) {
          if (loadedCount >= maxFiles) break;
          
          // Use findFiles with a pattern relative to the search directory
          const relativePattern = new vscode.RelativePattern(dirUri, pattern);
          const files = await vscode.workspace.findFiles(relativePattern, '**/node_modules/**', maxFiles - loadedCount);
          
          for (const file of files) {
            if (loadedCount >= maxFiles) break;
            
            // Skip the current file being edited
            if (file.fsPath === currentFilePath) continue;
            
            try {
              const content = await vscode.workspace.fs.readFile(file);
              const textContent = Buffer.from(content).toString('utf8');
              
              // Calculate relative path from search directory for template name
              const relativePath = path.relative(searchDir, file.fsPath);
              // Normalize path separators for cross-platform compatibility
              const templateName = relativePath.replace(/\\/g, '/');
              
              // Also store with just the filename for simpler includes
              const fileName = path.basename(file.fsPath);
              
              // Store template with multiple possible names
              templates[templateName] = textContent;
              if (!templates[fileName]) {
                templates[fileName] = textContent;
              }
              
              templatePaths.push(templateName);
              loadedCount++;
            } catch (readError) {
              console.warn(`Failed to read template file: ${file.fsPath}`, readError);
            }
          }
        }
      } catch (dirError) {
        console.warn(`Failed to search directory: ${searchDir}`, dirError);
      }
    }
    
    return { 
      templates, 
      templatePaths: [...new Set(templatePaths)], 
      error: null,
      searchDirs,
      loadedCount
    };
  } catch (error) {
    console.error('Template loader error:', error);
    return { 
      templates: {}, 
      templatePaths: [], 
      error: error.message,
      searchDirs: [],
      loadedCount: 0
    };
  }
}

/**
 * Get a summary of loaded templates for UI display
 * @param {Object} loadResult - Result from loadTemplates
 * @returns {Object} Summary object for UI
 */
function getTemplateSummary(loadResult) {
  const { templates, templatePaths, error, searchDirs, loadedCount } = loadResult;
  
  return {
    enabled: !error && Object.keys(templates).length > 0,
    count: loadedCount || 0,
    paths: templatePaths || [],
    searchDirs: searchDirs || [],
    error: error
  };
}

/**
 * Watch for template file changes and notify callback
 * @param {Function} callback - Called when template files change
 * @returns {vscode.Disposable} Disposable to stop watching
 */
function watchTemplateChanges(callback) {
  const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
  const filePatterns = config.get('templates.filePatterns', ['**/*.jinja', '**/*.jinja2', '**/*.j2', '**/*.html', '**/*.txt']);
  
  const watchers = [];
  
  for (const pattern of filePatterns) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    watcher.onDidChange((uri) => callback('change', uri));
    watcher.onDidCreate((uri) => callback('create', uri));
    watcher.onDidDelete((uri) => callback('delete', uri));
    
    watchers.push(watcher);
  }
  
  return {
    dispose: () => {
      watchers.forEach(w => w.dispose());
    }
  };
}

module.exports = {
  loadTemplates,
  getTemplateSummary,
  watchTemplateChanges,
  getWorkspaceRoot
};

