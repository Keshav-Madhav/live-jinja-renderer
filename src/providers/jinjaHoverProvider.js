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
  provideHover(document, position) { // eslint-disable-line no-unused-vars
    // Hover functionality temporarily disabled
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
