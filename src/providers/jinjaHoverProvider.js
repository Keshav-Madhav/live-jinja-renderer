const vscode = require('vscode');
const path = require('path');

/**
 * Provides hover information for Jinja2 templates
 * Shows documentation for macros, filters, keywords, tests, and blocks
 */
class JinjaHoverProvider {
  constructor() {
    this.variables = {};
    this.macroCache = new Map(); // Cache macro signatures per file
  }

  /**
   * Update the variables cache for hover information
   * @param {Object} variables - The variables object from variable extraction
   */
  updateVariables(variables) {
    this.variables = variables || {};
  }

  /**
   * Get the type of a value for display
   * @param {*} value - The value to check
   * @returns {string} - Type description
   */
  getTypeDescription(value) {
    if (Array.isArray(value)) {
      return `Array (${value.length} items)`;
    }
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'object') {
      return `Object (${Object.keys(value).length} properties)`;
    }
    if (typeof value === 'string') {
      return `String (${value.length} chars)`;
    }
    return typeof value;
  }

  /**
   * Navigate to a nested property in the variables object
   * @param {string} path - Dot-separated path (e.g., "user.address.city")
   * @returns {*} - The value at the path, or undefined
   */
  getValueAtPath(path) {
    const parts = path.split('.');
    let current = this.variables[parts[0]];
    
    for (let i = 1; i < parts.length; i++) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      if (Array.isArray(current) && current.length > 0) {
        current = current[0][parts[i]];
      } else if (typeof current === 'object') {
        current = current[parts[i]];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Format a value for display in hover
   * @param {*} value - The value to format
   * @param {number} maxLength - Maximum length for the formatted string
   * @returns {string} - Formatted value
   */
  formatValue(value, maxLength = 200) {
    if (value === undefined) {
      return 'undefined';
    }
    
    const jsonStr = JSON.stringify(value, null, 2);
    if (jsonStr.length <= maxLength) {
      return jsonStr;
    }
    
    // For long values, show a truncated version
    if (Array.isArray(value)) {
      const preview = value.slice(0, 3);
      return JSON.stringify(preview, null, 2) + `\n... (${value.length} items total)`;
    }
    
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value).slice(0, 5);
      const preview = {};
      keys.forEach(key => {
        preview[key] = value[key];
      });
      const previewStr = JSON.stringify(preview, null, 2);
      const totalKeys = Object.keys(value).length;
      if (totalKeys > keys.length) {
        return previewStr.slice(0, -2) + `,\n  ... (${totalKeys} properties total)\n}`;
      }
      return previewStr;
    }
    
    return jsonStr.substring(0, maxLength) + '...';
  }

  /**
   * Provide hover information for a position in the document
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @returns {Promise<vscode.Hover | null>}
   */
  async provideHover(document, position) {
    const line = document.lineAt(position).text;
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
    
    if (!wordRange) {
      return null;
    }
    
    const word = document.getText(wordRange);
    
    // Check if inside Jinja syntax
    if (!this.isPositionInsideJinja(line, wordRange.start.character, wordRange.end.character)) {
      return null;
    }
    
    const textBeforeWord = line.substring(0, wordRange.start.character);
    const textAfterWord = line.substring(wordRange.end.character);
    
    // 1. Check for filters (after |)
    if (/\|\s*$/.test(textBeforeWord)) {
      const filterDoc = this.getFilterDocumentation(word);
      if (filterDoc) {
        return new vscode.Hover(filterDoc, wordRange);
      }
    }
    
    // 2. Check for Jinja tests (after "is")
    if (/\bis\s+(?:not\s+)?$/i.test(textBeforeWord)) {
      const testDoc = this.getJinjaTestDoc(word);
      if (testDoc) {
        return new vscode.Hover(testDoc, wordRange);
      }
    }
    
    // 3. Check for macro calls (word followed by parenthesis)
    if (/^\s*\(/.test(textAfterWord)) {
      // Check if it's a module.macro() call
      const moduleMatch = textBeforeWord.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*$/);
      if (moduleMatch) {
        const macroHover = await this.getMacroHover(document, word, moduleMatch[1]);
        if (macroHover) {
          return new vscode.Hover(macroHover, wordRange);
        }
      } else {
        // Direct macro call
        const macroHover = await this.getMacroHover(document, word, null);
        if (macroHover) {
          return new vscode.Hover(macroHover, wordRange);
        }
      }
    }
    
    // 4. Check for block names (after {% block)
    if (/\{%[-+]?\s*block\s+$/.test(textBeforeWord)) {
      const blockHover = await this.getBlockHover(document, word);
      if (blockHover) {
        return new vscode.Hover(blockHover, wordRange);
      }
    }
    
    // 5. Check for Jinja keywords (after {% or general keywords)
    const isDottedPath = /\.\s*$/.test(textBeforeWord) || /^\s*\./.test(textAfterWord);
    if (!isDottedPath) {
      const keywordDoc = this.getJinjaKeywordDoc(word);
      if (keywordDoc) {
        return new vscode.Hover(keywordDoc, wordRange);
      }
    }
    
    return null;
  }

  /**
   * Get variable path and context at position
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {string} line
   * @returns {{fullPath: string, range: vscode.Range, isInsideJinja: boolean} | null}
   */
  getVariableAtPosition(document, position, line) {
    // Try to match variable paths with dots
    const extendedRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/
    );
    
    if (!extendedRange) {
      return null;
    }
    
    const fullPath = document.getText(extendedRange);
    
    // Check if we're inside Jinja syntax with improved detection
    const isInsideJinja = this.isPositionInsideJinja(line, extendedRange.start.character, extendedRange.end.character);
    
    return {
      fullPath,
      range: extendedRange,
      isInsideJinja
    };
  }

  /**
   * Check if a position range is inside Jinja syntax
   * @param {string} line
   * @param {number} startChar
   * @param {number} endChar
   * @returns {boolean}
   */
  isPositionInsideJinja(line, startChar, endChar) {
    // Simple approach: count delimiters before the position
    const beforeText = line.substring(0, endChar);
    const afterText = line.substring(startChar);
    
    // Count opening and closing delimiters for {{ }}
    const varOpenCount = (beforeText.match(/\{\{/g) || []).length;
    const varCloseCount = (beforeText.match(/\}\}/g) || []).length;
    const hasVarCloseAfter = /\}\}/.test(afterText);
    
    // If we have more opens than closes before, and a close after, we're inside {{ }}
    if (varOpenCount > varCloseCount && hasVarCloseAfter) {
      return true;
    }
    
    // Count opening and closing delimiters for {% %}
    const stmtOpenCount = (beforeText.match(/\{%/g) || []).length;
    const stmtCloseCount = (beforeText.match(/%\}/g) || []).length;
    const hasStmtCloseAfter = /%\}/.test(afterText);
    
    // If we have more opens than closes before, and a close after, we're inside {% %}
    if (stmtOpenCount > stmtCloseCount && hasStmtCloseAfter) {
      return true;
    }
    
    return false;
  }

  /**
   * Get hover information for a macro
   * @param {vscode.TextDocument} document
   * @param {string} macroName
   * @param {string|null} moduleName - The import alias if it's module.macro() call
   * @returns {Promise<vscode.MarkdownString | null>}
   */
  async getMacroHover(document, macroName, moduleName) {
    const text = document.getText();
    const currentFilePath = document.uri.fsPath;
    
    // If moduleName provided, find the import and look in that file
    if (moduleName) {
      const importInfo = this.findImportInfo(text, moduleName);
      if (importInfo) {
        const resolvedPath = await this.resolveTemplatePath(importInfo.path, currentFilePath);
        if (resolvedPath) {
          const macroInfo = await this.findMacroInFile(resolvedPath, macroName);
          if (macroInfo) {
            return this.formatMacroHover(macroInfo, importInfo.path);
          }
        }
      }
      return null;
    }
    
    // Search in current file first
    const localMacro = this.findMacroInText(text, macroName);
    if (localMacro) {
      return this.formatMacroHover(localMacro, null);
    }
    
    // Search in from-imports
    const fromImportInfo = this.findFromImportInfo(text, macroName);
    if (fromImportInfo) {
      const resolvedPath = await this.resolveTemplatePath(fromImportInfo.path, currentFilePath);
      if (resolvedPath) {
        const macroInfo = await this.findMacroInFile(resolvedPath, fromImportInfo.originalName);
        if (macroInfo) {
          return this.formatMacroHover(macroInfo, fromImportInfo.path);
        }
      }
    }
    
    // Search in included/imported templates
    const referencedTemplates = this.extractReferencedTemplates(text);
    for (const templatePath of referencedTemplates) {
      const resolvedPath = await this.resolveTemplatePath(templatePath, currentFilePath);
      if (resolvedPath) {
        const macroInfo = await this.findMacroInFile(resolvedPath, macroName);
        if (macroInfo) {
          return this.formatMacroHover(macroInfo, templatePath);
        }
      }
    }
    
    return null;
  }

  /**
   * Find import info for a module alias
   */
  findImportInfo(text, alias) {
    const importPattern = new RegExp(
      `\\{%[-+]?\\s*import\\s+['"]([^'"]+)['"]\\s+as\\s+${alias}\\s*[-+]?%\\}`,
      'i'
    );
    const match = text.match(importPattern);
    if (match) {
      return { path: match[1], alias };
    }
    return null;
  }

  /**
   * Find from-import info for a specific name
   */
  findFromImportInfo(text, name) {
    const fromImportPattern = /\{%[-+]?\s*from\s+['"]([^'"]+)['"]\s+import\s+([^%]+)[-+]?%\}/gi;
    let match;
    while ((match = fromImportPattern.exec(text)) !== null) {
      const filePath = match[1];
      const imports = match[2].split(',').map(item => {
        const parts = item.trim().split(/\s+as\s+/i);
        return {
          originalName: parts[0].trim(),
          alias: parts.length > 1 ? parts[1].trim() : parts[0].trim()
        };
      });
      
      const found = imports.find(i => i.alias === name || i.originalName === name);
      if (found) {
        return { path: filePath, ...found };
      }
    }
    return null;
  }

  /**
   * Find macro definition in text and extract info
   */
  findMacroInText(text, macroName) {
    const macroPattern = new RegExp(
      `\\{%[-+]?\\s*macro\\s+(${macroName})\\s*\\(([^)]*)\\)\\s*[-+]?%\\}`,
      'gi'
    );
    
    const match = macroPattern.exec(text);
    if (match && match[1] === macroName) {
      const params = this.parseParameters(match[2]);
      return { name: macroName, params, raw: match[0] };
    }
    return null;
  }

  /**
   * Find macro in a file
   */
  async findMacroInFile(filePath, macroName) {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      return this.findMacroInText(text, macroName);
    } catch {
      return null;
    }
  }

  /**
   * Parse macro parameters into structured format
   */
  parseParameters(paramsStr) {
    if (!paramsStr.trim()) return [];
    
    return paramsStr.split(',').map(p => {
      const trimmed = p.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex !== -1) {
        return {
          name: trimmed.substring(0, eqIndex).trim(),
          defaultValue: trimmed.substring(eqIndex + 1).trim()
        };
      }
      return { name: trimmed, defaultValue: null };
    });
  }

  /**
   * Format macro info as hover markdown
   */
  formatMacroHover(macroInfo, sourceFile) {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    // Build signature
    const paramsStr = macroInfo.params.map(p => {
      if (p.defaultValue) {
        return `${p.name}=${p.defaultValue}`;
      }
      return p.name;
    }).join(', ');
    
    markdown.appendMarkdown(`### Macro: \`${macroInfo.name}\`\n\n`);
    markdown.appendCodeblock(`{% macro ${macroInfo.name}(${paramsStr}) %}`, 'jinja');
    
    if (macroInfo.params.length > 0) {
      markdown.appendMarkdown('\n**Parameters:**\n');
      macroInfo.params.forEach(p => {
        if (p.defaultValue) {
          markdown.appendMarkdown(`- \`${p.name}\` (default: \`${p.defaultValue}\`)\n`);
        } else {
          markdown.appendMarkdown(`- \`${p.name}\` *(required)*\n`);
        }
      });
    }
    
    if (sourceFile) {
      markdown.appendMarkdown(`\n*Defined in: ${sourceFile}*`);
    }
    
    return markdown;
  }

  /**
   * Get hover for a block
   */
  async getBlockHover(document, blockName) {
    const text = document.getText();
    const currentFilePath = document.uri.fsPath;
    
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    markdown.appendMarkdown(`### Block: \`${blockName}\`\n\n`);
    markdown.appendCodeblock(`{% block ${blockName} %}...{% endblock %}`, 'jinja');
    
    // Check if this template extends another
    const extendsMatch = text.match(/\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/i);
    if (extendsMatch) {
      markdown.appendMarkdown(`\n*Overrides block from: ${extendsMatch[1]}*\n`);
      markdown.appendMarkdown(`\nUse \`{{ super() }}\` to include parent content.`);
    } else {
      markdown.appendMarkdown(`\nTemplate block for inheritance. Child templates can override this block.`);
    }
    
    return markdown;
  }

  /**
   * Extract referenced template paths
   */
  extractReferencedTemplates(text) {
    const refs = new Set();
    const patterns = [
      /\{%[-+]?\s*include\s+['"]([^'"]+)['"]/gi,
      /\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/gi,
      /\{%[-+]?\s*import\s+['"]([^'"]+)['"]/gi,
      /\{%[-+]?\s*from\s+['"]([^'"]+)['"]/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        refs.add(match[1]);
      }
    }
    return Array.from(refs);
  }

  /**
   * Resolve template path relative to current file
   */
  async resolveTemplatePath(templatePath, currentFilePath) {
    const currentDir = path.dirname(currentFilePath);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders ? workspaceFolders[0].uri.fsPath : null;
    
    const candidates = [
      path.resolve(currentDir, templatePath),
      workspaceRoot ? path.resolve(workspaceRoot, templatePath) : null,
      workspaceRoot ? path.resolve(workspaceRoot, 'templates', templatePath) : null,
    ].filter(Boolean);
    
    // Try configured search paths
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
    
    for (const candidate of candidates) {
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(candidate));
        return candidate;
      } catch {
        // Continue
      }
    }
    return null;
  }

  /**
   * Get hover for Jinja keywords, filters, or tests
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {string} line
   * @returns {vscode.Hover | null}
   */
  getKeywordHover(document, position, line) {
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
    
    if (!wordRange) {
      return null;
    }
    
    const word = document.getText(wordRange);
    
    // Check if inside Jinja syntax
    if (!this.isPositionInsideJinja(line, wordRange.start.character, wordRange.end.character)) {
      return null;
    }
    
    const textBeforeWord = line.substring(0, wordRange.start.character);
    const textAfterWord = line.substring(wordRange.end.character);
    
    // Check for Jinja filters (after pipe) - highest priority
    if (/\|\s*$/.test(textBeforeWord)) {
      const filterDoc = this.getFilterDocumentation(word);
      if (filterDoc) {
        return new vscode.Hover(filterDoc, wordRange);
      }
    }
    
    // Check for Jinja tests (after "is") - high priority
    if (/\bis\s+(?:not\s+)?$/i.test(textBeforeWord)) {
      const testDoc = this.getJinjaTestDoc(word);
      if (testDoc) {
        return new vscode.Hover(testDoc, wordRange);
      }
    }
    
    // Check for Jinja keywords - only if it looks like a keyword context
    // Keywords typically appear after {% or at the start of statements
    // Don't show keyword hover if it's part of a dotted path (variable.property)
    const isDottedPath = /\.\s*$/.test(textBeforeWord) || /^\s*\./.test(textAfterWord);
    
    if (!isDottedPath) {
      const keywordDoc = this.getJinjaKeywordDoc(word);
      if (keywordDoc) {
        // Only show keyword hover if it's in a keyword position
        // (after {%, not after a variable or operator)
        if (/\{%\s+[a-zA-Z_]*$/.test(textBeforeWord) || /^\s*%\}/.test(textAfterWord)) {
          return new vscode.Hover(keywordDoc, wordRange);
        }
      }
    }
    
    return null;
  }

  /**
   * Get documentation for Jinja keywords
   * @param {string} keyword
   * @returns {vscode.MarkdownString | null}
   */
  getJinjaKeywordDoc(keyword) {
    const keywords = {
      'for': {
        description: 'Loop over a sequence or iterable',
        syntax: '{% for item in sequence %}...{% endfor %}',
        examples: [
          '{% for user in users %}{{ user.name }}{% endfor %}',
          '{% for key, value in dict.items() %}{{ key }}: {{ value }}{% endfor %}'
        ]
      },
      'endfor': {
        description: 'Ends a for loop block',
        syntax: '{% endfor %}'
      },
      'if': {
        description: 'Conditional statement',
        syntax: '{% if condition %}...{% endif %}',
        examples: [
          '{% if user.is_active %}Active{% endif %}',
          '{% if count > 0 %}{{ count }} items{% else %}No items{% endif %}'
        ]
      },
      'elif': {
        description: 'Else-if condition (alternative condition)',
        syntax: '{% if cond1 %}...{% elif cond2 %}...{% endif %}'
      },
      'else': {
        description: 'Alternative branch for if/for statements',
        syntax: '{% if condition %}...{% else %}...{% endif %}'
      },
      'endif': {
        description: 'Ends an if conditional block',
        syntax: '{% endif %}'
      },
      'set': {
        description: 'Assign value to a variable',
        syntax: '{% set variable = value %}',
        examples: [
          '{% set name = "John" %}',
          '{% set total = items | length %}'
        ]
      },
      'block': {
        description: 'Define a template block for inheritance',
        syntax: '{% block name %}...{% endblock %}',
        examples: ['{% block content %}Default content{% endblock %}']
      },
      'endblock': {
        description: 'Ends a block definition',
        syntax: '{% endblock %}'
      },
      'extends': {
        description: 'Inherit from a parent template',
        syntax: '{% extends "template.html" %}',
        examples: ['{% extends "base.html" %}']
      },
      'include': {
        description: 'Include another template',
        syntax: '{% include "template.html" %}',
        examples: ['{% include "header.html" %}']
      },
      'macro': {
        description: 'Define a reusable macro (like a function)',
        syntax: '{% macro name(args) %}...{% endmacro %}',
        examples: ['{% macro render_user(user) %}{{ user.name }}{% endmacro %}']
      },
      'endmacro': {
        description: 'Ends a macro definition',
        syntax: '{% endmacro %}'
      },
      'with': {
        description: 'Create a scoped context with variables',
        syntax: '{% with var = value %}...{% endwith %}',
        examples: ['{% with total = items | length %}{{ total }} items{% endwith %}']
      },
      'endwith': {
        description: 'Ends a with block',
        syntax: '{% endwith %}'
      },
      'import': {
        description: 'Import macros from another template',
        syntax: '{% import "macros.html" as macros %}',
        examples: ['{% import "forms.html" as forms %}']
      },
      'from': {
        description: 'Import specific items from a template',
        syntax: '{% from "template.html" import macro %}',
        examples: ['{% from "forms.html" import input, textarea %}']
      },
      'raw': {
        description: 'Output content without processing Jinja syntax',
        syntax: '{% raw %}...{% endraw %}',
        examples: ['{% raw %}{{ this will not be processed }}{% endraw %}']
      },
      'endraw': {
        description: 'Ends a raw block',
        syntax: '{% endraw %}'
      },
      'filter': {
        description: 'Apply a filter to a block of content',
        syntax: '{% filter name %}...{% endfilter %}',
        examples: ['{% filter upper %}lowercase text{% endfilter %}']
      },
      'endfilter': {
        description: 'Ends a filter block',
        syntax: '{% endfilter %}'
      },
      'in': {
        description: 'Membership test operator - check if value is in a sequence',
        syntax: '{% if item in list %}...{% endif %}',
        examples: [
          '{% if "admin" in user.roles %}...',
          '{% for item in items %}...'
        ]
      },
      'not': {
        description: 'Logical NOT operator - negates a boolean expression',
        syntax: '{% if not condition %}...{% endif %}',
        examples: [
          '{% if not user.is_active %}...',
          '{% if item not in list %}...'
        ]
      },
      'and': {
        description: 'Logical AND operator - both conditions must be true',
        syntax: '{% if condition1 and condition2 %}...{% endif %}',
        examples: [
          '{% if user.is_active and user.is_verified %}...',
          '{% if count > 0 and count < 100 %}...'
        ]
      },
      'or': {
        description: 'Logical OR operator - at least one condition must be true',
        syntax: '{% if condition1 or condition2 %}...{% endif %}',
        examples: [
          '{% if user.is_admin or user.is_moderator %}...',
          '{% if count == 0 or count > 100 %}...'
        ]
      },
      'is': {
        description: 'Test operator - check if value matches a test',
        syntax: '{% if variable is test %}...{% endif %}',
        examples: [
          '{% if user is defined %}...',
          '{% if count is even %}...',
          '{% if value is none %}...'
        ]
      },
      'true': {
        description: 'Boolean literal - represents true value',
        syntax: 'true',
        examples: [
          '{% set active = true %}',
          '{% if flag == true %}...'
        ]
      },
      'false': {
        description: 'Boolean literal - represents false value',
        syntax: 'false',
        examples: [
          '{% set active = false %}',
          '{% if flag == false %}...'
        ]
      },
      'none': {
        description: 'Null literal - represents null/none value',
        syntax: 'none',
        examples: [
          '{% set value = none %}',
          '{% if result is none %}...'
        ]
      },
      'as': {
        description: 'Alias operator - create an alias for imported items or loop variables',
        syntax: '{% import "template" as alias %}',
        examples: [
          '{% import "macros.html" as macros %}',
          '{% with total = items | length as count %}...'
        ]
      }
    };
    
    const doc = keywords[keyword.toLowerCase()];
    if (!doc) {
      return null;
    }
    
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    markdown.appendMarkdown(`### Jinja Keyword: \`${keyword}\`\n\n`);
    markdown.appendMarkdown(`${doc.description}\n\n`);
    markdown.appendMarkdown(`**Syntax:**\n\`\`\`jinja\n${doc.syntax}\n\`\`\`\n\n`);
    
    if (doc.examples && doc.examples.length > 0) {
      markdown.appendMarkdown(`**Examples:**\n`);
      doc.examples.forEach(ex => {
        markdown.appendMarkdown(`\`\`\`jinja\n${ex}\n\`\`\`\n`);
      });
    }
    
    return markdown;
  }

  /**
   * Get documentation for Jinja tests
   * @param {string} testName
   * @returns {vscode.MarkdownString | null}
   */
  getJinjaTestDoc(testName) {
    const tests = {
      'defined': {
        description: 'Check if a variable is defined in the current context',
        example: '{% if variable is defined %}...{% endif %}'
      },
      'undefined': {
        description: 'Check if a variable is undefined',
        example: '{% if variable is undefined %}...{% endif %}'
      },
      'none': {
        description: 'Check if a variable is None/null',
        example: '{% if value is none %}...{% endif %}'
      },
      'even': {
        description: 'Check if a number is even',
        example: '{% if count is even %}...{% endif %}'
      },
      'odd': {
        description: 'Check if a number is odd',
        example: '{% if count is odd %}...{% endif %}'
      },
      'divisibleby': {
        description: 'Check if a number is divisible by another number',
        example: '{% if count is divisibleby(3) %}...{% endif %}'
      },
      'iterable': {
        description: 'Check if a variable is iterable (list, tuple, etc.)',
        example: '{% if items is iterable %}...{% endif %}'
      },
      'sequence': {
        description: 'Check if a variable is a sequence',
        example: '{% if items is sequence %}...{% endif %}'
      },
      'mapping': {
        description: 'Check if a variable is a mapping (dict)',
        example: '{% if data is mapping %}...{% endif %}'
      },
      'number': {
        description: 'Check if a variable is a number',
        example: '{% if value is number %}...{% endif %}'
      },
      'string': {
        description: 'Check if a variable is a string',
        example: '{% if value is string %}...{% endif %}'
      },
      'boolean': {
        description: 'Check if a variable is a boolean',
        example: '{% if value is boolean %}...{% endif %}'
      },
      'true': {
        description: 'Check if a variable is exactly True',
        example: '{% if flag is true %}...{% endif %}'
      },
      'false': {
        description: 'Check if a variable is exactly False',
        example: '{% if flag is false %}...{% endif %}'
      },
      'lower': {
        description: 'Check if a string is lowercase',
        example: '{% if text is lower %}...{% endif %}'
      },
      'upper': {
        description: 'Check if a string is uppercase',
        example: '{% if text is upper %}...{% endif %}'
      },
      'equalto': {
        description: 'Check if a value equals another value',
        example: '{% if count is equalto(5) %}...{% endif %}'
      },
      'sameas': {
        description: 'Check if values are the same object',
        example: '{% if var1 is sameas(var2) %}...{% endif %}'
      }
    };
    
    const test = tests[testName.toLowerCase()];
    if (!test) {
      return null;
    }
    
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    markdown.appendMarkdown(`### Jinja Test: \`${testName}\`\n\n`);
    markdown.appendMarkdown(`${test.description}\n\n`);
    markdown.appendMarkdown(`**Example:**\n\`\`\`jinja\n${test.example}\n\`\`\`\n`);
    
    return markdown;
  }

  /**
   * Provide hover information for Jinja filters
   * @param {string} filterName - Name of the filter
   * @returns {vscode.MarkdownString | null}
   */
  getFilterDocumentation(filterName) {
    const filters = {
      // String filters
      'lower': {
        signature: 'lower',
        description: 'Convert a string to lowercase.',
        example: '{{ "HELLO" | lower }}  →  hello'
      },
      'upper': {
        signature: 'upper',
        description: 'Convert a string to uppercase.',
        example: '{{ "hello" | upper }}  →  HELLO'
      },
      'capitalize': {
        signature: 'capitalize',
        description: 'Capitalize the first character, lowercase the rest.',
        example: '{{ "hELLO" | capitalize }}  →  Hello'
      },
      'title': {
        signature: 'title',
        description: 'Return titlecased string (first letter of each word uppercase).',
        example: '{{ "hello world" | title }}  →  Hello World'
      },
      'trim': {
        signature: 'trim(chars=None)',
        description: 'Strip leading and trailing whitespace (or specified chars).',
        example: '{{ "  hello  " | trim }}  →  hello'
      },
      'strip': {
        signature: 'strip',
        description: 'Alias for trim. Strip leading and trailing whitespace.',
        example: '{{ "  hello  " | strip }}  →  hello'
      },
      'lstrip': {
        signature: 'lstrip',
        description: 'Strip leading whitespace.',
        example: '{{ "  hello" | lstrip }}  →  hello'
      },
      'rstrip': {
        signature: 'rstrip',
        description: 'Strip trailing whitespace.',
        example: '{{ "hello  " | rstrip }}  →  hello'
      },
      'replace': {
        signature: 'replace(old, new, count=None)',
        description: 'Replace occurrences of old with new. Optional count limits replacements.',
        example: '{{ "hello" | replace("l", "L") }}  →  heLLo'
      },
      'truncate': {
        signature: 'truncate(length=255, killwords=False, end="...", leeway=0)',
        description: 'Truncate string to specified length, adding ellipsis.',
        example: '{{ "hello world" | truncate(8) }}  →  hello...'
      },
      'wordwrap': {
        signature: 'wordwrap(width=79, break_long_words=True, wrapstring="\\n")',
        description: 'Wrap text at specified width.',
        example: '{{ text | wordwrap(40) }}'
      },
      'center': {
        signature: 'center(width)',
        description: 'Center the string in a field of given width.',
        example: '{{ "hi" | center(10) }}  →  "    hi    "'
      },
      'indent': {
        signature: 'indent(width=4, first=False, blank=False)',
        description: 'Indent lines with specified number of spaces.',
        example: '{{ text | indent(4) }}'
      },
      'striptags': {
        signature: 'striptags',
        description: 'Strip HTML/XML tags from a string.',
        example: '{{ "<p>Hello</p>" | striptags }}  →  Hello'
      },
      'escape': {
        signature: 'escape',
        description: 'Escape HTML characters (&, <, >, ", \').',
        example: '{{ "<script>" | escape }}  →  &lt;script&gt;'
      },
      'e': {
        signature: 'e',
        description: 'Alias for escape. Escape HTML characters.',
        example: '{{ "<div>" | e }}  →  &lt;div&gt;'
      },
      'safe': {
        signature: 'safe',
        description: 'Mark string as safe HTML (prevent auto-escaping).',
        example: '{{ html_content | safe }}'
      },
      'forceescape': {
        signature: 'forceescape',
        description: 'Force HTML escaping even if marked safe.',
        example: '{{ content | forceescape }}'
      },
      'urlencode': {
        signature: 'urlencode',
        description: 'URL encode a string or dictionary.',
        example: '{{ "hello world" | urlencode }}  →  hello%20world'
      },
      'urlize': {
        signature: 'urlize(trim_url_limit=None, nofollow=False, target=None)',
        description: 'Convert URLs in text to clickable links.',
        example: '{{ "Visit example.com" | urlize }}'
      },
      'wordcount': {
        signature: 'wordcount',
        description: 'Count the words in a string.',
        example: '{{ "hello world" | wordcount }}  →  2'
      },
      'format': {
        signature: 'format(*args, **kwargs)',
        description: 'Apply Python string formatting.',
        example: '{{ "Hello %s" | format(name) }}'
      },
      'split': {
        signature: 'split(separator=None, maxsplit=-1)',
        description: 'Split string into a list by separator.',
        example: '{{ "a,b,c" | split(",") }}  →  ["a", "b", "c"]'
      },
      
      // Number filters
      'abs': {
        signature: 'abs',
        description: 'Return the absolute value of a number.',
        example: '{{ -5 | abs }}  →  5'
      },
      'round': {
        signature: 'round(precision=0, method="common")',
        description: 'Round number to given precision. Methods: common, ceil, floor.',
        example: '{{ 42.55 | round(1) }}  →  42.6'
      },
      'int': {
        signature: 'int(default=0, base=10)',
        description: 'Convert value to integer.',
        example: '{{ "42" | int }}  →  42'
      },
      'float': {
        signature: 'float(default=0.0)',
        description: 'Convert value to floating point number.',
        example: '{{ "3.14" | float }}  →  3.14'
      },
      'filesizeformat': {
        signature: 'filesizeformat(binary=False)',
        description: 'Format bytes as human-readable file size.',
        example: '{{ 1024 | filesizeformat }}  →  1.0 kB'
      },
      
      // List/Sequence filters
      'length': {
        signature: 'length',
        description: 'Return the number of items in a sequence or mapping.',
        example: '{{ [1,2,3] | length }}  →  3'
      },
      'count': {
        signature: 'count',
        description: 'Alias for length. Return number of items.',
        example: '{{ items | count }}'
      },
      'first': {
        signature: 'first',
        description: 'Return the first item of a sequence.',
        example: '{{ [1,2,3] | first }}  →  1'
      },
      'last': {
        signature: 'last',
        description: 'Return the last item of a sequence.',
        example: '{{ [1,2,3] | last }}  →  3'
      },
      'random': {
        signature: 'random',
        description: 'Return a random item from the sequence.',
        example: '{{ [1,2,3] | random }}'
      },
      'reverse': {
        signature: 'reverse',
        description: 'Reverse the sequence.',
        example: '{{ [1,2,3] | reverse | list }}  →  [3,2,1]'
      },
      'sort': {
        signature: 'sort(reverse=False, case_sensitive=False, attribute=None)',
        description: 'Sort an iterable. Use attribute for objects.',
        example: '{{ users | sort(attribute="name") }}'
      },
      'unique': {
        signature: 'unique(case_sensitive=False, attribute=None)',
        description: 'Return unique items from sequence.',
        example: '{{ [1,1,2,2,3] | unique | list }}  →  [1,2,3]'
      },
      'join': {
        signature: 'join(separator="", attribute=None)',
        description: 'Join sequence items into a string.',
        example: '{{ ["a","b","c"] | join(", ") }}  →  a, b, c'
      },
      'list': {
        signature: 'list',
        description: 'Convert value to a list.',
        example: '{{ "abc" | list }}  →  ["a","b","c"]'
      },
      'batch': {
        signature: 'batch(linecount, fill_with=None)',
        description: 'Split sequence into batches of N items.',
        example: '{{ [1,2,3,4,5] | batch(2) | list }}'
      },
      'slice': {
        signature: 'slice(slices, fill_with=None)',
        description: 'Slice sequence into N roughly equal parts.',
        example: '{{ items | slice(3) }}'
      },
      'sum': {
        signature: 'sum(attribute=None, start=0)',
        description: 'Sum numeric values. Use attribute for objects.',
        example: '{{ [1,2,3] | sum }}  →  6'
      },
      'min': {
        signature: 'min(case_sensitive=False, attribute=None)',
        description: 'Return the smallest item.',
        example: '{{ [3,1,2] | min }}  →  1'
      },
      'max': {
        signature: 'max(case_sensitive=False, attribute=None)',
        description: 'Return the largest item.',
        example: '{{ [1,3,2] | max }}  →  3'
      },
      'map': {
        signature: 'map(filter_or_attribute, *args, **kwargs)',
        description: 'Apply filter or extract attribute from each item.',
        example: '{{ users | map(attribute="name") | list }}'
      },
      'select': {
        signature: 'select(test_or_attribute=None)',
        description: 'Filter items that pass a test.',
        example: '{{ numbers | select("odd") | list }}'
      },
      'selectattr': {
        signature: 'selectattr(attribute, test=None, value=None)',
        description: 'Filter objects by attribute test.',
        example: '{{ users | selectattr("active", "eq", true) | list }}'
      },
      'reject': {
        signature: 'reject(test_or_attribute=None)',
        description: 'Filter out items that pass a test.',
        example: '{{ numbers | reject("odd") | list }}'
      },
      'rejectattr': {
        signature: 'rejectattr(attribute, test=None, value=None)',
        description: 'Filter out objects by attribute test.',
        example: '{{ users | rejectattr("active") | list }}'
      },
      'groupby': {
        signature: 'groupby(attribute, default=None)',
        description: 'Group items by an attribute.',
        example: '{% for group in users | groupby("role") %}'
      },
      
      // Dictionary filters
      'dictsort': {
        signature: 'dictsort(case_sensitive=False, by="key", reverse=False)',
        description: 'Sort dictionary by key or value.',
        example: '{{ mydict | dictsort }}'
      },
      'items': {
        signature: 'items',
        description: 'Return dictionary items as (key, value) pairs.',
        example: '{% for k, v in mydict | items %}'
      },
      'keys': {
        signature: 'keys',
        description: 'Return dictionary keys.',
        example: '{{ mydict | keys | list }}'
      },
      'values': {
        signature: 'values',
        description: 'Return dictionary values.',
        example: '{{ mydict | values | list }}'
      },
      'attr': {
        signature: 'attr(name)',
        description: 'Get attribute from object (like getattr).',
        example: '{{ obj | attr("name") }}'
      },
      
      // Default/Fallback filters
      'default': {
        signature: 'default(default_value="", boolean=False)',
        description: 'Return default if value is undefined. Set boolean=True for falsy values.',
        example: '{{ name | default("Anonymous") }}'
      },
      'd': {
        signature: 'd(default_value="", boolean=False)',
        description: 'Alias for default filter.',
        example: '{{ name | d("Anonymous") }}'
      },
      
      // Serialization filters
      'tojson': {
        signature: 'tojson(indent=None)',
        description: 'Serialize value to JSON string.',
        example: '{{ data | tojson(indent=2) }}'
      },
      'pprint': {
        signature: 'pprint',
        description: 'Pretty print a variable for debugging.',
        example: '{{ complex_data | pprint }}'
      },
      'string': {
        signature: 'string',
        description: 'Convert value to string.',
        example: '{{ 42 | string }}'
      },
      'xmlattr': {
        signature: 'xmlattr(autospace=True)',
        description: 'Create XML/HTML attribute string from dict.',
        example: '{{ {"class": "btn", "id": "submit"} | xmlattr }}'
      }
    };
    
    const filter = filters[filterName];
    if (!filter) {
      return null;
    }
    
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    markdown.appendMarkdown(`### Filter: \`${filterName}\`\n\n`);
    markdown.appendMarkdown(`**Signature:** \`${filter.signature}\`\n\n`);
    markdown.appendMarkdown(`${filter.description}\n\n`);
    markdown.appendMarkdown(`**Example:**\n\`\`\`jinja\n${filter.example}\n\`\`\`\n`);
    
    return markdown;
  }
}

module.exports = { JinjaHoverProvider };
