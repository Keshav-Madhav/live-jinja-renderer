/**
 * Template Dependency Graph Builder
 * Builds a graph of template dependencies (includes, extends, imports)
 */

const { extractReferencedTemplates } = require('./templateLoader');

/**
 * Build a dependency graph for templates
 * @param {string} rootTemplate - The root template content
 * @param {Object} templates - Dictionary of all loaded templates
 * @param {string} rootTemplateName - Name of the root template
 * @returns {Object} Graph structure with nodes and edges
 */
function buildDependencyGraph(rootTemplate, templates, rootTemplateName = 'main') {
  const nodes = new Map();
  const edges = [];
  const visited = new Set();
  
  /**
   * Extract dependency type from template content
   */
  function extractDependencies(templateContent) {
    const deps = {
      includes: [],
      extends: [],
      imports: [],
      from: []
    };
    
    // Match {% include "template.html" %}
    const includePattern = /\{%[-+]?\s*include\s+['"]([^'"]+)['"]/gi;
    let match;
    while ((match = includePattern.exec(templateContent)) !== null) {
      deps.includes.push(match[1]);
    }
    
    // Match {% extends "base.html" %}
    const extendsPattern = /\{%[-+]?\s*extends\s+['"]([^'"]+)['"]/gi;
    while ((match = extendsPattern.exec(templateContent)) !== null) {
      deps.extends.push(match[1]);
    }
    
    // Match {% import "macros.html" as ... %}
    const importPattern = /\{%[-+]?\s*import\s+['"]([^'"]+)['"]/gi;
    while ((match = importPattern.exec(templateContent)) !== null) {
      deps.imports.push(match[1]);
    }
    
    // Match {% from "macros.html" import ... %}
    const fromPattern = /\{%[-+]?\s*from\s+['"]([^'"]+)['"]/gi;
    while ((match = fromPattern.exec(templateContent)) !== null) {
      deps.from.push(match[1]);
    }
    
    return deps;
  }
  
  /**
   * Recursively process template and its dependencies
   */
  function processTemplate(templateName, templateContent, depth = 0) {
    if (visited.has(templateName) || depth > 10) {
      return; // Prevent circular dependencies and infinite loops
    }
    
    visited.add(templateName);
    
    // Add node for this template
    nodes.set(templateName, {
      id: templateName,
      label: templateName,
      depth: depth,
      exists: templateContent !== null
    });
    
    if (!templateContent) {
      return; // Template not found, mark as missing
    }
    
    // Extract dependencies
    const deps = extractDependencies(templateContent);
    
    // Process each dependency type
    const allDeps = [
      ...deps.extends.map(t => ({ name: t, type: 'extends' })),
      ...deps.includes.map(t => ({ name: t, type: 'includes' })),
      ...deps.imports.map(t => ({ name: t, type: 'imports' })),
      ...deps.from.map(t => ({ name: t, type: 'from' }))
    ];
    
    for (const dep of allDeps) {
      // Add edge
      edges.push({
        from: templateName,
        to: dep.name,
        type: dep.type
      });
      
      // Recursively process dependency
      const depContent = templates[dep.name] || null;
      processTemplate(dep.name, depContent, depth + 1);
    }
  }
  
  // Start processing from root
  processTemplate(rootTemplateName, rootTemplate, 0);
  
  return {
    nodes: Array.from(nodes.values()),
    edges: edges,
    hasCircularDeps: detectCircularDependencies(edges)
  };
}

/**
 * Detect circular dependencies in the graph
 * @param {Array} edges - Array of edges
 * @returns {boolean} True if circular dependencies exist
 */
function detectCircularDependencies(edges) {
  const graph = new Map();
  
  // Build adjacency list
  for (const edge of edges) {
    if (!graph.has(edge.from)) {
      graph.set(edge.from, []);
    }
    graph.get(edge.from).push(edge.to);
  }
  
  // DFS to detect cycles
  const visited = new Set();
  const recStack = new Set();
  
  function hasCycle(node) {
    if (recStack.has(node)) return true;
    if (visited.has(node)) return false;
    
    visited.add(node);
    recStack.add(node);
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true;
    }
    
    recStack.delete(node);
    return false;
  }
  
  for (const node of graph.keys()) {
    if (hasCycle(node)) return true;
  }
  
  return false;
}

/**
 * Generate a simple text representation of the dependency graph
 * @param {Object} graph - The dependency graph
 * @returns {string} Text representation
 */
function graphToText(graph) {
  let text = 'Template Dependency Graph:\n\n';
  
  if (graph.nodes.length === 0) {
    return 'No templates found.';
  }
  
  if (graph.hasCircularDeps) {
    text += '⚠️  WARNING: Circular dependencies detected!\n\n';
  }
  
  // Group by depth
  const byDepth = new Map();
  for (const node of graph.nodes) {
    if (!byDepth.has(node.depth)) {
      byDepth.set(node.depth, []);
    }
    byDepth.get(node.depth).push(node);
  }
  
  // Sort depths
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
  
  for (const depth of depths) {
    const indent = '  '.repeat(depth);
    const nodes = byDepth.get(depth);
    
    for (const node of nodes) {
      const status = node.exists ? '✓' : '✗';
      text += `${indent}${status} ${node.label}\n`;
      
      // Show outgoing edges
      const outgoingEdges = graph.edges.filter(e => e.from === node.id);
      for (const edge of outgoingEdges) {
        text += `${indent}  └─ ${edge.type} → ${edge.to}\n`;
      }
    }
  }
  
  return text;
}

module.exports = {
  buildDependencyGraph,
  detectCircularDependencies,
  graphToText
};
