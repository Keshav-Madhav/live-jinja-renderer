/**
 * Extracts variable names and structures from a Jinja template
 */
function extractVariablesFromTemplate(template) {
  const variableStructures = {};
  const referencedVariables = new Set();
  const assignedVariables = new Set(); // Track variables assigned via {% set %}
  const loopVariables = new Set(); // Track loop iteration variables
  
  const jinjaKeywords = new Set([
    // Control structures
    'if', 'elif', 'else', 'endif', 'for', 'endfor', 'while', 'endwhile',
    'set', 'endset', 'block', 'endblock', 'extends', 'include', 'import',
    'from', 'macro', 'endmacro', 'call', 'endcall', 'filter', 'endfilter',
    'with', 'endwith', 'autoescape', 'endautoescape', 'raw', 'endraw',
    'trans', 'endtrans', 'pluralize', 'do',
    
    // Operators and logic
    'not', 'and', 'or', 'in', 'is', 'true', 'false', 'none', 'null',
    'True', 'False', 'None', 'NULL',
    
    // Tests
    'defined', 'undefined', 'none', 'boolean', 'false', 'true', 'integer',
    'float', 'number', 'string', 'sequence', 'iterable', 'mapping',
    'sameas', 'escaped', 'odd', 'even', 'divisibleby', 'equalto',
    'lower', 'upper', 'callable',
    
    // Built-in functions
    'range', 'lipsum', 'dict', 'cycler', 'joiner', 'namespace',
    
    // Built-in filters (common ones that might be confused with variables)
    'abs', 'attr', 'batch', 'capitalize', 'center', 'default', 'dictsort',
    'escape', 'filesizeformat', 'first', 'float', 'forceescape', 'format',
    'groupby', 'indent', 'int', 'join', 'last', 'length', 'list', 'lower',
    'map', 'max', 'min', 'pprint', 'random', 'reject', 'rejectattr',
    'replace', 'reverse', 'round', 'safe', 'select', 'selectattr', 'slice',
    'sort', 'string', 'striptags', 'sum', 'title', 'tojson', 'trim', 'truncate',
    'unique', 'upper', 'urlencode', 'urlize', 'wordcount', 'wordwrap', 'xmlattr',
    
    // Python built-ins commonly used in Jinja
    'len', 'sorted', 'reversed', 'enumerate', 'zip', 'filter', 'any', 'all',
    'tuple', 'set',
    
    // List/Dict/String methods (should not be treated as variables)
    'append', 'extend', 'insert', 'remove', 'pop', 'clear', 'index', 'count',
    'copy', 'keys', 'values', 'items', 'get', 'update', 'setdefault',
    'split', 'strip', 'lstrip', 'rstrip', 'startswith', 'endswith',
    'find', 'rfind', 'isdigit', 'isalpha', 'isalnum', 'islower', 'isupper',
    
    // Special variables
    'loop', 'self', 'super', 'varargs', 'kwargs'
  ]);
  
  function isJinjaKeyword(varName) {
    return jinjaKeywords.has(varName.toLowerCase());
  }
  
  /**
   * Checks if an expression is a pure literal (no variable references)
   */
  function isPureLiteral(expression) {
    const cleaned = expression
      .replace(/'[^']*'/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/\b\d+\.?\d*\b/g, '')
      .replace(/[\s\+\-\*\/\%\(\)\[\]\{\},:\|]+/g, ' ')
      .trim();
    
    // If nothing is left after removing literals and operators, it's pure
    if (!cleaned) return true;
    
    // Check if remaining tokens are all keywords
    const tokens = cleaned.split(/\s+/).filter(t => t);
    return tokens.every(token => isJinjaKeyword(token));
  }
  
  /**
   * Infer variable type from template context
   */
  function inferVariableType(varName, template) {
    // Escape special regex characters in variable name
    const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Check for string usage patterns (check this FIRST before boolean)
    const stringPatterns = [
      // Comparison with string literals
      new RegExp(`${escapedVar}\\s*(?:==|!=|in)\\s*['"]`, 'g'),
      new RegExp(`['"]\\s*(?:==|!=)\\s*${escapedVar}`, 'g'),
      // String methods/filters
      new RegExp(`${escapedVar}\\s*\\|\\s*(?:lower|upper|title|capitalize|strip|trim|replace|split|join)`, 'g'),
      // in operator with list of strings
      new RegExp(`${escapedVar}\\s+(?:not\\s+)?in\\s+\\[\\s*['"]`, 'g'),
    ];
    
    for (const pattern of stringPatterns) {
      if (pattern.test(template)) {
        return ''; // string value
      }
    }
    
    // Check for numeric usage patterns
    const numericPatterns = [
      // Arithmetic operations
      new RegExp(`${escapedVar}\\s*[+\\-*/%]\\s*\\d+`, 'g'),
      new RegExp(`\\d+\\s*[+\\-*/%]\\s*${escapedVar}`, 'g'),
      // Division operations (common for numbers)
      new RegExp(`${escapedVar}\\s*/\\s*\\d+`, 'g'),
      new RegExp(`\\(\\s*${escapedVar}\\s*[+\\-*/%]`, 'g'),
      // Comparison with numbers
      new RegExp(`${escapedVar}\\s*[<>]=?\\s*\\d+`, 'g'),
      new RegExp(`\\d+\\s*[<>]=?\\s*${escapedVar}`, 'g'),
      // Numeric filters
      new RegExp(`${escapedVar}\\s*\\|\\s*(?:abs|round|int|float)`, 'g'),
      // range() function
      new RegExp(`range\\([^)]*${escapedVar}[^)]*\\)`, 'g'),
      // length comparison (numeric result)
      new RegExp(`${escapedVar}\\s*\\|\\s*length\\s*[<>=]`, 'g'),
    ];
    
    for (const pattern of numericPatterns) {
      if (pattern.test(template)) {
        return 0; // default numeric value
      }
    }
    
    // Check for boolean usage patterns (check AFTER string patterns)
    const booleanPatterns = [
      // if variable (standalone boolean check) - but not with comparisons
      new RegExp(`\\{%\\s*if\\s+${escapedVar}\\s*%\\}`, 'g'),
      new RegExp(`\\{%\\s*if\\s+not\\s+${escapedVar}\\s*%\\}`, 'g'),
      // ternary with boolean variable
      new RegExp(`if\\s+${escapedVar}\\s+else`, 'g'),
      new RegExp(`if\\s+not\\s+${escapedVar}\\s+else`, 'g'),
    ];
    
    for (const pattern of booleanPatterns) {
      if (pattern.test(template)) {
        // Double check it's not a string comparison
        const stringComparisonCheck = new RegExp(`${escapedVar}\\s*(?:==|!=|in|not\\s+in|<|>|<=|>=)`, 'g');
        if (!stringComparisonCheck.test(template)) {
          return false; // default boolean value
        }
      }
    }
    
    // Default to string
    return '';
  }
  
  /**
   * Extracts variables from boolean/conditional expressions
   * Handles string literals, operators, function calls, and nested expressions
   */
  function extractVariablesFromExpression(expression, excludeAssigned = false) {
    const variables = [];
    
    // First, extract method calls (e.g., list.append(x)) to handle them specially
    const methodCallPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
    let methodMatch;
    const methodCalls = [];
    
    while ((methodMatch = methodCallPattern.exec(expression)) !== null) {
      const objectPath = methodMatch[1];
      const methodName = methodMatch[2];
      const args = methodMatch[3];
      
      methodCalls.push({
        fullMatch: methodMatch[0],
        objectPath: objectPath,
        methodName: methodName,
        args: args
      });
      
      // Add the object being called (not the method name)
      const rootVar = objectPath.split('.')[0];
      if (!isJinjaKeyword(rootVar) && !loopVariables.has(rootVar)) {
        if (!excludeAssigned || !assignedVariables.has(rootVar)) {
          variables.push(objectPath);
        }
      }
      
      // Extract variables from arguments
      if (args.trim()) {
        const argsVars = extractVariablesFromExpression(args, excludeAssigned);
        variables.push(...argsVars);
      }
    }
    
    // Remove method calls from expression to avoid double processing
    let cleanedExpression = expression;
    for (const call of methodCalls) {
      cleanedExpression = cleanedExpression.replace(call.fullMatch, ' ');
    }
    
    // Clean the expression
    cleanedExpression = cleanedExpression
      .replace(/'[^']*'/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/\b\d+\.?\d*\b/g, '')
      .replace(/\s+(?:and|or|not|in|is|==|!=|<=|>=|<|>)\s+/gi, ' ')
      .replace(/\s*[\(\)\[\]]\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
        
    // Handle remaining function calls (not methods)
    const functionCallPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)/g;
    let funcMatch;
    while ((funcMatch = functionCallPattern.exec(cleanedExpression)) !== null) {
      const funcName = funcMatch[1];
      const args = funcMatch[2];
      
      if (!isJinjaKeyword(funcName) && !loopVariables.has(funcName)) {
        if (!excludeAssigned || !assignedVariables.has(funcName)) {
          variables.push(funcName);
        }
      }
      
      if (args.trim()) {
        const argsVars = extractVariablesFromExpression(args, excludeAssigned);
        variables.push(...argsVars);
      }
    }
    
    // Extract variable paths, but filter out method names
    const varMatches = cleanedExpression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g);
    
    if (varMatches) {
      for (const varName of varMatches) {
        const rootVar = varName.split('.')[0];
        
        // Skip keywords, loop variables, and method names
        if (isJinjaKeyword(rootVar) || loopVariables.has(rootVar)) {
          continue;
        }
        
        // Skip if this is an assigned variable and we're excluding those
        if (excludeAssigned && assignedVariables.has(rootVar)) {
          continue;
        }
        
        // Check if this variable path ends with a method name (shouldn't happen after cleaning, but extra safety)
        const parts = varName.split('.');
        const lastPart = parts[parts.length - 1];
        if (parts.length > 1 && isJinjaKeyword(lastPart)) {
          // This is something like "list.append" - only keep the object part
          const objectPart = parts.slice(0, -1).join('.');
          if (!variables.includes(objectPart)) {
            variables.push(objectPart);
          }
        } else {
          variables.push(varName);
        }
      }
    }
    
    return variables;
  }
  
  /**
   * Sets nested properties using dot notation (e.g., 'user.address.city')
   */
  function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        const nextKey = keys[i + 1];
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(lastKey)) {
      const index = parseInt(lastKey);
      while (current.length <= index) {
        current.push('');
      }
      current[index] = value;
    } else {
      current[lastKey] = value;
    }
  }

  /**
   * Safely sets a variable without overriding complex types with simple ones
   */
  function safeSetVariable(varName, newValue, allowOverride = false) {
    if (!(varName in variableStructures)) {
      variableStructures[varName] = newValue;
    } else if (allowOverride) {
      const existing = variableStructures[varName];
      const isExistingSimple = typeof existing === 'string' || typeof existing === 'boolean' || typeof existing === 'number';
      const isNewComplex = typeof newValue === 'object' && newValue !== null;
      
      if (isExistingSimple && isNewComplex) {
        variableStructures[varName] = newValue;
      }
    }
  }
  
  // First pass: Identify all loop variables to exclude them from extraction
  const loopVarPattern = /\{\%\s*for\s+(\w+)(?:\s*,\s*(\w+))?\s+in\s+/g;
  let loopMatch;
  while ((loopMatch = loopVarPattern.exec(template)) !== null) {
    loopVariables.add(loopMatch[1]);
    if (loopMatch[2]) {
      loopVariables.add(loopMatch[2]); // For dict unpacking: for key, value in dict
    }
  }
  
  // Track all {% set %} assignments first to identify inferred variables
  // Handle both inline: {% set x = value %} and block: {% set x %}...{% endset %}
  const setAssignmentPattern = /\{\%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^%]+)\s*\%\}/g;
  const setBlockPattern = /\{\%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\%\}(.*?)\{\%\s*endset\s*\%\}/gs;
  let match;
  
  // Handle inline set statements
  while ((match = setAssignmentPattern.exec(template)) !== null) {
    const assignedVar = match[1];
    const expression = match[2].trim();
    
    assignedVariables.add(assignedVar);
    
    // Check if the expression references the variable being assigned (e.g., a = a + 1)
    const referencesItself = new RegExp(`\\b${assignedVar}\\b`).test(expression);
    
    if (referencesItself || !isPureLiteral(expression)) {
      // Extract variables from the expression
      const varsInExpression = extractVariablesFromExpression(expression, false);
      
      for (const fullPath of varsInExpression) {
        const rootVar = fullPath.split('.')[0];
        
        if (isJinjaKeyword(rootVar)) continue;
        
        referencedVariables.add(rootVar);
        
        if (fullPath.includes('.')) {
          safeSetVariable(rootVar, {}, true);
          setNestedProperty(variableStructures, fullPath, '');
        } else {
          const inferredType = inferVariableType(rootVar, template);
          safeSetVariable(rootVar, inferredType);
        }
      }
    }
  }
  
  // Handle block set statements
  while ((match = setBlockPattern.exec(template)) !== null) {
    const assignedVar = match[1];
    assignedVariables.add(assignedVar);
    // Note: We don't extract from block content as it's typically literal content
  }
  
  // Extract {{ variable.property }} patterns with optional filters
  const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?:\s*\|[^}]+)?\s*\}\}/g;
  
  while ((match = variablePattern.exec(template)) !== null) {
    const fullMatch = match[0];
    const fullPath = match[1];
    const rootVar = fullPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue; // Skip loop iteration variables
    
    referencedVariables.add(rootVar);
    
    if (fullPath.includes('.')) {
      safeSetVariable(rootVar, {}, true);
      setNestedProperty(variableStructures, fullPath, '');
    } else {
      const inferredType = inferVariableType(rootVar, template);
      safeSetVariable(rootVar, inferredType);
    }
    
    // Extract variables from filter arguments (e.g., {{ value | default(fallback) }})
    const filterPattern = /\|\s*(\w+)\s*\(([^)]+)\)/g;
    let filterMatch;
    while ((filterMatch = filterPattern.exec(fullMatch)) !== null) {
      const filterArgs = filterMatch[2];
      const varsInFilter = extractVariablesFromExpression(filterArgs, true);
      
      for (const filterVar of varsInFilter) {
        const filterRoot = filterVar.split('.')[0];
        if (!isJinjaKeyword(filterRoot) && !assignedVariables.has(filterRoot) && !loopVariables.has(filterRoot)) {
          referencedVariables.add(filterRoot);
          if (filterVar.includes('.')) {
            safeSetVariable(filterRoot, {}, true);
            setNestedProperty(variableStructures, filterVar, '');
          } else {
            const inferredType = inferVariableType(filterRoot, template);
            safeSetVariable(filterRoot, inferredType);
          }
        }
      }
    }
  }
  
  // Extract ternary expressions: {{ 'yes' if condition else 'no' }}
  const ternaryPattern = /\{\{\s*[^}]*\s+if\s+([^}]+?)\s+else\s+[^}]*\}\}/g;
  while ((match = ternaryPattern.exec(template)) !== null) {
    const condition = match[1];
    const varsInCondition = extractVariablesFromExpression(condition, true);
    
    for (const fullPath of varsInCondition) {
      const rootVar = fullPath.split('.')[0];
      
      if (assignedVariables.has(rootVar)) continue;
      if (loopVariables.has(rootVar)) continue;
      
      referencedVariables.add(rootVar);
      
      if (fullPath.includes('.')) {
        safeSetVariable(rootVar, {}, true);
        setNestedProperty(variableStructures, fullPath, '');
      } else {
        const inferredType = inferVariableType(rootVar, template);
        safeSetVariable(rootVar, inferredType);
      }
    }
  }
  
  // Extract method calls: {{ variable.keys() }}, {{ variable.values() }}, etc.
  const methodCallPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\.\s*(\w+)\s*\(\s*\)\s*(?:\s*\|[^}]+)?\s*\}\}/g;
  while ((match = methodCallPattern.exec(template)) !== null) {
    const fullPath = match[1];
    const methodName = match[2];
    const rootVar = fullPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue;
    
    referencedVariables.add(rootVar);
    
    // Infer type based on method name
    if (['keys', 'values', 'items'].includes(methodName)) {
      // It's a dictionary
      if (fullPath.includes('.')) {
        safeSetVariable(rootVar, {}, true);
        setNestedProperty(variableStructures, fullPath, { key: 'value' });
      } else {
        safeSetVariable(rootVar, { key: 'value' }, true);
      }
    } else {
      // Generic object with method
      if (fullPath.includes('.')) {
        safeSetVariable(rootVar, {}, true);
        setNestedProperty(variableStructures, fullPath, '');
      } else {
        const inferredType = inferVariableType(rootVar, template);
        safeSetVariable(rootVar, inferredType);
      }
    }
  }
  
  // Extract {% for item in variable %} patterns - marks variable as array
  const forPattern = /\{\%\s*for\s+\w+\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\%\}/g;
  while ((match = forPattern.exec(template)) !== null) {
    const fullPath = match[1];
    const rootVar = fullPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue; // Avoid nested loop conflicts
    
    referencedVariables.add(rootVar);
    
    if (fullPath.includes('.')) {
      // Iterating over a nested property
      safeSetVariable(rootVar, {}, true);
      setNestedProperty(variableStructures, fullPath, ['']);
    } else {
      if (!(rootVar in variableStructures)) {
        variableStructures[rootVar] = [''];
      } else if (!Array.isArray(variableStructures[rootVar]) && typeof variableStructures[rootVar] !== 'object') {
        variableStructures[rootVar] = [''];
      }
    }
  }
  
  // Extract {% for key, value in variable.items() %} patterns - marks variable as dict
  const dictForPattern = /\{\%\s*for\s+\w+,\s*\w+\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\.\s*items\s*\(\s*\)\s*\%\}/g;
  while ((match = dictForPattern.exec(template)) !== null) {
    const fullPath = match[1];
    const rootVar = fullPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue;
    
    referencedVariables.add(rootVar);
    
    if (fullPath.includes('.')) {
      safeSetVariable(rootVar, {}, true);
      setNestedProperty(variableStructures, fullPath, { key: 'value' });
    } else {
      safeSetVariable(rootVar, { key: 'value' }, true);
    }
  }
  
  // Extract variables from {% if %} and {% elif %} conditions
  const ifConditionPattern = /\{\%\s*(?:el)?if\s+([^%]+)\s*\%\}/g;
  while ((match = ifConditionPattern.exec(template)) !== null) {
    const condition = match[1];
    const variablesInCondition = extractVariablesFromExpression(condition, true);
    
    for (const fullPath of variablesInCondition) {
      const rootVar = fullPath.split('.')[0];
      
      if (assignedVariables.has(rootVar)) continue;
      if (loopVariables.has(rootVar)) continue;
      
      referencedVariables.add(rootVar);
      
      if (fullPath.includes('.')) {
        safeSetVariable(rootVar, {}, true);
        setNestedProperty(variableStructures, fullPath, '');
      } else {
        if (!(rootVar in variableStructures)) {
          const inferredType = inferVariableType(rootVar, template);
          safeSetVariable(rootVar, inferredType);
        }
      }
    }
  }
  
  // Extract from {% with %} blocks
  const withPattern = /\{\%\s*with\s+([^%]+)\s*\%\}/g;
  while ((match = withPattern.exec(template)) !== null) {
    const withExpression = match[1];
    const varsInWith = extractVariablesFromExpression(withExpression, true);
    
    for (const fullPath of varsInWith) {
      const rootVar = fullPath.split('.')[0];
      
      if (assignedVariables.has(rootVar)) continue;
      if (loopVariables.has(rootVar)) continue;
      
      referencedVariables.add(rootVar);
      
      if (fullPath.includes('.')) {
        safeSetVariable(rootVar, {}, true);
        setNestedProperty(variableStructures, fullPath, '');
      } else {
        if (!(rootVar in variableStructures)) {
          const inferredType = inferVariableType(rootVar, template);
          safeSetVariable(rootVar, inferredType);
        }
      }
    }
  }
  
  // Extract array/dict access patterns like {{ variable[0] }}, {{ variable[key] }}, {{ variable[-1] }}
  const arrayAccessPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\[\s*([^\]:]+)\s*\](?:\s*\|\s*[^}]+)?\s*\}\}/g;
  while ((match = arrayAccessPattern.exec(template)) !== null) {
    const basePath = match[1];
    const indexOrKey = match[2].trim();
    const rootVar = basePath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue;
    
    referencedVariables.add(rootVar);
    
    // Check if the index/key is a variable reference
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(indexOrKey) && !isJinjaKeyword(indexOrKey)) {
      if (!assignedVariables.has(indexOrKey) && !loopVariables.has(indexOrKey)) {
        referencedVariables.add(indexOrKey);
        const inferredType = inferVariableType(indexOrKey, template);
        safeSetVariable(indexOrKey, inferredType);
      }
    }
    
    if (/^-?\d+$/.test(indexOrKey)) {
      // Numeric index (positive or negative) - it's an array
      const index = parseInt(indexOrKey);
      const absIndex = Math.abs(index);
      safeSetVariable(rootVar, basePath.includes('.') ? {} : [], true);
      const arrayPath = basePath + '.' + absIndex;
      setNestedProperty(variableStructures, arrayPath, '');
    } else {
      // String/variable key - could be dict or array
      safeSetVariable(rootVar, basePath.includes('.') ? {} : [], true);
    }
  }
  
  // Extract slice notation: {{ variable[1:5] }}, {{ items[:3] }}, {{ items[2:] }}
  const slicePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\[\s*(-?\d*)\s*:\s*(-?\d*)\s*(?::\s*(-?\d+))?\s*\](?:\s*\|\s*[^}]+)?\s*\}\}/g;
  while ((match = slicePattern.exec(template)) !== null) {
    const fullPath = match[1];
    const rootVar = fullPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue;
    
    referencedVariables.add(rootVar);
    
    // Slice notation means it's definitely an array/list
    if (fullPath.includes('.')) {
      safeSetVariable(rootVar, {}, true);
      setNestedProperty(variableStructures, fullPath, ['']);
    } else {
      safeSetVariable(rootVar, [''], true);
    }
  }
  
  // Extract loop item properties: {% for item in items %}{{ item.name }}{% endfor %}
  const loopWithPropertyPattern = /\{\%\s*for\s+(\w+)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\%\}(.*?)\{\%\s*endfor\s*\%\}/gs;
  while ((match = loopWithPropertyPattern.exec(template)) !== null) {
    const loopVar = match[1];
    const arrayPath = match[2];
    const loopContent = match[3];
    const rootVar = arrayPath.split('.')[0];
    
    if (isJinjaKeyword(rootVar)) continue;
    if (assignedVariables.has(rootVar)) continue;
    if (loopVariables.has(rootVar)) continue;
    
    referencedVariables.add(rootVar);
    
    // Find properties accessed on the loop variable
    const loopVarPattern = new RegExp(`\\{\\{\\s*${loopVar}(?:\\.([a-zA-Z_][a-zA-Z0-9_.]*))?`, 'g');
    let propMatch;
    const itemStructure = {};
    
    while ((propMatch = loopVarPattern.exec(loopContent)) !== null) {
      if (propMatch[1]) {
        const propPath = propMatch[1];
        const keys = propPath.split('.');
        let current = itemStructure;
        
        for (let i = 0; i < keys.length; i++) {
          if (i === keys.length - 1) {
            current[keys[i]] = '';
          } else {
            if (!(keys[i] in current)) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
        }
      }
    }
    
    // Also check for array access on loop variable: {{ item[0] }} or {{ item['key'] }}
    const loopArrayAccessPattern = new RegExp(`\\{\\{\\s*${loopVar}\\s*\\[\\s*[^\\]]+\\s*\\]`, 'g');
    if (loopArrayAccessPattern.test(loopContent)) {
      // Loop items are arrays or dicts
      if (Object.keys(itemStructure).length === 0) {
        itemStructure['0'] = '';
      }
    }
    
    if (Object.keys(itemStructure).length > 0) {
      if (arrayPath.includes('.')) {
        safeSetVariable(rootVar, {}, true);
        setNestedProperty(variableStructures, arrayPath, [itemStructure]);
      } else {
        safeSetVariable(rootVar, [itemStructure], true);
      }
    }
  }
  
  // Only return variables that were actually referenced in the template
  const finalVariableStructures = {};
  for (const [varName, structure] of Object.entries(variableStructures)) {
    if (referencedVariables.has(varName)) {
      finalVariableStructures[varName] = structure;
    }
  }
  
  return finalVariableStructures;
}

module.exports = {
  extractVariablesFromTemplate
};
