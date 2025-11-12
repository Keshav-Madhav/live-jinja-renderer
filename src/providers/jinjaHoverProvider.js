const vscode = require('vscode');

/**
 * Provides hover information for Jinja2 variables in templates
 */
class JinjaHoverProvider {
  constructor() {
    this.variables = {};
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
   * @returns {vscode.Hover | null}
   */
  provideHover(document, position) {
    const line = document.lineAt(position).text;
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_.]*/);
    
    if (!wordRange) {
      return null;
    }
    
    const word = document.getText(wordRange);
    
    // Check if we're inside Jinja syntax
    const textBeforeWord = line.substring(0, wordRange.start.character);
    const textAfterWord = line.substring(wordRange.end.character);
    
    const inJinja = /\{\{[^}]*$/.test(textBeforeWord) || /\{%[^%]*$/.test(textBeforeWord);
    const endsJinja = /^[^}]*\}\}/.test(textAfterWord) || /^[^%]*%\}/.test(textAfterWord);
    
    if (!inJinja && !endsJinja) {
      return null;
    }
    
    // Try to get the value
    const value = this.getValueAtPath(word);
    
    if (value === undefined) {
      return null;
    }
    
    const typeDesc = this.getTypeDescription(value);
    const formattedValue = this.formatValue(value);
    
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    // Add variable name as header
    markdown.appendMarkdown(`### \`${word}\`\n\n`);
    
    // Add type information
    markdown.appendMarkdown(`**Type:** ${typeDesc}\n\n`);
    
    // Add value preview
    markdown.appendMarkdown(`**Value:**\n\`\`\`json\n${formattedValue}\n\`\`\`\n\n`);
    
    // Add helpful information based on type
    if (Array.isArray(value)) {
      markdown.appendMarkdown(`*Use in loop:* \`{% for item in ${word} %}...{% endfor %}\`\n\n`);
    } else if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value).slice(0, 5);
      if (keys.length > 0) {
        markdown.appendMarkdown(`**Available properties:** ${keys.map(k => `\`${k}\``).join(', ')}${Object.keys(value).length > 5 ? ', ...' : ''}\n\n`);
      }
    }
    
    return new vscode.Hover(markdown, wordRange);
  }

  /**
   * Provide hover information for Jinja filters
   * @param {string} filterName - Name of the filter
   * @returns {vscode.MarkdownString | null}
   */
  getFilterDocumentation(filterName) {
    const filters = {
      'default': {
        signature: 'default(default_value, boolean=False)',
        description: 'If the value is undefined, return the default value. Set boolean=True to use for falsy values too.',
        example: '{{ variable | default("N/A") }}'
      },
      'length': {
        signature: 'length',
        description: 'Return the number of items in a sequence or mapping.',
        example: '{{ items | length }}'
      },
      'lower': {
        signature: 'lower',
        description: 'Convert a value to lowercase.',
        example: '{{ name | lower }}'
      },
      'upper': {
        signature: 'upper',
        description: 'Convert a value to uppercase.',
        example: '{{ name | upper }}'
      },
      'capitalize': {
        signature: 'capitalize',
        description: 'Capitalize the first character of a string.',
        example: '{{ text | capitalize }}'
      },
      'title': {
        signature: 'title',
        description: 'Return a titlecased version of the string (first letter of each word uppercase).',
        example: '{{ text | title }}'
      },
      'trim': {
        signature: 'trim',
        description: 'Strip leading and trailing whitespace.',
        example: '{{ text | trim }}'
      },
      'join': {
        signature: 'join(separator=", ")',
        description: 'Join a sequence of strings with a separator.',
        example: '{{ items | join(", ") }}'
      },
      'replace': {
        signature: 'replace(old, new, count=None)',
        description: 'Replace occurrences of old with new in the string.',
        example: '{{ text | replace("old", "new") }}'
      },
      'round': {
        signature: 'round(precision=0, method="common")',
        description: 'Round a number to a given precision.',
        example: '{{ 42.55 | round(1) }}'
      },
      'int': {
        signature: 'int(default=0, base=10)',
        description: 'Convert the value into an integer.',
        example: '{{ "42" | int }}'
      },
      'float': {
        signature: 'float(default=0.0)',
        description: 'Convert the value into a floating point number.',
        example: '{{ "42.5" | float }}'
      },
      'list': {
        signature: 'list',
        description: 'Convert the value into a list.',
        example: '{{ value | list }}'
      },
      'sort': {
        signature: 'sort(reverse=False, case_sensitive=False, attribute=None)',
        description: 'Sort an iterable.',
        example: '{{ items | sort }}'
      },
      'reverse': {
        signature: 'reverse',
        description: 'Reverse the order of items in a sequence.',
        example: '{{ items | reverse }}'
      },
      'first': {
        signature: 'first',
        description: 'Return the first item of a sequence.',
        example: '{{ items | first }}'
      },
      'last': {
        signature: 'last',
        description: 'Return the last item of a sequence.',
        example: '{{ items | last }}'
      },
      'map': {
        signature: 'map(attribute)',
        description: 'Apply an attribute or filter to a sequence of objects.',
        example: '{{ users | map(attribute="name") | join(", ") }}'
      },
      'select': {
        signature: 'select(test)',
        description: 'Filter a sequence by applying a test to each object.',
        example: '{{ numbers | select("odd") }}'
      },
      'reject': {
        signature: 'reject(test)',
        description: 'Filter a sequence by rejecting objects that pass a test.',
        example: '{{ numbers | reject("odd") }}'
      },
      'tojson': {
        signature: 'tojson(indent=None)',
        description: 'Serialize value to JSON.',
        example: '{{ data | tojson }}'
      },
      'safe': {
        signature: 'safe',
        description: 'Mark the value as safe, preventing automatic escaping.',
        example: '{{ html_content | safe }}'
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
