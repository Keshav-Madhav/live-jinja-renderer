const vscode = require('vscode');
const path = require('path');
const { getWorkspaceRoot } = require('../utils/templateLoader');

/**
 * Provides "Go to Definition" functionality for Jinja2 templates
 * Supports navigation to macro definitions in current file and imported templates
 */
class JinjaDefinitionProvider {
  constructor() {
    // No caching for now - definitions are resolved fresh each time
    // This ensures accuracy when files change
  }

  /**
   * Escape special regex characters in a string
   * @param {string} str - String to escape
   * @returns {string} - Escaped string safe for use in regex
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Main entry point for the definition provider
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {vscode.CancellationToken} token
   * @returns {Promise<vscode.Location | vscode.Location[] | null>}
   */
  async provideDefinition(document, position, token) {
    const line = document.lineAt(position).text;
    const charPos = position.character;
    
    // First, check if we're clicking on a template path string in import/include/extends/from
    const templatePathResult = await this.checkTemplatePath(document, line, charPos, token);
    if (templatePathResult) {
      return templatePathResult;
    }
    
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
    
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);
    
    // Check if we're inside Jinja syntax
    if (!this.isInsideJinjaSyntax(line, wordRange.start.character, wordRange.end.character)) {
      return null;
    }

    // Get context to understand what kind of identifier this is
    const context = this.getIdentifierContext(line, wordRange, word);
    
    if (!context) {
      return null;
    }

    // Based on context, find the definition
    switch (context.type) {
      case 'macro_call':
        return this.findMacroDefinition(document, context.macroName, context.moduleName, token);
      case 'import_alias':
        return this.findImportedFile(document, context.alias, token);
      case 'block_reference':
        return this.findBlockDefinition(document, context.blockName, token);
      case 'variable':
        return this.findVariableDefinition(document, context.variableName, token);
      default:
        // Try to find as a macro first, then as a variable
        const macroResult = await this.findMacroDefinition(document, word, null, token);
        if (macroResult) {
          return macroResult;
        }
        return this.findVariableDefinition(document, word, token);
    }
  }

  /**
   * Check if the cursor is on a template path in import/include/extends/from statements
   * Also handles clicking on imported names in {% from "path" import name1, name2 %}
   * @param {vscode.TextDocument} document
   * @param {string} line
   * @param {number} charPos
   * @param {vscode.CancellationToken} token
   * @returns {Promise<vscode.Location | null>}
   */
  async checkTemplatePath(document, line, charPos, token) {
    const currentFilePath = document.uri.fsPath;
    
    // First, check for {% from "path" import name1, name2 %} - clicking on imported names
    const fromImportResult = await this.checkFromImportNames(line, charPos, currentFilePath, token);
    if (fromImportResult) {
      return fromImportResult;
    }
    
    // Pattern to match template path statements with their quoted paths
    // Matches: {% include "path" %}, {% extends "path" %}, {% import "path" as x %}, {% from "path" import x %}
    const patterns = [
      /\{%[-+]?\s*include\s+(['"])([^'"]+)\1/gi,
      /\{%[-+]?\s*extends\s+(['"])([^'"]+)\1/gi,
      /\{%[-+]?\s*import\s+(['"])([^'"]+)\1/gi,
      /\{%[-+]?\s*from\s+(['"])([^'"]+)\1/gi
    ];
    
    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;
      
      while ((match = pattern.exec(line)) !== null) {
        const pathStart = match.index + match[0].indexOf(match[2]);
        const pathEnd = pathStart + match[2].length;
        
        // Check if cursor is within the path string
        if (charPos >= pathStart && charPos <= pathEnd) {
          const templatePath = match[2];
          
          // Resolve and navigate to the template file
          const resolvedPath = await this.resolveTemplatePath(templatePath, currentFilePath);
          if (resolvedPath) {
            const uri = vscode.Uri.file(resolvedPath);
            return new vscode.Location(uri, new vscode.Position(0, 0));
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Check if cursor is on an imported name in {% from "path" import name1, name2 %}
   * and navigate to the macro definition in the source file
   */
  async checkFromImportNames(line, charPos, currentFilePath, token) {
    // Match {% from "path" import name1, name2, name3 as alias %}
    const fromImportPattern = /\{%[-+]?\s*from\s+(['"])([^'"]+)\1\s+import\s+([^%]+)[-+]?%\}/gi;
    
    let match;
    while ((match = fromImportPattern.exec(line)) !== null) {
      const templatePath = match[2];
      const importsSection = match[3];
      const importsStart = match.index + match[0].indexOf(importsSection);
      
      // Parse individual imports and find which one the cursor is on
      const imports = importsSection.split(',');
      let currentPos = importsStart;
      
      for (const importItem of imports) {
        const trimmedItem = importItem.trim();
        // Handle "name as alias" syntax
        const parts = trimmedItem.split(/\s+as\s+/i);
        const originalName = parts[0].trim();
        const alias = parts.length > 1 ? parts[1].trim() : null;
        
        // Find position of original name in the line
        const itemStart = line.indexOf(trimmedItem, currentPos);
        if (itemStart === -1) continue;
        
        const nameStart = itemStart;
        const nameEnd = nameStart + originalName.length;
        
        // Check if cursor is on the original name
        if (charPos >= nameStart && charPos <= nameEnd) {
          // Navigate to the macro definition in the source file
          const resolvedPath = await this.resolveTemplatePath(templatePath, currentFilePath);
          if (resolvedPath) {
            const location = await this.findMacroInFile(resolvedPath, originalName, token);
            if (location) {
              return location;
            }
          }
        }
        
        // Check if cursor is on the alias (if present)
        if (alias) {
          const aliasStart = line.indexOf(alias, nameEnd);
          if (aliasStart !== -1) {
            const aliasEnd = aliasStart + alias.length;
            if (charPos >= aliasStart && charPos <= aliasEnd) {
              // Navigate to the macro definition using the original name
              const resolvedPath = await this.resolveTemplatePath(templatePath, currentFilePath);
              if (resolvedPath) {
                const location = await this.findMacroInFile(resolvedPath, originalName, token);
                if (location) {
                  return location;
                }
              }
            }
          }
        }
        
        currentPos = itemStart + trimmedItem.length;
      }
    }
    
    return null;
  }

  /**
   * Check if a position is inside Jinja syntax ({{ }}, {% %}) but NOT in comments ({# #})
   */
  isInsideJinjaSyntax(line, startChar, endChar) {
    const beforeText = line.substring(0, endChar);
    const afterText = line.substring(startChar);
    
    // Check if inside a comment {# #} - if so, return false
    const commentOpenCount = (beforeText.match(/\{#/g) || []).length;
    const commentCloseCount = (beforeText.match(/#\}/g) || []).length;
    const hasCommentCloseAfter = /#\}/.test(afterText);
    
    if (commentOpenCount > commentCloseCount && hasCommentCloseAfter) {
      return false; // Inside a comment, don't provide definitions
    }
    
    // Check {{ }}
    const varOpenCount = (beforeText.match(/\{\{/g) || []).length;
    const varCloseCount = (beforeText.match(/\}\}/g) || []).length;
    const hasVarCloseAfter = /\}\}/.test(afterText);
    
    if (varOpenCount > varCloseCount && hasVarCloseAfter) {
      return true;
    }
    
    // Check {% %}
    const stmtOpenCount = (beforeText.match(/\{%/g) || []).length;
    const stmtCloseCount = (beforeText.match(/%\}/g) || []).length;
    const hasStmtCloseAfter = /%\}/.test(afterText);
    
    if (stmtOpenCount > stmtCloseCount && hasStmtCloseAfter) {
      return true;
    }
    
    return false;
  }

  /**
   * Built-in Python/Jinja methods that should NOT be treated as macros
   */
  static BUILTIN_METHODS = new Set([
    // String methods
    'lower', 'upper', 'capitalize', 'title', 'strip', 'lstrip', 'rstrip',
    'split', 'rsplit', 'join', 'replace', 'find', 'rfind', 'index', 'rindex',
    'count', 'startswith', 'endswith', 'isdigit', 'isalpha', 'isalnum',
    'isspace', 'islower', 'isupper', 'format', 'zfill', 'center', 'ljust', 'rjust',
    'encode', 'decode', 'swapcase', 'partition', 'rpartition',
    // Dict methods
    'get', 'keys', 'values', 'items', 'pop', 'setdefault', 'update', 'clear', 'copy', 'fromkeys',
    // List methods
    'append', 'extend', 'insert', 'remove', 'reverse', 'sort',
    // Common functions
    'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple',
    'range', 'enumerate', 'zip', 'sorted', 'reversed', 'filter', 'map', 'any', 'all',
    'min', 'max', 'sum', 'abs', 'round', 'type', 'isinstance', 'hasattr', 'getattr'
  ]);

  /**
   * Determine the context of an identifier (macro call, import alias, variable, etc.)
   */
  getIdentifierContext(line, wordRange, word) {
    const textBeforeWord = line.substring(0, wordRange.start.character);
    const textAfterWord = line.substring(wordRange.end.character);
    
    // Check for module.macro() pattern (e.g., forms.input())
    // Pattern: identifier followed by opening paren
    if (/^\s*\(/.test(textAfterWord)) {
      // Check if preceded by "alias." (method call on object)
      const moduleMatch = textBeforeWord.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*$/);
      if (moduleMatch) {
        // Check if it's a built-in method - if so, don't treat as macro
        if (JinjaDefinitionProvider.BUILTIN_METHODS.has(word.toLowerCase())) {
          return null; // Built-in method, no definition to navigate to
        }
        return {
          type: 'macro_call',
          macroName: word,
          moduleName: moduleMatch[1]
        };
      }
      // Direct macro call (not preceded by dot)
      return {
        type: 'macro_call',
        macroName: word,
        moduleName: null
      };
    }
    
    // Check for alias.something pattern - clicking on the alias
    if (/^\s*\./.test(textAfterWord)) {
      return {
        type: 'import_alias',
        alias: word
      };
    }
    
    // Check for {% block name %}
    if (/\{%[-+]?\s*block\s+$/.test(textBeforeWord)) {
      return {
        type: 'block_reference',
        blockName: word
      };
    }
    
    // Check for {% call macro_name %} or {{ macro_name() }}
    if (/\{%[-+]?\s*call\s+$/.test(textBeforeWord) || 
        /\{\{\s*$/.test(textBeforeWord) ||
        /\{\{[^}]*\s$/.test(textBeforeWord)) {
      // Could be a macro call
      if (/^\s*\(/.test(textAfterWord) || /^\s*\}/.test(textAfterWord)) {
        return {
          type: 'macro_call',
          macroName: word,
          moduleName: null
        };
      }
    }
    
    // Check if this could be a variable reference
    // Variables can appear in {{ var }}, {% if var %}, {% for x in var %}, etc.
    // But NOT if we're in a {% set var = ... %} definition (left side of =)
    const isInSetDefinition = /\{%[-+]?\s*set\s+$/.test(textBeforeWord);
    if (!isInSetDefinition) {
      return {
        type: 'variable',
        variableName: word
      };
    }
    
    // Default: unknown
    return {
      type: 'unknown',
      word: word
    };
  }

  /**
   * Find macro definition in current file or imported templates
   */
  async findMacroDefinition(document, macroName, moduleName, token) {
    const currentFilePath = document.uri.fsPath;
    const documentText = document.getText();
    
    // If moduleName is provided, find the import and look in that file
    if (moduleName) {
      const importInfo = this.findImportInfo(documentText, moduleName);
      
      if (importInfo) {
        const resolvedPath = await this.resolveTemplatePath(importInfo.path, currentFilePath);
        if (resolvedPath) {
          const location = await this.findMacroInFile(resolvedPath, macroName, token);
          if (location) {
            return location;
          }
        }
      }
    }
    
    // Search in current file first
    const currentFileLocation = this.findMacroInDocument(document, macroName);
    if (currentFileLocation) {
      return currentFileLocation;
    }
    
    // Search in all imported/included/extended templates
    const locations = await this.searchInRelatedTemplates(document, macroName, token);
    
    if (locations.length === 1) {
      return locations[0];
    } else if (locations.length > 1) {
      return locations;
    }
    
    return null;
  }

  /**
   * Find variable definition ({% set %} statement) in current file or included templates
   * Only returns a location if the variable is actually defined in the template
   */
  async findVariableDefinition(document, variableName, token) {
    // First, search in current file for {% set %}
    const currentFileLocation = this.findSetStatementInDocument(document, variableName);
    if (currentFileLocation) {
      return currentFileLocation;
    }
    
    // Search for loop variable definitions ({% for var in ... %})
    const loopLocation = this.findLoopVariableInDocument(document, variableName);
    if (loopLocation) {
      return loopLocation;
    }
    
    // Search for with block variable definitions ({% with var = ... %})
    const withLocation = this.findWithVariableInDocument(document, variableName);
    if (withLocation) {
      return withLocation;
    }
    
    // Search for macro parameter definitions ({% macro name(param) %})
    const macroParamLocation = this.findMacroParameterInDocument(document, variableName);
    if (macroParamLocation) {
      return macroParamLocation;
    }
    
    // Search in included/extended templates
    const locations = await this.searchVariableInRelatedTemplates(document, variableName, token);
    
    if (locations.length === 1) {
      return locations[0];
    } else if (locations.length > 1) {
      return locations;
    }
    
    // Variable is not defined in the template (it's an external variable)
    return null;
  }

  /**
   * Find {% set variable = ... %} in a document
   */
  findSetStatementInDocument(document, variableName) {
    const text = document.getText();
    return this.findSetStatementInText(text, variableName, document.uri);
  }

  /**
   * Find {% set variable = ... %} in text
   */
  findSetStatementInText(text, variableName, uri) {
    // Escape special regex characters in variable name
    const escapedName = this.escapeRegex(variableName);
    
    // Match {% set variable = ... %} (inline) or {% set variable %} (block)
    // The variable name must be followed by = or whitespace then %}
    const setPattern = new RegExp(
      `\\{%[-+]?\\s*set\\s+(${escapedName})\\s*(?:=|[-+]?%\\})`,
      'gi'
    );
    
    let match;
    let firstMatch = null;
    let firstMatchLine = Infinity;
    
    while ((match = setPattern.exec(text)) !== null) {
      const foundName = match[1];
      // Case-sensitive match
      if (foundName === variableName) {
        // Calculate position
        const beforeMatch = text.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        
        // Find position of variable name
        const matchText = match[0];
        const nameIndex = matchText.indexOf(variableName);
        const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
        const character = match.index - lastLineStart + nameIndex;
        
        const position = new vscode.Position(line, character);
        
        // Return the first (earliest) definition
        if (line < firstMatchLine) {
          firstMatch = new vscode.Location(uri, position);
          firstMatchLine = line;
        }
      }
    }
    
    return firstMatch;
  }

  /**
   * Find {% for variable in ... %} loop variable definition
   */
  findLoopVariableInDocument(document, variableName) {
    const text = document.getText();
    return this.findLoopVariableInText(text, variableName, document.uri);
  }

  /**
   * Find {% for variable in ... %} in text
   */
  findLoopVariableInText(text, variableName, uri) {
    // Match {% for var in ... %} or {% for key, value in ... %} or {% for a, b, c in ... %}
    // We capture the entire variable list and parse it separately
    const forPattern = /\{%[-+]?\s*for\s+([^%]+?)\s+in\s+/gi;
    
    let match;
    while ((match = forPattern.exec(text)) !== null) {
      const varList = match[1].trim();
      
      // Split by comma to handle tuple unpacking: "key, value" or "a, b, c"
      const loopVars = varList.split(',').map(v => v.trim());
      
      // Check if any loop variable matches
      const matchingVarIndex = loopVars.findIndex(v => v === variableName);
      if (matchingVarIndex !== -1) {
        const beforeMatch = text.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        
        // Find exact position of the matching variable within the match
        // We need to find the specific occurrence of the variable name
        const matchText = match[0];
        const forKeywordEnd = matchText.indexOf('for') + 3;
        const varListPart = matchText.substring(forKeywordEnd);
        
        // Find the variable's position by finding it after accounting for earlier variables
        let searchStart = forKeywordEnd;
        for (let i = 0; i < matchingVarIndex; i++) {
          const idx = varListPart.indexOf(loopVars[i], searchStart - forKeywordEnd);
          if (idx !== -1) {
            searchStart = forKeywordEnd + idx + loopVars[i].length;
          }
        }
        
        // Now find our variable from the search start position
        const nameIndex = matchText.indexOf(variableName, searchStart);
        const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
        const character = match.index - lastLineStart + (nameIndex !== -1 ? nameIndex : matchText.indexOf(variableName));
        
        const position = new vscode.Position(line, character);
        return new vscode.Location(uri, position);
      }
    }
    
    return null;
  }

  /**
   * Find {% with variable = ... %} definition
   */
  findWithVariableInDocument(document, variableName) {
    const text = document.getText();
    return this.findWithVariableInText(text, variableName, document.uri);
  }

  /**
   * Find macro parameter definition ({% macro name(param) %})
   */
  findMacroParameterInDocument(document, variableName) {
    const text = document.getText();
    return this.findMacroParameterInText(text, variableName, document.uri);
  }

  /**
   * Find macro parameter in text
   * Searches for {% macro name(..., param, ...) %} where param matches variableName
   */
  findMacroParameterInText(text, variableName, uri) {
    // Match {% macro name(params) %} and capture the params part
    const macroPattern = /\{%[-+]?\s*macro\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)\s*[-+]?%\}/gi;
    
    let match;
    while ((match = macroPattern.exec(text)) !== null) {
      const paramsStr = match[1];
      
      // Parse parameters (handles default values like "param=default")
      const params = paramsStr.split(',').map(p => {
        const paramPart = p.trim().split('=')[0].trim();
        return paramPart;
      }).filter(p => p.length > 0);
      
      // Check if our variable is a parameter
      if (params.includes(variableName)) {
        const beforeMatch = text.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        
        // Find the position of the parameter name within the match
        const matchText = match[0];
        
        // Find the parameter in the params section, accounting for possible duplicates
        const paramsStart = matchText.indexOf('(');
        const paramsSection = matchText.substring(paramsStart);
        
        // Find the exact position of the variable name as a parameter
        // Need to make sure we find it as a whole word, not substring
        const paramRegex = new RegExp(`\\b${this.escapeRegex(variableName)}\\b`);
        const paramMatch = paramsSection.match(paramRegex);
        
        if (paramMatch) {
          const nameIndex = paramsStart + paramMatch.index;
          const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
          const character = match.index - lastLineStart + nameIndex;
          
          const position = new vscode.Position(line, character);
          return new vscode.Location(uri, position);
        }
      }
    }
    
    return null;
  }

  /**
   * Find {% with variable = ... %} in text
   */
  findWithVariableInText(text, variableName, uri) {
    // Escape special regex characters in variable name
    const escapedName = this.escapeRegex(variableName);
    
    // Match {% with var = ... %} - can have multiple assignments separated by comma
    const withPattern = new RegExp(
      `\\{%[-+]?\\s*with\\s+[^%]*\\b(${escapedName})\\s*=`,
      'gi'
    );
    
    let match;
    while ((match = withPattern.exec(text)) !== null) {
      const foundName = match[1];
      if (foundName === variableName) {
        const beforeMatch = text.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        
        const matchText = match[0];
        const nameIndex = matchText.lastIndexOf(variableName);
        const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
        const character = match.index - lastLineStart + nameIndex;
        
        const position = new vscode.Position(line, character);
        return new vscode.Location(uri, position);
      }
    }
    
    return null;
  }

  /**
   * Search for variable definition in related templates
   */
  async searchVariableInRelatedTemplates(document, variableName, token) {
    const locations = [];
    const currentFilePath = document.uri.fsPath;
    const text = document.getText();
    
    // Get all referenced templates
    const referencedTemplates = this.extractAllReferencedTemplates(text);
    
    for (const templatePath of referencedTemplates) {
      if (token.isCancellationRequested) {
        break;
      }
      
      const resolvedPath = await this.resolveTemplatePath(templatePath, currentFilePath);
      if (resolvedPath) {
        const location = await this.findVariableInFile(resolvedPath, variableName, token);
        if (location) {
          locations.push(location);
        }
      }
    }
    
    return locations;
  }

  /**
   * Find variable definition in a specific file
   */
  async findVariableInFile(filePath, variableName, token) {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      
      // Check for set statement
      let location = this.findSetStatementInText(text, variableName, uri);
      if (location) return location;
      
      // Check for loop variable
      location = this.findLoopVariableInText(text, variableName, uri);
      if (location) return location;
      
      // Check for with variable
      location = this.findWithVariableInText(text, variableName, uri);
      if (location) return location;
      
      // Check for macro parameter
      location = this.findMacroParameterInText(text, variableName, uri);
      if (location) return location;
      
      return null;
    } catch (error) {
      console.warn(`Could not read file for variable search: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Find import information from document text
   */
  findImportInfo(text, aliasOrName) {
    // Escape special regex characters in alias/name
    const escapedAliasOrName = this.escapeRegex(aliasOrName);
    
    // {% import "path" as alias %}
    const importPattern = new RegExp(
      `\\{%[-+]?\\s*import\\s+['"]([^'"]+)['"]\\s+as\\s+${escapedAliasOrName}\\s*[-+]?%\\}`,
      'i'
    );
    const importMatch = text.match(importPattern);
    if (importMatch) {
      return {
        type: 'import',
        path: importMatch[1],
        alias: aliasOrName
      };
    }
    
    // {% from "path" import name %} or {% from "path" import name as alias %}
    const fromImportPattern = /\{%[-+]?\s*from\s+['"]([^'"]+)['"]\s+import\s+([^%]+)[-+]?%\}/gi;
    let fromMatch;
    while ((fromMatch = fromImportPattern.exec(text)) !== null) {
      const filePath = fromMatch[1];
      const imports = fromMatch[2];
      
      // Parse the imported names
      const importedItems = imports.split(',').map(item => {
        const parts = item.trim().split(/\s+as\s+/i);
        return {
          originalName: parts[0].trim(),
          alias: parts.length > 1 ? parts[1].trim() : parts[0].trim()
        };
      });
      
      // Check if the name/alias matches
      const matchingImport = importedItems.find(
        item => item.alias === aliasOrName || item.originalName === aliasOrName
      );
      
      if (matchingImport) {
        return {
          type: 'from_import',
          path: filePath,
          originalName: matchingImport.originalName,
          alias: matchingImport.alias
        };
      }
    }
    
    return null;
  }

  /**
   * Resolve a template path relative to the current file
   */
  async resolveTemplatePath(templatePath, currentFilePath) {
    const currentDir = path.dirname(currentFilePath);
    const workspaceRoot = getWorkspaceRoot();
    
    // Try different resolution strategies
    const candidates = [
      path.resolve(currentDir, templatePath),
      workspaceRoot ? path.resolve(workspaceRoot, templatePath) : null,
      // Try with common template directories
      workspaceRoot ? path.resolve(workspaceRoot, 'templates', templatePath) : null,
      path.resolve(currentDir, '..', templatePath),
    ].filter(Boolean);
    
    // Also try configured search paths
    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    const searchPaths = config.get('templates.searchPaths', []);
    
    for (const searchPath of searchPaths) {
      let basePath;
      if (searchPath === '.' || searchPath === './') {
        basePath = currentDir;
      } else if (searchPath.startsWith('./') || searchPath.startsWith('../')) {
        basePath = path.resolve(currentDir, searchPath);
      } else if (path.isAbsolute(searchPath)) {
        basePath = searchPath;
      } else if (workspaceRoot) {
        basePath = path.resolve(workspaceRoot, searchPath);
      }
      
      if (basePath) {
        candidates.push(path.resolve(basePath, templatePath));
      }
    }
    
    // Check which candidate exists
    for (const candidate of candidates) {
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(candidate));
        return candidate;
      } catch {
        // File doesn't exist, try next candidate
      }
    }
    
    return null;
  }

  /**
   * Find macro definition in a specific file
   */
  async findMacroInFile(filePath, macroName, token) {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      
      const location = this.findMacroInText(text, macroName, uri);
      return location;
    } catch (error) {
      console.warn(`Could not read file for macro search: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Find macro definition in a document
   */
  findMacroInDocument(document, macroName) {
    const text = document.getText();
    return this.findMacroInText(text, macroName, document.uri);
  }

  /**
   * Find macro definition in text content
   */
  findMacroInText(text, macroName, uri) {
    // Escape special regex characters in macro name
    const escapedName = this.escapeRegex(macroName);
    
    // Match {% macro name(args) %}
    const macroPattern = new RegExp(
      `\\{%[-+]?\\s*macro\\s+(${escapedName})\\s*\\([^)]*\\)\\s*[-+]?%\\}`,
      'gi'
    );
    
    let match;
    while ((match = macroPattern.exec(text)) !== null) {
      // Check if the macro name matches (case-sensitive)
      const foundName = match[1];
      if (foundName === macroName) {
        // Calculate line and character position
        const beforeMatch = text.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        
        // Find the position of the macro name within the match
        const matchText = match[0];
        const nameIndex = matchText.indexOf(macroName);
        const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
        const character = match.index - lastLineStart + nameIndex;
        
        const position = new vscode.Position(line, character);
        return new vscode.Location(uri, position);
      }
    }
    
    return null;
  }

  /**
   * Search for macro in all related templates (included, imported, extended)
   */
  async searchInRelatedTemplates(document, macroName, token) {
    const locations = [];
    const currentFilePath = document.uri.fsPath;
    const text = document.getText();
    
    // Get all referenced templates
    const referencedTemplates = this.extractAllReferencedTemplates(text);
    
    // Search each referenced template
    for (const templatePath of referencedTemplates) {
      if (token.isCancellationRequested) {
        break;
      }
      
      const resolvedPath = await this.resolveTemplatePath(templatePath, currentFilePath);
      if (resolvedPath) {
        const location = await this.findMacroInFile(resolvedPath, macroName, token);
        if (location) {
          locations.push(location);
        }
        
        // Also search recursively in the referenced template's imports
        const nestedLocations = await this.searchInNestedTemplates(resolvedPath, macroName, new Set([currentFilePath]), token);
        locations.push(...nestedLocations);
      }
    }
    
    return locations;
  }

  /**
   * Search for macro in nested template references (recursive)
   */
  async searchInNestedTemplates(filePath, macroName, visited, token) {
    if (visited.has(filePath) || token.isCancellationRequested) {
      return [];
    }
    
    visited.add(filePath);
    const locations = [];
    
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      
      const referencedTemplates = this.extractAllReferencedTemplates(text);
      
      for (const templatePath of referencedTemplates) {
        if (token.isCancellationRequested) {
          break;
        }
        
        const resolvedPath = await this.resolveTemplatePath(templatePath, filePath);
        if (resolvedPath && !visited.has(resolvedPath)) {
          const location = await this.findMacroInFile(resolvedPath, macroName, token);
          if (location) {
            locations.push(location);
          }
          
          // Continue recursion
          const nestedLocations = await this.searchInNestedTemplates(resolvedPath, macroName, visited, token);
          locations.push(...nestedLocations);
        }
      }
    } catch (error) {
      console.warn(`Could not search nested templates in: ${filePath}`, error);
    }
    
    return locations;
  }

  /**
   * Extract all template references from text
   */
  extractAllReferencedTemplates(text) {
    const references = new Set();
    
    // {% include "template.html" %}
    const includePattern = /\{%[-+]?\s*include\s+['"]([^'"]+)['"]/gi;
    let match;
    while ((match = includePattern.exec(text)) !== null) {
      references.add(match[1]);
    }
    
    // {% extends "base.html" %}
    const extendsPattern = /\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/gi;
    while ((match = extendsPattern.exec(text)) !== null) {
      references.add(match[1]);
    }
    
    // {% import "macros.html" as ... %}
    const importPattern = /\{%[-+]?\s*import\s+['"]([^'"]+)['"]/gi;
    while ((match = importPattern.exec(text)) !== null) {
      references.add(match[1]);
    }
    
    // {% from "macros.html" import ... %}
    const fromPattern = /\{%[-+]?\s*from\s+['"]([^'"]+)['"]/gi;
    while ((match = fromPattern.exec(text)) !== null) {
      references.add(match[1]);
    }
    
    return Array.from(references);
  }

  /**
   * Find where an imported template file is located
   */
  async findImportedFile(document, alias, token) {
    const text = document.getText();
    const currentFilePath = document.uri.fsPath;
    
    const importInfo = this.findImportInfo(text, alias);
    
    if (importInfo) {
      const resolvedPath = await this.resolveTemplatePath(importInfo.path, currentFilePath);
      if (resolvedPath) {
        const uri = vscode.Uri.file(resolvedPath);
        return new vscode.Location(uri, new vscode.Position(0, 0));
      }
    }
    
    return null;
  }

  /**
   * Find block definition (in parent templates via extends)
   */
  async findBlockDefinition(document, blockName, token) {
    const locations = [];
    const text = document.getText();
    const currentFilePath = document.uri.fsPath;
    
    // First check current file
    const currentLocation = this.findBlockInText(text, blockName, document.uri);
    if (currentLocation) {
      locations.push(currentLocation);
    }
    
    // Find extends chain and search parent templates
    const extendsPattern = /\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/i;
    const extendsMatch = text.match(extendsPattern);
    
    if (extendsMatch) {
      const parentPath = extendsMatch[1];
      const resolvedPath = await this.resolveTemplatePath(parentPath, currentFilePath);
      
      if (resolvedPath) {
        const parentLocations = await this.findBlockInParentChain(resolvedPath, blockName, new Set([currentFilePath]), token);
        locations.push(...parentLocations);
      }
    }
    
    if (locations.length === 1) {
      return locations[0];
    } else if (locations.length > 1) {
      return locations;
    }
    
    return null;
  }

  /**
   * Find block definition in text
   */
  findBlockInText(text, blockName, uri) {
    // Escape special regex characters in block name
    const escapedName = this.escapeRegex(blockName);
    
    const blockPattern = new RegExp(
      `\\{%[-+]?\\s*block\\s+(${escapedName})\\s*[-+]?%\\}`,
      'gi'
    );
    
    let match;
    while ((match = blockPattern.exec(text)) !== null) {
      const foundName = match[1];
      if (foundName === blockName) {
        const beforeMatch = text.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        
        const matchText = match[0];
        const nameIndex = matchText.indexOf(blockName);
        const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
        const character = match.index - lastLineStart + nameIndex;
        
        const position = new vscode.Position(line, character);
        return new vscode.Location(uri, position);
      }
    }
    
    return null;
  }

  /**
   * Find block in parent template chain
   */
  async findBlockInParentChain(filePath, blockName, visited, token) {
    if (visited.has(filePath) || token.isCancellationRequested) {
      return [];
    }
    
    visited.add(filePath);
    const locations = [];
    
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      
      const location = this.findBlockInText(text, blockName, uri);
      if (location) {
        locations.push(location);
      }
      
      // Continue up the extends chain
      const extendsPattern = /\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/i;
      const extendsMatch = text.match(extendsPattern);
      
      if (extendsMatch) {
        const parentPath = extendsMatch[1];
        const resolvedPath = await this.resolveTemplatePath(parentPath, filePath);
        
        if (resolvedPath && !visited.has(resolvedPath)) {
          const parentLocations = await this.findBlockInParentChain(resolvedPath, blockName, visited, token);
          locations.push(...parentLocations);
        }
      }
    } catch (error) {
      console.warn(`Could not search parent template: ${filePath}`, error);
    }
    
    return locations;
  }

  /**
   * Clear caches (called when files change)
   * Currently a no-op since we resolve definitions fresh each time
   */
  clearCache() {
    // No-op: definitions are resolved fresh each time for accuracy
  }
}

module.exports = { JinjaDefinitionProvider };

