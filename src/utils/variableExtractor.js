/**
 * Jinja Variable Extractor v2.1
 * 
 * A clean, tokenizer-based approach to extracting variables from Jinja templates.
 * 
 * Architecture:
 * 1. Tokenizer - Splits template into blocks (expressions, statements, literals)
 * 2. Statement Parser - Parses {% %} blocks into structured data
 * 3. Expression Parser - Extracts variable references from expressions
 * 4. Scope Tracker - Tracks local variables, loop vars, imports
 * 5. Result Builder - Builds final variable structure with type inference
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Jinja2 keywords and built-ins that should never be treated as variables
 */
const JINJA_KEYWORDS = new Set([
  // Control flow
    'if', 'elif', 'else', 'endif', 'for', 'endfor', 'while', 'endwhile',
    'set', 'endset', 'block', 'endblock', 'extends', 'include', 'import',
    'from', 'macro', 'endmacro', 'call', 'endcall', 'filter', 'endfilter',
    'with', 'endwith', 'autoescape', 'endautoescape', 'raw', 'endraw',
  'trans', 'endtrans', 'pluralize', 'do', 'break', 'continue',
    
  // Boolean and None literals
  'true', 'false', 'none', 'null',
    'True', 'False', 'None', 'NULL',
  
  // Operators
  'not', 'and', 'or', 'in', 'is', 'as',
    
    // Tests
  'defined', 'undefined', 'boolean', 'integer', 'float', 'number',
  'string', 'sequence', 'iterable', 'mapping', 'sameas', 'escaped',
  'odd', 'even', 'divisibleby', 'equalto', 'lower', 'upper', 'callable',
  'ne', 'eq', 'lt', 'le', 'gt', 'ge',
    
    // Built-in functions
    'range', 'lipsum', 'dict', 'cycler', 'joiner', 'namespace',
    
  // Special variables
  'loop', 'self', 'super', 'varargs', 'kwargs', '_', 'caller',
  
  // Python built-ins commonly available in Jinja
  'len', 'sorted', 'reversed', 'enumerate', 'zip', 'any', 'all',
  'list', 'tuple', 'set', 'dict', 'str', 'int', 'float', 'bool',
  'print', 'repr', 'type', 'isinstance', 'hasattr', 'getattr'
]);

/**
 * Jinja2 built-in filters - these are only skipped when preceded by |
 */
const JINJA_FILTERS = new Set([
  'abs', 'attr', 'batch', 'capitalize', 'center', 'default', 'd',
  'dictsort', 'escape', 'e', 'filesizeformat', 'first', 'float',
  'forceescape', 'format', 'groupby', 'indent', 'int', 'join',
  'last', 'length', 'list', 'lower', 'map', 'max', 'min', 'pprint',
  'random', 'reject', 'rejectattr', 'replace', 'reverse', 'round',
  'safe', 'select', 'selectattr', 'slice', 'sort', 'string',
  'striptags', 'sum', 'title', 'tojson', 'trim', 'truncate',
  'unique', 'upper', 'urlencode', 'urlize', 'wordcount', 'wordwrap',
  'xmlattr', 'items', 'keys', 'values'
]);

/**
 * Dict methods that take a key as first argument - extract key as property
 */
const DICT_KEY_METHODS = new Set(['get', 'pop', 'setdefault']);

/**
 * Common object/list methods that shouldn't be treated as properties
 */
const COMMON_METHODS = new Set([
    'append', 'extend', 'insert', 'remove', 'pop', 'clear', 'index', 'count',
    'copy', 'keys', 'values', 'items', 'get', 'update', 'setdefault',
    'split', 'strip', 'lstrip', 'rstrip', 'startswith', 'endswith',
    'find', 'rfind', 'isdigit', 'isalpha', 'isalnum', 'islower', 'isupper',
  'replace', 'lower', 'upper', 'title', 'capitalize', 'join', 'format'
]);

// ============================================================================
// TOKENIZER
// ============================================================================

/**
 * Token types for Jinja template parsing
 */
const TokenType = {
  LITERAL: 'LITERAL',
  EXPRESSION: 'EXPRESSION',
  STATEMENT: 'STATEMENT',
  COMMENT: 'COMMENT'
};

/**
 * Tokenize a Jinja template into blocks.
 * Handles string literals inside blocks correctly.
 */
function tokenize(template) {
  const tokens = [];
  let pos = 0;
  const len = template.length;
  
  while (pos < len) {
    const openMatch = findNextOpener(template, pos);
    
    if (!openMatch) {
      // No more blocks, rest is literal
      if (pos < len) {
        tokens.push({
          type: TokenType.LITERAL,
          content: template.slice(pos),
          start: pos,
          end: len
        });
      }
      break;
    }
    
    // Add literal before this block
    if (openMatch.index > pos) {
      tokens.push({
        type: TokenType.LITERAL,
        content: template.slice(pos, openMatch.index),
        start: pos,
        end: openMatch.index
      });
    }
    
    // Find the matching closer, respecting string literals
    const closer = openMatch.type === TokenType.COMMENT ? '#}' :
                   openMatch.type === TokenType.EXPRESSION ? '}}' : '%}';
    const closerPos = findCloser(template, openMatch.index + openMatch.opener.length, closer);
    
    if (closerPos === -1) {
      // Unclosed block - treat rest as literal
      tokens.push({
        type: TokenType.LITERAL,
        content: template.slice(openMatch.index),
        start: openMatch.index,
        end: len
      });
      break;
    }
    
    // Handle whitespace control (-)
    const hasTrailingDash = template[closerPos - 1] === '-';
    const contentEnd = hasTrailingDash ? closerPos - 1 : closerPos;
    const content = template.slice(openMatch.index + openMatch.opener.length, contentEnd);
    
    tokens.push({
      type: openMatch.type,
      content: content.trim(),
      start: openMatch.index,
      end: closerPos + closer.length,
      raw: template.slice(openMatch.index, closerPos + closer.length)
    });
    
    pos = closerPos + closer.length;
  }
  
  return tokens;
}

/**
 * Find the next block opener
 */
function findNextOpener(template, startPos) {
  let minIndex = Infinity;
  let result = null;
  
  const openers = [
    { pattern: '{{-', type: TokenType.EXPRESSION },
    { pattern: '{{', type: TokenType.EXPRESSION },
    { pattern: '{%-', type: TokenType.STATEMENT },
    { pattern: '{%', type: TokenType.STATEMENT },
    { pattern: '{#', type: TokenType.COMMENT }
  ];
  
  for (const { pattern, type } of openers) {
    const idx = template.indexOf(pattern, startPos);
    if (idx !== -1 && idx < minIndex) {
      minIndex = idx;
      result = { index: idx, opener: pattern, type };
    }
  }
  
  return result;
}

/**
 * Find the closer, respecting string literals
 */
function findCloser(template, startPos, closer) {
  let pos = startPos;
  const len = template.length;
  
  while (pos < len) {
    const char = template[pos];
    
    // Handle string literals
    if (char === "'" || char === '"') {
      const endStr = findStringEnd(template, pos + 1, char);
      if (endStr === -1) return -1;
      pos = endStr + 1;
      continue;
    }
    
    // Check for closer (with optional -)
    if (template.slice(pos, pos + closer.length) === closer ||
        (template[pos] === '-' && template.slice(pos + 1, pos + 1 + closer.length) === closer)) {
      return template[pos] === '-' ? pos + 1 : pos;
    }
    
    pos++;
  }
  
  return -1;
}

/**
 * Find end of string literal, handling escapes
 */
function findStringEnd(template, startPos, quote) {
  let pos = startPos;
  const len = template.length;
  
  while (pos < len) {
    const char = template[pos];
    if (char === '\\') {
      pos += 2;
      continue;
    }
    if (char === quote) return pos;
    pos++;
  }
  
  return -1;
}

// ============================================================================
// EXPRESSION PARSER
// ============================================================================

/**
 * Parse an expression and extract variable references.
 * 
 * @param {string} expr - The expression to parse
 * @param {Set<string>} localVars - Variables that are locally scoped
 * @param {Set<string>} importedNames - Imported module/macro names
 * @returns {Array<{name: string, path: string, accessType: string}>}
 */
function parseExpression(expr, localVars = new Set(), importedNames = new Set()) {
    const variables = [];
  const seen = new Set();
  
  // Replace string literals with placeholders to avoid false matches while preserving structure
  const stringLiterals = [];
  const noStrings = expr.replace(/(["'])(?:\\.|[^\\])*?\1/g, (match, quote) => {
    const content = match.slice(1, -1);
    stringLiterals.push(content);
    return `${quote}__STR_${stringLiterals.length - 1}__${quote}`;
  });
  
  // Helper to resolve placeholders back to original strings
  function resolveString(str) {
    return str.replace(/__STR_(\d+)__/g, (match, index) => {
      return stringLiterals[parseInt(index, 10)] || match;
    });
  }

  // Helper: Check if an identifier should be extracted
  function shouldExtract(name) {
    if (!name) return false;
    if (name.startsWith('__STR_')) return false; // Don't extract placeholders
    if (JINJA_KEYWORDS.has(name)) return false;
    if (JINJA_KEYWORDS.has(name.toLowerCase())) return false;
    if (localVars.has(name)) return false;
    if (importedNames.has(name)) return false;
    return true;
  }
  
  // Helper: Add a variable if it should be extracted
  function addVariable(name, path, accessType) {
    if (!shouldExtract(name)) return false;
    const key = `${name}:${path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    variables.push({ name, path, accessType });
    return true;
  }
  
  // Track ranges to skip (for chained access after method calls)
  const skipRanges = [];
  
  // ==========================================================================
  // PASS 1: Extract variables from bracket notation [var]
  // ==========================================================================
  const bracketVarPattern = /\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g;
  let bracketMatch;
  while ((bracketMatch = bracketVarPattern.exec(noStrings)) !== null) {
    const indexVar = bracketMatch[1];
    addVariable(indexVar, indexVar, 'simple');
  }
  
  // ==========================================================================
  // PASS 2: Handle method calls - extract objects and arguments
  // ==========================================================================
  const methodPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
    let methodMatch;
    
  while ((methodMatch = methodPattern.exec(noStrings)) !== null) {
    const objectPath = methodMatch[1].replace(/\s+/g, '');
      const methodName = methodMatch[2];
      const args = methodMatch[3];
    const rootName = objectPath.split('.')[0];
    
    // Handle dict key methods: .get(), .pop(), .setdefault()
    if (DICT_KEY_METHODS.has(methodName) && shouldExtract(rootName)) {
      // Look for chained access after the method call
      const afterMatch = noStrings.slice(methodMatch.index + methodMatch[0].length);
      const chainedMatch = afterMatch.match(/^((?:\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/);
      const chainedAccess = chainedMatch ? chainedMatch[1] : '';
        
      // Extract string literal key (which will be a placeholder now)
      const keyMatch = args.match(/^\s*(['"])([^'"]*)\1/);
        
      if (keyMatch) {
        // String literal key (placeholder) - resolve it
        const placeholder = keyMatch[2];
        const resolvedKey = resolveString(placeholder);
        
        // Build full path including key
        let fullPath = objectPath + '.' + resolvedKey;
          
        // Add chained property access
        if (chainedAccess) {
          const chainedProps = chainedAccess.match(/\.\s*([a-zA-Z_][a-zA-Z0-9_]*)/g);
          if (chainedProps) {
            for (const prop of chainedProps) {
              fullPath += prop.replace(/\s+/g, '');
            }
          }
          // Mark chained range to skip in pass 3
          const getEndPos = methodMatch.index + methodMatch[0].length;
          skipRanges.push({ start: getEndPos, end: getEndPos + chainedAccess.length });
        }
          
        addVariable(rootName, fullPath, 'dict_method');
        seen.add(`${rootName}:${objectPath}`); // Mark object path as handled
      } else {
        // Variable key - add object as dict
        addVariable(rootName, objectPath, 'dict');
      }
      
      // Extract variables from remaining arguments (e.g., default value)
      // Remove the first argument (key) to process rest
      const remainingArgs = args.replace(/^\s*(['"])([^'"]*)\1\s*,?/, '').trim();
      if (remainingArgs) {
        for (const v of parseExpression(remainingArgs, localVars, importedNames)) {
          addVariable(v.name, v.path, v.accessType);
        }
      }
      continue;
    }
    
    // General method call - add the object
    if (shouldExtract(rootName)) {
      const pathParts = objectPath.split('.');
      if (pathParts.length === 1) {
        addVariable(rootName, rootName, 'simple');
      } else {
        addVariable(rootName, objectPath, 'property');
      }
    }
    
    // Extract variables from method arguments
      if (args.trim()) {
      for (const v of parseExpression(args, localVars, importedNames)) {
        addVariable(v.name, v.path, v.accessType);
      }
    }
  }
  
  // ==========================================================================
  // PASS 3: General identifier extraction
  // ==========================================================================
  const identPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)((?:\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*|\s*\[\s*(?:[^\]]+)\s*\])*)/g;
  
  function isInSkipRange(pos) {
    return skipRanges.some(r => pos >= r.start && pos < r.end);
  }
  
  let identMatch;
  while ((identMatch = identPattern.exec(noStrings)) !== null) {
    if (isInSkipRange(identMatch.index)) continue;
    
    const rootName = identMatch[1];
    let accessChain = identMatch[2] || '';
    
    if (!shouldExtract(rootName)) continue;
    
    // Skip if preceded by | (it's a filter)
    const preceding = noStrings.slice(0, identMatch.index).trim();
    if (preceding.endsWith('|') && JINJA_FILTERS.has(rootName)) continue;
    
    // Skip if it's a method call (already handled)
    if (/\.\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*$/.test(identMatch[0])) continue;
    
    // Skip if followed by dict key method call
    const after = noStrings.slice(identMatch.index + identMatch[0].length);
    if (/^\s*\.\s*(?:get|pop|setdefault)\s*\(/.test(after)) continue;
    
    // Strip trailing method names from access chain
    accessChain = accessChain.replace(/\.\s*(?:get|pop|setdefault)\s*$/, '');
    
    const accessType = parseAccessChain(accessChain);
    // Pass resolver to buildPath to handle placeholders
    const fullPath = buildPath(rootName, accessChain, resolveString);
    
    addVariable(rootName, fullPath, accessType);
  }
  
  return variables;
}

/**
 * Determine the type of access from an access chain
 */
function parseAccessChain(chain) {
  if (!chain) return 'simple';
  
  const hasArrayIndex = /\[\s*(-?\d+)\s*\]/.test(chain);
  const hasDictKey = /\[\s*['"]/.test(chain);
  const hasProperty = /\.\s*[a-zA-Z_]/.test(chain);
  
  if (hasArrayIndex && (hasDictKey || hasProperty)) return 'mixed';
  if (hasArrayIndex) return 'array';
  if (hasDictKey) return 'dict';
  if (hasProperty) return 'property';
  
  return 'simple';
}

/**
 * Build a clean dot-notation path from root name and access chain
 */
function buildPath(rootName, accessChain, stringResolver = null) {
  if (!accessChain) return rootName;
  
  let path = rootName;
  const accessPattern = /\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)|\s*\[\s*['"]?([^\]'"]+)['"]?\s*\]/g;
  
  let match;
  while ((match = accessPattern.exec(accessChain)) !== null) {
    const propName = match[1];
    const indexOrKey = match[2];
    
    if (propName) {
      // Skip method calls
      const remaining = accessChain.slice(match.index + match[0].length).trim();
      if (remaining.startsWith('(') && COMMON_METHODS.has(propName)) continue;
      path += '.' + propName;
    } else if (indexOrKey !== undefined) {
      let cleanIndex = indexOrKey.trim();
      
      // Resolve string placeholder if resolver is provided and it's a placeholder
      if (stringResolver && cleanIndex.startsWith('__STR_')) {
        cleanIndex = stringResolver(cleanIndex);
      }
      
      if (/^-?\d+$/.test(cleanIndex)) {
        path += '.' + Math.abs(parseInt(cleanIndex, 10));
        } else {
        path += '.' + cleanIndex;
      }
    }
  }
  
  return path;
}

// ============================================================================
// STATEMENT PARSER
// ============================================================================

/**
 * Parse a statement block and extract structured information
 */
function parseStatement(content) {
  const trimmed = content.trim();
  
  // For loop
  const forMatch = trimmed.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s+in\s+(.+)$/);
  if (forMatch) {
    return {
      type: 'for',
      data: {
        loopVars: forMatch[2] ? [forMatch[1], forMatch[2]] : [forMatch[1]],
        iterable: forMatch[3].trim()
      }
    };
  }
  
  if (/^endfor\s*$/.test(trimmed)) {
    return { type: 'endfor', data: {} };
  }
  
  // Set statement (inline)
  const setInlineMatch = trimmed.match(/^set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (setInlineMatch) {
    return {
      type: 'set',
      data: {
        varName: setInlineMatch[1],
        expression: setInlineMatch[2].trim(),
        isBlock: false
      }
    };
  }
  
  // Set statement (block)
  const setBlockMatch = trimmed.match(/^set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
  if (setBlockMatch) {
    return {
      type: 'set',
      data: { varName: setBlockMatch[1], isBlock: true }
    };
  }
  
  if (/^endset\s*$/.test(trimmed)) {
    return { type: 'endset', data: {} };
  }
  
  // If/elif/else/endif
  const ifMatch = trimmed.match(/^if\s+(.+)$/);
  if (ifMatch) {
    return { type: 'if', data: { condition: ifMatch[1].trim() } };
  }
  
  const elifMatch = trimmed.match(/^elif\s+(.+)$/);
  if (elifMatch) {
    return { type: 'elif', data: { condition: elifMatch[1].trim() } };
  }
  
  if (/^else\s*$/.test(trimmed)) {
    return { type: 'else', data: {} };
  }
  if (/^endif\s*$/.test(trimmed)) {
    return { type: 'endif', data: {} };
  }
  
  // Import
  const importMatch = trimmed.match(/^import\s+(.+?)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
  if (importMatch) {
    return {
      type: 'import',
      data: { path: importMatch[1], alias: importMatch[2] }
    };
  }
  
  // From import
  const fromImportMatch = trimmed.match(/^from\s+['"]([^'"]+)['"]\s+import\s+(.+)$/);
  if (fromImportMatch) {
    const imports = fromImportMatch[2].split(',').map(s => {
      const parts = s.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    });
    return {
      type: 'from_import',
      data: { path: fromImportMatch[1], imports }
    };
  }
  
  // With
  const withMatch = trimmed.match(/^with\s+(.+)$/);
  if (withMatch) {
    return { type: 'with', data: { expression: withMatch[1].trim() } };
  }
  if (/^endwith\s*$/.test(trimmed)) {
    return { type: 'endwith', data: {} };
  }
  
  // Macro
  const macroMatch = trimmed.match(/^macro\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
  if (macroMatch) {
    const params = macroMatch[2]
      .split(',')
      .map(p => p.trim().split('=')[0].trim())
      .filter(p => p);
    return {
      type: 'macro',
      data: { name: macroMatch[1], params }
    };
  }
  if (/^endmacro\s*$/.test(trimmed)) {
    return { type: 'endmacro', data: {} };
  }
  
  // Block
  const blockMatch = trimmed.match(/^block\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (blockMatch) {
    return { type: 'block', data: { name: blockMatch[1] } };
  }
  if (/^endblock/.test(trimmed)) {
    return { type: 'endblock', data: {} };
  }
  
  // Extends/Include
  const extendsMatch = trimmed.match(/^extends\s+(.+)$/);
  if (extendsMatch) {
    return { type: 'extends', data: { path: extendsMatch[1] } };
  }
  
  const includeMatch = trimmed.match(/^include\s+(.+?)(?:\s+(?:with|without)\s+context)?(?:\s+ignore\s+missing)?$/);
  if (includeMatch) {
    return { type: 'include', data: { path: includeMatch[1] } };
  }
  
  // Call
  const callMatch = trimmed.match(/^call(?:\s*\([^)]*\))?\s+(.+)$/);
  if (callMatch) {
    return { type: 'call', data: { expression: callMatch[1] } };
  }
  if (/^endcall\s*$/.test(trimmed)) {
    return { type: 'endcall', data: {} };
  }
  
  // Do
  const doMatch = trimmed.match(/^do\s+(.+)$/);
  if (doMatch) {
    return { type: 'do', data: { expression: doMatch[1] } };
  }
  
  // Filter
  const filterMatch = trimmed.match(/^filter\s+(.+)$/);
  if (filterMatch) {
    return { type: 'filter', data: { filter: filterMatch[1] } };
  }
  if (/^endfilter\s*$/.test(trimmed)) {
    return { type: 'endfilter', data: {} };
  }
  
  return { type: 'unknown', data: { content: trimmed } };
}

// ============================================================================
// SCOPE TRACKING
// ============================================================================

/**
 * Tracks variable scopes during template parsing
 */
class ScopeTracker {
  constructor() {
    this.scopes = [new Set()];
    this.assignedVars = new Set();
    this.importedNames = new Set();
    this.initializedVars = new Set();
  }
  
  pushScope() {
    this.scopes.push(new Set());
  }
  
  popScope() {
    if (this.scopes.length > 1) {
      this.scopes.pop();
    }
  }
  
  addLocal(name) {
    this.scopes[this.scopes.length - 1].add(name);
  }
  
  addAssigned(name) {
    this.assignedVars.add(name);
  }
  
  addImport(name) {
    this.importedNames.add(name);
  }
  
  markInitialized(name) {
    this.initializedVars.add(name);
  }
  
  isInitialized(name) {
    return this.initializedVars.has(name);
  }
  
  isLocal(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return true;
    }
    return this.assignedVars.has(name) || this.importedNames.has(name);
  }
  
  getAllLocals() {
    const all = new Set();
    for (const scope of this.scopes) {
      for (const name of scope) all.add(name);
    }
    for (const name of this.assignedVars) all.add(name);
    return all;
  }
}

/**
 * Collects variables and their usage information
 */
class VariableCollector {
  constructor() {
    this.variables = new Map();
  }
  
  add(name, path, context) {
    if (!this.variables.has(name)) {
      this.variables.set(name, { paths: new Set(), usages: [] });
    }
    const info = this.variables.get(name);
    info.paths.add(path);
    info.usages.push(context);
  }
  
  getAll() {
    return this.variables;
  }
}

// ============================================================================
// MAIN EXTRACTION LOGIC
// ============================================================================

/**
 * Extract variables from a Jinja template.
 * 
 * @param {string} template - The Jinja template content
 * @returns {Object} - Object mapping variable names to their default values
 */
function extractVariablesFromTemplate(template) {
  const tokens = tokenize(template);
  const scope = new ScopeTracker();
  const collector = new VariableCollector();
  
  // Track loop variables for building item structures
  const loopVarToIterable = new Map();
  const loopVarStack = [];
  
  // ==========================================================================
  // PASS 1: Identify all assignments and imports
  // ==========================================================================
  for (const token of tokens) {
    if (token.type !== TokenType.STATEMENT) continue;
    
    const stmt = parseStatement(token.content);
    
    if (stmt.type === 'set') {
      scope.addAssigned(stmt.data.varName);
    } else if (stmt.type === 'import') {
      scope.addImport(stmt.data.alias);
    } else if (stmt.type === 'from_import') {
      for (const name of stmt.data.imports) {
        scope.addImport(name);
      }
    }
  }
  
  // ==========================================================================
  // PASS 2: Extract variable references with proper scoping
  // ==========================================================================
  for (const token of tokens) {
    if (token.type === TokenType.LITERAL || token.type === TokenType.COMMENT) {
      continue;
    }
    
    if (token.type === TokenType.EXPRESSION) {
      processExpression(token.content, scope, collector, 'expression');
      
      // Track loop variable property accesses
      for (const loopVar of loopVarStack) {
        const loopInfo = loopVarToIterable.get(loopVar);
        if (loopInfo) {
          const propPattern = new RegExp(`\\b${loopVar}\\s*\\.\\s*([a-zA-Z_][a-zA-Z0-9_]*)`, 'g');
          let propMatch;
          while ((propMatch = propPattern.exec(token.content)) !== null) {
            loopInfo.itemProps.add(propMatch[1]);
          }
        }
      }
    }
    
    if (token.type === TokenType.STATEMENT) {
      const stmt = parseStatement(token.content);
      
      switch (stmt.type) {
        case 'for':
          scope.pushScope();
          for (const loopVar of stmt.data.loopVars) {
            scope.addLocal(loopVar);
            loopVarToIterable.set(loopVar, {
              iterablePath: stmt.data.iterable.trim(),
              itemProps: new Set()
            });
            loopVarStack.push(loopVar);
          }
          processExpression(stmt.data.iterable, scope, collector, 'for_iterable');
          break;
          
        case 'endfor':
          loopVarStack.pop();
          scope.popScope();
          break;
          
        case 'set':
          if (stmt.data.expression) {
            const varName = stmt.data.varName;
            const hasSelfRef = new RegExp(`\\b${varName}\\b`).test(stmt.data.expression);
            
            if (hasSelfRef && !scope.isInitialized(varName)) {
              // Self-reference before initialization - extract it
              scope.assignedVars.delete(varName);
              processExpression(stmt.data.expression, scope, collector, 'set_expression');
              scope.assignedVars.add(varName);
      } else {
              processExpression(stmt.data.expression, scope, collector, 'set_expression');
            }
            
            if (!hasSelfRef) {
              scope.markInitialized(varName);
      }
    } else {
            scope.markInitialized(stmt.data.varName);
          }
          break;
          
        case 'if':
        case 'elif':
          processExpression(stmt.data.condition, scope, collector, 'condition');
          break;
          
        case 'with':
          scope.pushScope();
          for (const part of stmt.data.expression.split(',')) {
            const assignMatch = part.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)/);
            if (assignMatch) {
              scope.addLocal(assignMatch[1]);
              processExpression(assignMatch[2], scope, collector, 'with_expression');
          } else {
              processExpression(part, scope, collector, 'with_expression');
            }
          }
          break;
          
        case 'endwith':
          scope.popScope();
          break;
          
        case 'macro':
          scope.pushScope();
          for (const param of stmt.data.params) {
            scope.addLocal(param);
          }
          break;
          
        case 'endmacro':
          scope.popScope();
          break;
          
        case 'call':
          processExpression(stmt.data.expression, scope, collector, 'call');
          break;
          
        case 'do':
          processExpression(stmt.data.expression, scope, collector, 'do');
          break;
          
        case 'include':
        case 'extends':
        case 'import':
          const pathExpr = stmt.data.path || '';
          if (pathExpr.includes('~')) {
            processExpression(pathExpr, scope, collector, 'dynamic_path');
          }
          break;
      }
    }
  }
  
  return buildResultObject(collector, template, loopVarToIterable);
}

/**
 * Process an expression and extract variables
 */
function processExpression(expr, scope, collector, context) {
  const localVars = scope.getAllLocals();
  const importedNames = scope.importedNames;
  
  for (const v of parseExpression(expr, localVars, importedNames)) {
    if (!scope.isLocal(v.name)) {
      collector.add(v.name, v.path, {
        type: context,
        expression: expr,
        accessType: v.accessType
      });
    }
  }
}

// ============================================================================
// RESULT BUILDING
// ============================================================================

/**
 * Build the result object with inferred default values
 */
function buildResultObject(collector, template, loopVarToIterable = new Map()) {
  const result = {};
  
  // Build map of iterables to their item properties
  const iterableItemProps = new Map();
  for (const [, info] of loopVarToIterable) {
    const iterableName = info.iterablePath.split('.')[0];
    if (info.itemProps.size > 0) {
      if (!iterableItemProps.has(iterableName)) {
        iterableItemProps.set(iterableName, new Set());
      }
      for (const prop of info.itemProps) {
        iterableItemProps.get(iterableName).add(prop);
      }
    }
  }
  
  for (const [name, info] of collector.getAll()) {
    const defaultValue = inferDefaultValue(name, info, template);
    const itemProps = iterableItemProps.get(name);
    
    if (itemProps && itemProps.size > 0) {
      // Iterable with known item structure
      const itemStructure = {};
      for (const prop of itemProps) {
        itemStructure[prop] = '';
      }
      result[name] = [itemStructure];
    } else {
      const paths = Array.from(info.paths).sort();
      
      if (paths.length === 1 && paths[0] === name) {
        result[name] = defaultValue;
      } else {
        result[name] = buildNestedStructure(paths, defaultValue);
      }
    }
  }
  
  return result;
}

/**
 * Infer a default value based on usage patterns
 */
function inferDefaultValue(name, info, template) {
  const usages = info.usages;
  const paths = Array.from(info.paths);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Array iteration
  if (usages.some(u => u.type === 'for_iterable')) {
    return [''];
  }
  
  // Dict iteration (.items(), .keys(), .values())
  if (new RegExp(`${escaped}(?:\\.[a-zA-Z_][a-zA-Z0-9_]*)*\\s*\\.\\s*(?:items|keys|values)\\s*\\(`).test(template)) {
    return { key: 'value' };
  }
  
  // Numeric operations
  const numericPatterns = [
    `${escaped}\\s*[+\\-*/%]\\s*\\d`,
    `\\d\\s*[+\\-*/%]\\s*${escaped}`,
    `${escaped}\\s*[<>]=?\\s*\\d`,
    `\\d\\s*[<>]=?\\s*${escaped}`,
    `range\\s*\\([^)]*${escaped}`,
    `${escaped}\\s*\\|\\s*(?:abs|round|int|float)\\b`
  ];
  
  for (const p of numericPatterns) {
    if (new RegExp(p).test(template)) return 0;
  }
  
  // String operations
  const stringPatterns = [
    `${escaped}\\s*(?:==|!=)\\s*['"]`,
    `['"]\\s*(?:==|!=)\\s*${escaped}`,
    `${escaped}\\s*\\|\\s*(?:lower|upper|title|capitalize|trim|strip)\\b`
  ];
  
  for (const p of stringPatterns) {
    if (new RegExp(p).test(template)) return '';
  }
  
  // Property access indicates object
  if (paths.some(p => p.includes('.'))) {
    return {};
  }
  
  return '';
}

/**
 * Build nested structure from paths
 */
function buildNestedStructure(paths, defaultValue) {
  const nestedPaths = paths.filter(p => p.includes('.'));
  
  if (nestedPaths.length === 0) {
    return defaultValue;
  }
  
  const structure = {};
  
  for (const path of nestedPaths) {
    const parts = path.split('.').slice(1);
    setNestedPath(structure, parts, '');
  }
  
  if (Array.isArray(defaultValue)) {
    return Object.keys(structure).length > 0 ? [structure] : [''];
  }
  
  return Object.keys(structure).length > 0 ? structure : defaultValue;
}

/**
 * Set a nested path in an object
 */
function setNestedPath(obj, parts, value) {
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in current)) {
      const nextKey = parts[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key];
  }
  
  const lastKey = parts[parts.length - 1];
  if (Array.isArray(current) && /^\d+$/.test(lastKey)) {
    const index = parseInt(lastKey, 10);
    while (current.length <= index) current.push('');
    current[index] = value;
      } else {
    current[lastKey] = value;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  extractVariablesFromTemplate,
  // Export internals for testing
  tokenize,
  parseExpression,
  parseStatement,
  ScopeTracker,
  VariableCollector,
  JINJA_KEYWORDS,
  JINJA_FILTERS
};
