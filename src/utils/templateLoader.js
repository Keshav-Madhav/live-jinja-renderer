const vscode = require('vscode');
const path = require('path');

/**
 * Template Loader Utility
 * Loads template files from configured paths for {% include %} and {% extends %} support
 */

/**
 * Check if template content uses external template references
 * (include, extends, import, from ... import)
 * @param {string} templateContent - The template content to check
 * @returns {boolean} True if the template references external templates
 */
function usesExternalTemplates(templateContent) {
  if (!templateContent || typeof templateContent !== 'string') {
    return false;
  }
  
  // Regex patterns for Jinja tags that reference other templates
  // {% include "template.html" %} or {% include 'template.html' %} or {% include variable %}
  // {% extends "base.html" %} or {% extends 'base.html' %} or {% extends variable %}
  // {% import "macros.html" as macros %} or {% import 'macros.html' as macros %}
  // {% from "macros.html" import macro_name %} or {% from 'macros.html' import macro_name %}
  const externalTemplatePattern = /\{%[-+]?\s*(include|extends|import|from)\s+/i;
  
  return externalTemplatePattern.test(templateContent);
}

/**
 * Extract referenced template names from template content
 * @param {string} templateContent - The template content to parse
 * @returns {string[]} Array of template names referenced in the content
 */
function extractReferencedTemplates(templateContent) {
  if (!templateContent || typeof templateContent !== 'string') {
    return [];
  }
  
  const references = new Set();
  
  // Match {% include "template.html" %} or {% include 'template.html' %}
  // Also handles {% include "template.html" with context %} etc.
  const includePattern = /\{%[-+]?\s*include\s+['"]([^'"]+)['"]/gi;
  
  // Match {% extends "base.html" %} or {% extends 'base.html' %}
  const extendsPattern = /\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/gi;
  
  // Match {% import "macros.html" as ... %} or {% import 'macros.html' as ... %}
  const importPattern = /\{%[-+]?\s*import\s+['"]([^'"]+)['"]/gi;
  
  // Match {% from "macros.html" import ... %} or {% from 'macros.html' import ... %}
  const fromPattern = /\{%[-+]?\s*from\s+['"]([^'"]+)['"]/gi;
  
  let match;
  
  while ((match = includePattern.exec(templateContent)) !== null) {
    references.add(match[1]);
  }
  
  while ((match = extendsPattern.exec(templateContent)) !== null) {
    references.add(match[1]);
  }
  
  while ((match = importPattern.exec(templateContent)) !== null) {
    references.add(match[1]);
  }
  
  while ((match = fromPattern.exec(templateContent)) !== null) {
    references.add(match[1]);
  }
  
  return Array.from(references);
}

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
    
    if (searchPaths.length > 0) {
      // Use configured search paths
      // Supports special tokens:
      // - "." = current file's directory only
      // - ".." = parent directory of current file
      // - "./subfolder" or "../subfolder" = relative to current file's directory
      // - Regular paths = relative to workspace root
      for (const searchPath of searchPaths) {
        let fullPath;
        
        if (searchPath === '.' || searchPath === './') {
          // Current file's directory only
          if (currentFilePath) {
            fullPath = path.dirname(currentFilePath);
          }
        } else if (searchPath.startsWith('./') || searchPath.startsWith('../') || searchPath === '..') {
          // Relative to current file's directory
          if (currentFilePath) {
            fullPath = path.resolve(path.dirname(currentFilePath), searchPath);
          }
        } else if (path.isAbsolute(searchPath)) {
          // Absolute path
          fullPath = searchPath;
        } else if (workspaceRoot) {
          // Relative to workspace root
          fullPath = path.join(workspaceRoot, searchPath);
        }
        
        if (fullPath) {
          searchDirs.push(fullPath);
        }
      }
    } else if (currentFilePath) {
      // Default behavior: current file's directory + workspace root
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
  getWorkspaceRoot,
  usesExternalTemplates,
  extractReferencedTemplates
};

