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
   * Check if cursor is inside Jinja syntax
   * @param {string} textBeforeCursor
   * @param {string} openDelim - Opening delimiter (e.g., '{{', '{%')
   * @param {string} closeDelim - Closing delimiter (e.g., '}}', '%}')
   * @returns {boolean}
   */
  isInsideJinjaSyntax(textBeforeCursor, openDelim, closeDelim) {
    let openCount = 0;
    let i = 0;
    
    while (i < textBeforeCursor.length) {
      if (textBeforeCursor.substring(i, i + openDelim.length) === openDelim) {
        openCount++;
        i += openDelim.length;
      } else if (textBeforeCursor.substring(i, i + closeDelim.length) === closeDelim) {
        openCount--;
        i += closeDelim.length;
      } else {
        i++;
      }
    }
    
    return openCount > 0;
  }

  /**
   * Extract the partial identifier being typed
   * @param {string} textBeforeCursor
   * @returns {string}
   */
  extractPartialIdentifier(textBeforeCursor) {
    // Match variable paths with dots, handling spaces and operators
    // This regex captures identifiers after operators, spaces, opening braces, etc.
    const match = textBeforeCursor.match(/(?:^|[\s\{\{%\(,|=<>!+\-*/])\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/);
    return match ? match[1] : '';
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
    
    // Check if we're inside Jinja syntax (improved detection)
    const inVariable = this.isInsideJinjaSyntax(textBeforeCursor, '{{', '}}');
    const inStatement = this.isInsideJinjaSyntax(textBeforeCursor, '{%', '%}');
    const inComment = this.isInsideJinjaSyntax(textBeforeCursor, '{#', '#}');
    
    if (!inVariable && !inStatement || inComment) {
      return [];
    }
    
    const completions = [];
    
    // Improved extraction of the partial text being typed
    const partial = this.extractPartialIdentifier(textBeforeCursor);
    const parts = partial.split('.');
    
    // Check if we're completing a top-level variable or after a dot with nothing typed yet
    const isTopLevel = parts.length === 1 || (parts.length === 2 && parts[1] === '');
    
    if (isTopLevel && parts.length === 1) {
      // Get the partial text being typed for filtering
      const filterText = parts[0].toLowerCase();
      
      // Suggest top-level variables (filtered by partial match)
      for (const [varName, value] of Object.entries(this.variables)) {
        // Only show variables that start with the partial text
        if (filterText && !varName.toLowerCase().startsWith(filterText)) {
          continue;
        }
        
        const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
        item.detail = this.getTypeDescription(value);
        item.documentation = new vscode.MarkdownString(`**Type:** ${item.detail}\n\n**Value:** \`${JSON.stringify(value, null, 2).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\``);
        item.sortText = `0_${varName}`;
        completions.push(item);
      }
      
      // Add common Jinja keywords (only in statement blocks, not in variable expressions)
      if (inStatement) {
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
          // Filter by partial match
          if (filterText && !name.toLowerCase().startsWith(filterText)) {
            return;
          }
          
          const item = new vscode.CompletionItem(name, kind);
          item.detail = detail;
          item.sortText = `1_${name}`;
          completions.push(item);
        });
      }
      
    } else {
      // Suggest nested properties
      const rootVar = parts[0];
      
      // Navigate to the current object
      let currentObj = this.variables[rootVar];
      
      // Determine how many parts to navigate through
      // If last part is empty (user typed "address."), navigate to parts.length - 2
      // If last part has text (user typed "address.ci"), navigate to parts.length - 1
      const lastPartEmpty = parts[parts.length - 1] === '';
      const navigateUntil = lastPartEmpty ? parts.length - 1 : parts.length - 1;
      
      // Get the partial text for filtering properties
      const propertyFilter = lastPartEmpty ? '' : parts[parts.length - 1].toLowerCase();
      
      for (let i = 1; i < navigateUntil; i++) {
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
      
      // Suggest properties of current object (filtered by partial match)
      if (currentObj && typeof currentObj === 'object' && !Array.isArray(currentObj)) {
        for (const [key, value] of Object.entries(currentObj)) {
          // Filter by partial match
          if (propertyFilter && !key.toLowerCase().startsWith(propertyFilter)) {
            continue;
          }
          
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
          item.detail = this.getTypeDescription(value);
          item.documentation = new vscode.MarkdownString(`**Type:** ${item.detail}\n\n**Value:** \`${JSON.stringify(value, null, 2).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\``);
          item.sortText = `0_${key}`;
          completions.push(item);
        }
      } else if (Array.isArray(currentObj) && currentObj.length > 0 && typeof currentObj[0] === 'object') {
        // Suggest properties from array items (filtered by partial match)
        for (const [key, value] of Object.entries(currentObj[0])) {
          // Filter by partial match
          if (propertyFilter && !key.toLowerCase().startsWith(propertyFilter)) {
            continue;
          }
          
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
          item.detail = this.getTypeDescription(value);
          item.documentation = new vscode.MarkdownString(`**Type:** ${item.detail} (from array item)\n\n**Value:** \`${JSON.stringify(value, null, 2).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\``);
          item.sortText = `0_${key}`;
          completions.push(item);
        }
      }
    }
    
    // Add common Jinja filters if we're after a pipe (improved detection)
    const afterPipe = /\|\s*[a-zA-Z0-9_]*$/.test(textBeforeCursor);
    if (afterPipe && inVariable) {
      const filters = this.getJinjaFilters();
      
      // Extract the partial filter name being typed
      const filterMatch = textBeforeCursor.match(/\|\s*([a-zA-Z0-9_]*)$/);
      const filterPartial = filterMatch ? filterMatch[1].toLowerCase() : '';
      
      filters.forEach(({ name, detail, signature }) => {
        // Filter by partial match
        if (filterPartial && !name.toLowerCase().startsWith(filterPartial)) {
          return;
        }
        
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
        item.detail = detail;
        item.documentation = new vscode.MarkdownString(`**Usage:** \`{{ value | ${signature} }}\``);
        item.sortText = `2_${name}`;
        completions.push(item);
      });
    }

    // Add Jinja tests when typing "is "
    const afterIs = /\bis\s+(?:not\s+)?([a-zA-Z0-9_]*)$/i.test(textBeforeCursor);
    if (afterIs && (inVariable || inStatement)) {
      const tests = this.getJinjaTests();
      
      // Extract the partial test name being typed
      const testMatch = textBeforeCursor.match(/\bis\s+(?:not\s+)?([a-zA-Z0-9_]*)$/i);
      const testPartial = testMatch ? testMatch[1].toLowerCase() : '';
      
      tests.forEach(({ name, detail }) => {
        // Filter by partial match
        if (testPartial && !name.toLowerCase().startsWith(testPartial)) {
          return;
        }
        
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Keyword);
        item.detail = detail;
        item.sortText = `3_${name}`;
        completions.push(item);
      });
    }
    
    return completions;
  }

  /**
   * Get Jinja filter definitions
   * @returns {Array<{name: string, detail: string, signature: string}>}
   */
  getJinjaFilters() {
    return [
      { name: 'abs', detail: 'Absolute value', signature: 'abs' },
      { name: 'attr', detail: 'Get attribute', signature: 'attr(name)' },
      { name: 'batch', detail: 'Batch items', signature: 'batch(count, fill_with=None)' },
      { name: 'capitalize', detail: 'Capitalize first letter', signature: 'capitalize' },
      { name: 'center', detail: 'Center string', signature: 'center(width)' },
      { name: 'default', detail: 'Set default value', signature: 'default(value, boolean=False)' },
      { name: 'd', detail: 'Alias for default', signature: 'd(value)' },
      { name: 'dictsort', detail: 'Sort dictionary', signature: 'dictsort' },
      { name: 'escape', detail: 'Escape HTML', signature: 'escape' },
      { name: 'e', detail: 'Alias for escape', signature: 'e' },
      { name: 'filesizeformat', detail: 'Format file size', signature: 'filesizeformat' },
      { name: 'first', detail: 'Get first item', signature: 'first' },
      { name: 'float', detail: 'Convert to float', signature: 'float(default=0.0)' },
      { name: 'forceescape', detail: 'Force escape HTML', signature: 'forceescape' },
      { name: 'format', detail: 'Format string', signature: 'format(*args, **kwargs)' },
      { name: 'groupby', detail: 'Group by attribute', signature: 'groupby(attribute)' },
      { name: 'indent', detail: 'Indent text', signature: 'indent(width=4)' },
      { name: 'int', detail: 'Convert to integer', signature: 'int(default=0, base=10)' },
      { name: 'join', detail: 'Join array elements', signature: 'join(separator=", ")' },
      { name: 'last', detail: 'Get last item', signature: 'last' },
      { name: 'length', detail: 'Get length', signature: 'length' },
      { name: 'list', detail: 'Convert to list', signature: 'list' },
      { name: 'lower', detail: 'Convert to lowercase', signature: 'lower' },
      { name: 'map', detail: 'Apply to all items', signature: 'map(attribute)' },
      { name: 'max', detail: 'Get maximum value', signature: 'max' },
      { name: 'min', detail: 'Get minimum value', signature: 'min' },
      { name: 'pprint', detail: 'Pretty print', signature: 'pprint' },
      { name: 'random', detail: 'Random item', signature: 'random' },
      { name: 'reject', detail: 'Reject items', signature: 'reject(test)' },
      { name: 'rejectattr', detail: 'Reject by attribute', signature: 'rejectattr(attribute, test)' },
      { name: 'replace', detail: 'Replace substring', signature: 'replace(old, new, count=None)' },
      { name: 'reverse', detail: 'Reverse order', signature: 'reverse' },
      { name: 'round', detail: 'Round number', signature: 'round(precision=0, method="common")' },
      { name: 'safe', detail: 'Mark as safe HTML', signature: 'safe' },
      { name: 'select', detail: 'Filter items', signature: 'select(test)' },
      { name: 'selectattr', detail: 'Select by attribute', signature: 'selectattr(attribute, test)' },
      { name: 'slice', detail: 'Slice sequence', signature: 'slice(count, fill_with=None)' },
      { name: 'sort', detail: 'Sort items', signature: 'sort(reverse=False, attribute=None)' },
      { name: 'string', detail: 'Convert to string', signature: 'string' },
      { name: 'striptags', detail: 'Strip HTML tags', signature: 'striptags' },
      { name: 'sum', detail: 'Sum values', signature: 'sum(attribute=None, start=0)' },
      { name: 'title', detail: 'Title case', signature: 'title' },
      { name: 'tojson', detail: 'Convert to JSON', signature: 'tojson(indent=None)' },
      { name: 'trim', detail: 'Remove whitespace', signature: 'trim' },
      { name: 'truncate', detail: 'Truncate text', signature: 'truncate(length=255)' },
      { name: 'unique', detail: 'Get unique items', signature: 'unique' },
      { name: 'upper', detail: 'Convert to uppercase', signature: 'upper' },
      { name: 'urlencode', detail: 'URL encode', signature: 'urlencode' },
      { name: 'urlize', detail: 'Convert URLs to links', signature: 'urlize' },
      { name: 'wordcount', detail: 'Count words', signature: 'wordcount' },
      { name: 'wordwrap', detail: 'Wrap words', signature: 'wordwrap(width=79)' },
      { name: 'xmlattr', detail: 'XML attributes', signature: 'xmlattr' },
    ];
  }

  /**
   * Get Jinja test definitions
   * @returns {Array<{name: string, detail: string}>}
   */
  getJinjaTests() {
    return [
      { name: 'boolean', detail: 'Test if value is boolean' },
      { name: 'callable', detail: 'Test if value is callable' },
      { name: 'defined', detail: 'Test if variable is defined' },
      { name: 'divisibleby', detail: 'Test if divisible by number' },
      { name: 'eq', detail: 'Test if equal (alias for ==)' },
      { name: 'equalto', detail: 'Test if equal to value' },
      { name: 'escaped', detail: 'Test if value is escaped' },
      { name: 'even', detail: 'Test if number is even' },
      { name: 'false', detail: 'Test if value is False' },
      { name: 'filter', detail: 'Test if value is a filter' },
      { name: 'float', detail: 'Test if value is a float' },
      { name: 'ge', detail: 'Test if greater or equal (>=)' },
      { name: 'gt', detail: 'Test if greater than (>)' },
      { name: 'in', detail: 'Test if value is in sequence' },
      { name: 'integer', detail: 'Test if value is integer' },
      { name: 'iterable', detail: 'Test if value is iterable' },
      { name: 'le', detail: 'Test if less or equal (<=)' },
      { name: 'lower', detail: 'Test if string is lowercase' },
      { name: 'lt', detail: 'Test if less than (<)' },
      { name: 'mapping', detail: 'Test if value is a mapping (dict)' },
      { name: 'ne', detail: 'Test if not equal (!=)' },
      { name: 'none', detail: 'Test if value is None' },
      { name: 'number', detail: 'Test if value is a number' },
      { name: 'odd', detail: 'Test if number is odd' },
      { name: 'sameas', detail: 'Test if same object' },
      { name: 'sequence', detail: 'Test if value is a sequence' },
      { name: 'string', detail: 'Test if value is a string' },
      { name: 'test', detail: 'Test if value is a test function' },
      { name: 'true', detail: 'Test if value is True' },
      { name: 'undefined', detail: 'Test if variable is undefined' },
      { name: 'upper', detail: 'Test if string is uppercase' },
    ];
  }
  }

module.exports = { JinjaCompletionProvider };
