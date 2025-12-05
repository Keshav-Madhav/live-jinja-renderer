const vscode = require('vscode');

/**
 * Provides syntax highlighting decorations for Jinja2 templates
 */
class JinjaSyntaxDecorator {
  constructor() {
    this.decorationTypes = this.createDecorationTypes();
    this.activeEditor = vscode.window.activeTextEditor;
    this.timeout = null;
  }

  createDecorationTypes() {
    return {
      delimiter: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('editorBracketHighlight.foreground1')
      }),
      keyword: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('debugTokenExpression.name')
      }),
      variable: vscode.window.createTextEditorDecorationType({
        color: '#9CDCFE'
      }),
      string: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('debugTokenExpression.string')
      }),
      number: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('debugTokenExpression.number')
      }),
      operator: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('debugTokenExpression.name')
      }),
      function: vscode.window.createTextEditorDecorationType({
        color: '#DCDCAA',  // Yellow-gold for macros/user functions
        fontWeight: '500'
      }),
      method: vscode.window.createTextEditorDecorationType({
        color: '#C586C0',  // Purple for built-in methods (like VS Code class/interface color)
      }),
      filter: vscode.window.createTextEditorDecorationType({
        color: '#C586C0',  // Purple like VS Code keywords/special functions
        fontWeight: '500'
      }),
      comment: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('descriptionForeground'),
        fontStyle: 'italic'
      }),
      boolean: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('debugTokenExpression.boolean')
      }),
      builtin: vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('symbolIcon.classForeground')
      })
    };
  }

  /**
   * Check if syntax highlighting should be applied to this document
   */
  shouldHighlight(document) {
    if (!document) return false;

    const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
    
    // Always highlight .jinja and .j2 files
    if (document.fileName.endsWith('.jinja') || document.fileName.endsWith('.j2') || document.fileName.endsWith('.jinja2')) {
      return true;
    }

    // For .txt files, check both general and highlighting settings
    if (document.fileName.endsWith('.txt') || document.languageId === 'plaintext') {
      // First check if extension is enabled for text files at all
      if (!config.get('general.enableForTextFiles', true)) {
        return false;
      }
      // Then check if highlighting specifically is enabled
      return config.get('highlighting.enableForTextFiles', true);
    }

    return false;
  }

  /**
   * Tokenize Jinja template and return decorations
   */
  tokenizeJinja(text) {
    const decorations = {
      delimiter: [],
      keyword: [],
      variable: [],
      string: [],
      number: [],
      operator: [],
      function: [],
      filter: [],
      comment: [],
      boolean: [],
      builtin: [],
      method: []
    };

    const keywords = new Set([
      'if', 'elif', 'else', 'endif',
      'for', 'endfor', 'in',
      'block', 'endblock',
      'extends', 'include', 'import', 'from',
      'macro', 'endmacro', 'call', 'endcall',
      'filter', 'endfilter',
      'set', 'endset',
      'with', 'endwith',
      'autoescape', 'endautoescape',
      'trans', 'endtrans', 'pluralize',
      'do', 'break', 'continue',
      'scoped', 'recursive', 'ignore', 'missing',
      'as', 'not', 'and', 'or', 'is'
    ]);

    const builtins = new Set([
      'abs', 'attr', 'batch', 'capitalize', 'center', 'default', 'd', 'dictsort',
      'escape', 'e', 'filesizeformat', 'first', 'float', 'forceescape',
      'format', 'groupby', 'indent', 'int', 'join', 'last', 'length', 'list',
      'lower', 'map', 'max', 'min', 'pprint', 'random', 'reject', 'rejectattr',
      'replace', 'reverse', 'round', 'safe', 'select', 'selectattr', 'slice',
      'sort', 'string', 'striptags', 'sum', 'title', 'tojson', 'trim', 'truncate',
      'unique', 'upper', 'urlencode', 'urlize', 'wordcount', 'wordwrap', 'xmlattr',
      'range', 'lipsum', 'dict', 'cycler', 'joiner', 'namespace'
    ]);

    // Common Python/Jinja methods for lists, strings, dicts, etc.
    const methods = new Set([
      'append', 'extend', 'insert', 'remove', 'pop', 'clear', 'index', 'count',
      'copy', 'split', 'rsplit', 'strip', 'lstrip', 'rstrip', 'startswith', 
      'endswith', 'find', 'rfind', 'upper', 'lower', 'capitalize', 'title',
      'swapcase', 'isdigit', 'isalpha', 'isalnum', 'isspace', 'isupper', 'islower',
      'ljust', 'rjust', 'center', 'zfill', 'format', 'encode', 'decode',
      'keys', 'values', 'items', 'get', 'update', 'setdefault', 'fromkeys',
      'sort', 'sorted', 'reverse', 'reversed', 'min', 'max', 'sum', 'len',
      'enumerate', 'zip', 'filter', 'map', 'reduce', 'any', 'all'
    ]);

    const booleans = new Set(['true', 'false', 'True', 'False', 'none', 'None']);

    // Pattern to match Jinja constructs
    const jinjaPattern = /(\{#[\s\S]*?#\}|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\})/g;
    
    let match;
    while ((match = jinjaPattern.exec(text)) !== null) {
      const construct = match[0];
      const startIndex = match.index;

      // Handle comments {# ... #}
      if (construct.startsWith('{#')) {
        decorations.comment.push({
          range: new vscode.Range(
            this.getPosition(text, startIndex),
            this.getPosition(text, startIndex + construct.length)
          )
        });
        continue;
      }

      // Handle expressions {{ ... }} and statements {% ... %}
      const content = construct.substring(2, construct.length - 2);

      // Add delimiter decorations
      decorations.delimiter.push({
        range: new vscode.Range(
          this.getPosition(text, startIndex),
          this.getPosition(text, startIndex + 2)
        )
      });
      decorations.delimiter.push({
        range: new vscode.Range(
          this.getPosition(text, startIndex + construct.length - 2),
          this.getPosition(text, startIndex + construct.length)
        )
      });

      // Tokenize content
      this.tokenizeContent(
        content.trim(),
        startIndex + 2 + (content.length - content.trimStart().length),
        text,
        decorations,
        keywords,
        builtins,
        booleans,
        methods
      );
    }

    return decorations;
  }

  tokenizeContent(content, baseOffset, fullText, decorations, keywords, builtins, booleans, methods) {
    let i = 0;

    while (i < content.length) {
      const char = content[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        const quote = char;
        let stringEnd = i + 1;
        while (stringEnd < content.length && content[stringEnd] !== quote) {
          if (content[stringEnd] === '\\' && stringEnd + 1 < content.length) {
            stringEnd += 2;
          } else {
            stringEnd++;
          }
        }
        if (stringEnd < content.length) stringEnd++; // Include closing quote

        decorations.string.push({
          range: new vscode.Range(
            this.getPosition(fullText, baseOffset + i),
            this.getPosition(fullText, baseOffset + stringEnd)
          )
        });
        i = stringEnd;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let numEnd = i;
        while (numEnd < content.length && /[\d.]/.test(content[numEnd])) {
          numEnd++;
        }
        decorations.number.push({
          range: new vscode.Range(
            this.getPosition(fullText, baseOffset + i),
            this.getPosition(fullText, baseOffset + numEnd)
          )
        });
        i = numEnd;
        continue;
      }

      // Operators
      if (/[+\-*/%=!<>|&~^]/.test(char)) {
        let opEnd = i + 1;
        if (opEnd < content.length && /[=<>|&]/.test(content[opEnd])) {
          opEnd++;
        }
        decorations.operator.push({
          range: new vscode.Range(
            this.getPosition(fullText, baseOffset + i),
            this.getPosition(fullText, baseOffset + opEnd)
          )
        });
        i = opEnd;
        continue;
      }

      // Pipe for filters
      if (char === '|') {
        decorations.filter.push({
          range: new vscode.Range(
            this.getPosition(fullText, baseOffset + i),
            this.getPosition(fullText, baseOffset + i + 1)
          )
        });
        i++;
        continue;
      }

      // Identifiers (keywords, variables, functions, etc.)
      if (/[a-zA-Z_]/.test(char)) {
        let identEnd = i;
        while (identEnd < content.length && /[a-zA-Z0-9_]/.test(content[identEnd])) {
          identEnd++;
        }
        const ident = content.substring(i, identEnd);

        // Check if next non-whitespace is '(' for function detection
        let j = identEnd;
        while (j < content.length && /\s/.test(content[j])) j++;
        const isFunction = j < content.length && content[j] === '(';

        const lowerIdent = ident.toLowerCase();
        const start = this.getPosition(fullText, baseOffset + i);
        const end = this.getPosition(fullText, baseOffset + identEnd);
        const range = new vscode.Range(start, end);

        if (keywords.has(lowerIdent)) {
          decorations.keyword.push({ range });
        } else if (booleans.has(ident)) {
          decorations.boolean.push({ range });
        } else if (builtins.has(lowerIdent)) {
          decorations.builtin.push({ range });
        } else if (methods.has(lowerIdent)) {
          decorations.method.push({ range });
        } else if (isFunction) {
          decorations.function.push({ range });
        } else {
          decorations.variable.push({ range });
        }

        i = identEnd;
        continue;
      }

      // Skip other characters
      i++;
    }
  }

  getPosition(text, offset) {
    let line = 0;
    let character = 0;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
        character = 0;
      } else {
        character++;
      }
    }
    return new vscode.Position(line, character);
  }

  updateDecorations() {
    if (!this.activeEditor) return;
    if (!this.shouldHighlight(this.activeEditor.document)) return;

    const text = this.activeEditor.document.getText();
    const decorations = this.tokenizeJinja(text);

    // Apply decorations
    for (const [type, ranges] of Object.entries(decorations)) {
      this.activeEditor.setDecorations(this.decorationTypes[type], ranges);
    }
  }

  triggerUpdateDecorations(throttle = true) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (throttle) {
      this.timeout = setTimeout(() => this.updateDecorations(), 200);
    } else {
      this.updateDecorations();
    }
  }

  dispose() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    for (const decoration of Object.values(this.decorationTypes)) {
      decoration.dispose();
    }
  }
}

module.exports = { JinjaSyntaxDecorator };
