/**
 * Extracts variable names and structures from a Jinja template
 */
function extractVariablesFromTemplate(template) {
  const variableStructures = {};
  const referencedVariables = new Set();
  
  // Jinja2 keywords and operators that should NOT be treated as variables
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
  
  // Extract {% set %} patterns
  const setPattern = /\{\%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\%\}/g;
  let match;
  
  while ((match = setPattern.exec(template)) !== null) {
    const sourceVar = match[2];
    const rootSourceVar = sourceVar.split('.')[0];
    
    if (isJinjaKeyword(rootSourceVar)) continue;
    
    referencedVariables.add(rootSourceVar);
    
    if (sourceVar.includes('.')) {
      safeSetVariable(rootSourceVar, {});
      setNestedProperty(variableStructures, sourceVar, '');
    } else {
      safeSetVariable(rootSourceVar, '');
    }
  }
  
  // Match {{ variable.property }} patterns
  const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?:\s*\|[^}]+)?\s*\}\}/g;
  
  while ((match = variablePattern.exec(template)) !== null) {
    const fullPath = match[1];
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
  
  // Match {% for item in variable %} patterns
  const forPattern = /\{\%\s*for\s+\w+\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\%\}/g;
  while ((match = forPattern.exec(template)) !== null) {
    const varName = match[1];
    
    if (isJinjaKeyword(varName)) continue;
    
    referencedVariables.add(varName);
    
    if (!(varName in variableStructures)) {
      variableStructures[varName] = [''];
    } else if (!Array.isArray(variableStructures[varName]) && typeof variableStructures[varName] !== 'object') {
      variableStructures[varName] = [''];
    }
  }
  
  // Match {% for key, value in variable.items() %} patterns
  const dictForPattern = /\{\%\s*for\s+\w+,\s*\w+\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*items\s*\(\s*\)\s*\%\}/g;
  while ((match = dictForPattern.exec(template)) !== null) {
    const varName = match[1];
    
    if (isJinjaKeyword(varName)) continue;
    
    referencedVariables.add(varName);
    
    safeSetVariable(varName, { key1: 'value1', key2: 'value2' }, true);
  }
  
  // Look for loop variables with properties
  const loopWithPropertyPattern = /\{\%\s*for\s+(\w+)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\%\}(.*?)\{\%\s*endfor\s*\%\}/gs;
  while ((match = loopWithPropertyPattern.exec(template)) !== null) {
    const loopVar = match[1];
    const arrayVar = match[2];
    const loopContent = match[3];
    
    if (isJinjaKeyword(arrayVar)) continue;
    
    referencedVariables.add(arrayVar);
    
    const loopVarPattern = new RegExp(`\\{\\{\\s*${loopVar}\\.([a-zA-Z_][a-zA-Z0-9_]*)`, 'g');
    let propMatch;
    const itemStructure = {};
    
    while ((propMatch = loopVarPattern.exec(loopContent)) !== null) {
      itemStructure[propMatch[1]] = '';
    }
    
    if (Object.keys(itemStructure).length > 0) {
      safeSetVariable(arrayVar, [itemStructure, itemStructure], true);
    }
  }
  
  // Only return variables that were actually referenced
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
