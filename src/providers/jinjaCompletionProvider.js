const vscode = require('vscode');

/**
 * Provides autocomplete suggestions for Jinja2 templates
 */
class JinjaCompletionProvider {
  constructor() {
    this.variables = {};
    this.lastDocument = null;
  }

  /**
   * Update the variables cache for autocomplete
   * @param {Object} variables - The variables object from variable extraction
   */
  updateVariables(variables) {
    this.variables = variables || {};
  }

  /**
   * Get all property paths from a nested object
   * @param {Object} obj - The object to traverse
   * @param {string} prefix - Current path prefix
   * @returns {Array<string>} - Array of property paths
   */
  getPropertyPaths(obj, prefix = '') {
    const paths = [];
    
    if (typeof obj !== 'object' || obj === null) {
      return paths;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object') {
        // Get paths from first array item
        const itemPaths = this.getPropertyPaths(obj[0], '');
        itemPaths.forEach(path => paths.push(path));
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        paths.push(currentPath);
        
        if (typeof value === 'object' && value !== null) {
          const subPaths = this.getPropertyPaths(value, currentPath);
          paths.push(...subPaths);
        }
      }
    }
    
    return paths;
  }

  /**
   * Get the type of a value for display
   * @param {*} value - The value to check
   * @returns {string} - Type description
   */
  getTypeDescription(value) {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return typeof value;
  }

  /**
   * Get completion items based on the current context
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @returns {vscode.CompletionItem[]}
   */
  provideCompletionItems(document, position) {
    const line = document.lineAt(position).text;
    const textBeforeCursor = line.substring(0, position.character);
    
    // Check if we're inside Jinja syntax
    const inVariable = /\{\{[^}]*$/.test(textBeforeCursor);
    const inStatement = /\{%[^%]*$/.test(textBeforeCursor);
    
    if (!inVariable && !inStatement) {
      return [];
    }
    
    const completions = [];
    
    // Extract the partial text being typed
    const jinjaMatch = textBeforeCursor.match(/[\{\{%]\s*([a-zA-Z0-9_.]*)$/);
    if (!jinjaMatch) {
      return [];
    }
    
    const partial = jinjaMatch[1];
    const parts = partial.split('.');
    
    if (parts.length === 1) {
      // Suggest top-level variables
      for (const [varName, value] of Object.entries(this.variables)) {
        const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
        item.detail = this.getTypeDescription(value);
        item.documentation = new vscode.MarkdownString(`**Type:** ${item.detail}\n\n**Value:** \`${JSON.stringify(value, null, 2).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\``);
        item.sortText = `0_${varName}`;
        completions.push(item);
      }
      
      // Add common Jinja keywords and filters
      const keywords = [
        { name: 'for', kind: vscode.CompletionItemKind.Keyword, detail: 'Loop statement' },
        { name: 'if', kind: vscode.CompletionItemKind.Keyword, detail: 'Conditional statement' },
        { name: 'elif', kind: vscode.CompletionItemKind.Keyword, detail: 'Else if statement' },
        { name: 'else', kind: vscode.CompletionItemKind.Keyword, detail: 'Else statement' },
        { name: 'endif', kind: vscode.CompletionItemKind.Keyword, detail: 'End if block' },
        { name: 'endfor', kind: vscode.CompletionItemKind.Keyword, detail: 'End for loop' },
        { name: 'set', kind: vscode.CompletionItemKind.Keyword, detail: 'Variable assignment' },
        { name: 'block', kind: vscode.CompletionItemKind.Keyword, detail: 'Template block' },
        { name: 'extends', kind: vscode.CompletionItemKind.Keyword, detail: 'Template inheritance' },
        { name: 'include', kind: vscode.CompletionItemKind.Keyword, detail: 'Include template' },
        { name: 'macro', kind: vscode.CompletionItemKind.Keyword, detail: 'Define macro' },
        { name: 'with', kind: vscode.CompletionItemKind.Keyword, detail: 'Scoped context' },
      ];
      
      keywords.forEach(({ name, kind, detail }) => {
        if (inStatement) {
          const item = new vscode.CompletionItem(name, kind);
          item.detail = detail;
          item.sortText = `1_${name}`;
          completions.push(item);
        }
      });
      
    } else {
      // Suggest nested properties
      const rootVar = parts[0];
      
      // Navigate to the current object
      let currentObj = this.variables[rootVar];
      for (let i = 1; i < parts.length - 1; i++) {
        if (currentObj && typeof currentObj === 'object') {
          if (Array.isArray(currentObj) && currentObj.length > 0) {
            currentObj = currentObj[0];
          } else {
            currentObj = currentObj[parts[i]];
          }
        } else {
          currentObj = null;
          break;
        }
      }
      
      // Suggest properties of current object
      if (currentObj && typeof currentObj === 'object' && !Array.isArray(currentObj)) {
        for (const [key, value] of Object.entries(currentObj)) {
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
          item.detail = this.getTypeDescription(value);
          item.documentation = new vscode.MarkdownString(`**Type:** ${item.detail}\n\n**Value:** \`${JSON.stringify(value, null, 2).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\``);
          item.sortText = `0_${key}`;
          completions.push(item);
        }
      } else if (Array.isArray(currentObj) && currentObj.length > 0 && typeof currentObj[0] === 'object') {
        // Suggest properties from array items
        for (const [key, value] of Object.entries(currentObj[0])) {
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
          item.detail = this.getTypeDescription(value);
          item.documentation = new vscode.MarkdownString(`**Type:** ${item.detail} (from array item)\n\n**Value:** \`${JSON.stringify(value, null, 2).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\``);
          item.sortText = `0_${key}`;
          completions.push(item);
        }
      }
    }
    
    // Add common Jinja filters if we're after a pipe
    if (textBeforeCursor.includes('|') && inVariable) {
      const filters = [
        { name: 'default', detail: 'Set default value', signature: 'default(value)' },
        { name: 'length', detail: 'Get length', signature: 'length' },
        { name: 'lower', detail: 'Convert to lowercase', signature: 'lower' },
        { name: 'upper', detail: 'Convert to uppercase', signature: 'upper' },
        { name: 'capitalize', detail: 'Capitalize first letter', signature: 'capitalize' },
        { name: 'title', detail: 'Title case', signature: 'title' },
        { name: 'trim', detail: 'Remove whitespace', signature: 'trim' },
        { name: 'join', detail: 'Join array elements', signature: 'join(separator)' },
        { name: 'replace', detail: 'Replace substring', signature: 'replace(old, new)' },
        { name: 'round', detail: 'Round number', signature: 'round(precision)' },
        { name: 'int', detail: 'Convert to integer', signature: 'int' },
        { name: 'float', detail: 'Convert to float', signature: 'float' },
        { name: 'list', detail: 'Convert to list', signature: 'list' },
        { name: 'sort', detail: 'Sort items', signature: 'sort' },
        { name: 'reverse', detail: 'Reverse order', signature: 'reverse' },
        { name: 'first', detail: 'Get first item', signature: 'first' },
        { name: 'last', detail: 'Get last item', signature: 'last' },
        { name: 'map', detail: 'Apply to all items', signature: 'map(attribute)' },
        { name: 'select', detail: 'Filter items', signature: 'select(test)' },
        { name: 'reject', detail: 'Reject items', signature: 'reject(test)' },
        { name: 'tojson', detail: 'Convert to JSON', signature: 'tojson' },
        { name: 'safe', detail: 'Mark as safe HTML', signature: 'safe' },
      ];
      
      filters.forEach(({ name, detail, signature }) => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
        item.detail = detail;
        item.documentation = new vscode.MarkdownString(`**Usage:** \`{{ value | ${signature} }}\``);
        item.sortText = `2_${name}`;
        completions.push(item);
      });
    }
    
    return completions;
  }
}

module.exports = { JinjaCompletionProvider };
