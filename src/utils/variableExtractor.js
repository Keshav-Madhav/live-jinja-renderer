/**
 * Extracts variable names and structures from a Jinja template
 */
function extractVariablesFromTemplate(template) {
  const variableStructures = {};
  const referencedVariables = new Set();
  const assignedVariables = new Set(); // Track variables assigned via {% set %}
  const loopVariables = new Set(); // Track loop iteration variables
  
  const jinjaKeywords = new Set([
    'if', 'elif', 'else', 'endif', 'for', 'endfor', 'while', 'endwhile',
    'set', 'endset', 'block', 'endblock', 'extends', 'include', 'import',
    'from', 'macro', 'endmacro', 'call', 'endcall', 'filter', 'endfilter',
    'with', 'endwith', 'autoescape', 'endautoescape', 'raw', 'endraw',
    'trans', 'endtrans', 'pluralize',
    'not', 'and', 'or', 'in', 'is', 'true', 'false', 'none', 'null',
    'True', 'False', 'None', 'NULL',
    'defined', 'undefined', 'none', 'boolean', 'false', 'true', 'integer',
    'float', 'number', 'string', 'sequence', 'iterable', 'mapping',
    'sameas', 'escaped', 'odd', 'even', 'divisibleby', 'equalto',
    'range', 'lipsum', 'dict', 'cycler', 'joiner', 'len', 'abs', 'round',
    'min', 'max', 'sum', 'list', 'tuple', 'set', 'sorted', 'reversed',
    'enumerate', 'zip', 'filter', 'map', 'any', 'all',
    'loop'
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
   * Extracts variables from boolean/conditional expressions
   * Handles string literals, operators, function calls, and nested expressions
   */
  function extractVariablesFromExpression(expression, excludeAssigned = false) {
    const variables = [];
    
    let cleanedExpression = expression
      .replace(/'[^']*'/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/\b\d+\.?\d*\b/g, '')
      .replace(/\s+(?:and|or|not|in|is|==|!=|<=|>=|<|>)\s+/gi, ' ')
      .replace(/\s*[\(\)\[\]]\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
        
    const functionCallPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)/g;
    let funcMatch;
    while ((funcMatch = functionCallPattern.exec(expression)) !== null) {
      const funcName = funcMatch[1];
      const args = funcMatch[2];
      
      if (!isJinjaKeyword(funcName) && !loopVariables.has(funcName)) {
        variables.push(funcName);
      }
      
      if (args.trim()) {
        const argsVars = extractVariablesFromExpression(args, excludeAssigned);
        variables.push(...argsVars);
      }
    }
    
    const varMatches = cleanedExpression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g);
    
    if (varMatches) {
      for (const varName of varMatches) {
        const rootVar = varName.split('.')[0];
        if (!isJinjaKeyword(rootVar) && !loopVariables.has(rootVar)) {
          // Skip if this is an assigned variable and we're excluding those
          if (excludeAssigned && assignedVariables.has(rootVar)) {
            continue;
          }
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
  const setAssignmentPattern = /\{\%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^%]+)\s*\%\}/g;
  let match;
  
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
          safeSetVariable(rootVar, '');
        }
      }
    }
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
      safeSetVariable(rootVar, '');
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
            safeSetVariable(filterRoot, '');
          }
        }
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
          safeSetVariable(rootVar, '');
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
          safeSetVariable(rootVar, '');
        }
      }
    }
  }
  
  // Extract array access patterns like {{ variable[0] }} or {{ variable[key] }}
  const arrayAccessPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\[\s*([^\]]+)\s*\](?:\s*\|\s*[^}]+)?\s*\}\}/g;
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
        safeSetVariable(indexOrKey, '');
      }
    }
    
    if (/^\d+$/.test(indexOrKey)) {
      // Numeric index - it's an array
      const index = parseInt(indexOrKey);
      safeSetVariable(rootVar, basePath.includes('.') ? {} : [], true);
      const arrayPath = basePath + '.' + index;
      setNestedProperty(variableStructures, arrayPath, '');
    } else {
      // String/variable key - could be dict or array
      safeSetVariable(rootVar, basePath.includes('.') ? {} : [], true);
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
