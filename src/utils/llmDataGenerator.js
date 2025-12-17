/**
 * LLM Data Generator for Jinja Templates
 * 
 * Uses GitHub Copilot's Language Model API or OpenAI API to intelligently generate
 * realistic test data based on:
 * - Variable names and their semantic meaning
 * - Template context and structure
 * - Filter usage patterns
 */

const vscode = require('vscode');
const https = require('https');

/**
 * Check if Copilot is available
 * @returns {Promise<boolean>}
 */
async function isCopilotAvailable() {
  try {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    return models && models.length > 0;
  } catch (error) {
    console.error('Error checking Copilot availability:', error);
    return false;
  }
}

/**
 * Build the prompts for LLM generation
 * @param {Object} extractedVars - Variables extracted from template
 * @param {string} templateContent - The template content
 * @returns {{systemPrompt: string, userPrompt: string}}
 */
function buildPrompts(extractedVars, templateContent) {
  const systemPrompt = `You are a helpful assistant that generates realistic test data for Jinja2 templates.
Your task is to fill in variable values that would make sense given the variable names and template context.

Guidelines:
- Generate realistic, contextually appropriate values
- For names, use realistic full names
- For emails, use properly formatted email addresses
- For dates, use ISO format (YYYY-MM-DD) or datetime format
- For prices/amounts, use realistic numbers with proper decimals
- For arrays, include 2-3 sample items that match the expected structure
- For objects, include all nested properties with realistic values
- Match the expected data types (string, number, boolean, array, object)
- Consider the template context to understand what values make sense

IMPORTANT: Return ONLY valid JSON, no explanation or markdown formatting.`;

  const userPrompt = `Given this Jinja2 template:
\`\`\`jinja
${templateContent.substring(0, 3000)}${templateContent.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

And these extracted variables with their inferred structure:
\`\`\`json
${JSON.stringify(extractedVars, null, 2)}
\`\`\`

Generate realistic test data for these variables. Return ONLY the JSON object with filled values, nothing else.`;

  return { systemPrompt, userPrompt };
}

/**
 * Clean up LLM response - remove markdown code blocks
 * @param {string} text - Raw response text
 * @returns {string} - Cleaned text
 */
function cleanResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Generate smart data for variables using Copilot LLM (non-streaming)
 * @param {Object} extractedVars - Variables extracted from template (with structure)
 * @param {string} templateContent - The template content for context
 * @returns {Promise<Object>} - Generated data or null if failed
 */
async function generateWithLLM(extractedVars, templateContent) {
  try {
    // Select the Copilot model
    const models = await vscode.lm.selectChatModels({ 
      vendor: 'copilot',
      family: 'gpt-4o'
    });
    
    if (!models || models.length === 0) {
      // Fallback to any available Copilot model
      const fallbackModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!fallbackModels || fallbackModels.length === 0) {
        throw new Error('No Copilot model available. Please ensure GitHub Copilot is installed and activated.');
      }
      models.push(...fallbackModels);
    }
    
    const model = models[0];
    const { systemPrompt, userPrompt } = buildPrompts(extractedVars, templateContent);
    
    // Create chat messages
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
    
    // Send request to Copilot
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    // Collect the response
    let responseText = '';
    for await (const chunk of response.text) {
      responseText += chunk;
    }
    
    // Clean up and parse
    responseText = cleanResponse(responseText);
    const generatedData = JSON.parse(responseText);
    
    return generatedData;
  } catch (error) {
    console.error('LLM generation error:', error);
    throw error;
  }
}

/**
 * Generate smart data with streaming support
 * @param {Object} extractedVars - Variables extracted from template
 * @param {string} templateContent - The template content
 * @param {Function} onChunk - Callback for each chunk: (partialText, isDone) => void
 * @returns {Promise<Object>} - Final parsed data
 */
async function generateWithLLMStreaming(extractedVars, templateContent, onChunk) {
  try {
    // Select the Copilot model
    const models = await vscode.lm.selectChatModels({ 
      vendor: 'copilot',
      family: 'gpt-4o'
    });
    
    if (!models || models.length === 0) {
      const fallbackModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!fallbackModels || fallbackModels.length === 0) {
        throw new Error('No Copilot model available. Please ensure GitHub Copilot is installed and activated.');
      }
      models.push(...fallbackModels);
    }
    
    const model = models[0];
    const { systemPrompt, userPrompt } = buildPrompts(extractedVars, templateContent);
    
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
    
    // Send request to Copilot
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    // Stream the response
    let responseText = '';
    for await (const chunk of response.text) {
      responseText += chunk;
      
      // Clean markdown artifacts as we stream for better display
      let displayText = responseText;
      if (displayText.startsWith('```json\n')) {
        displayText = displayText.slice(8);
      } else if (displayText.startsWith('```json')) {
        displayText = displayText.slice(7);
      } else if (displayText.startsWith('```\n')) {
        displayText = displayText.slice(4);
      } else if (displayText.startsWith('```')) {
        displayText = displayText.slice(3);
      }
      
      // Send chunk to callback
      if (onChunk) {
        onChunk(displayText, false);
      }
    }
    
    // Final cleanup and parse
    responseText = cleanResponse(responseText);
    
    // Notify completion
    if (onChunk) {
      onChunk(responseText, true);
    }
    
    const generatedData = JSON.parse(responseText);
    return generatedData;
  } catch (error) {
    console.error('LLM streaming error:', error);
    throw error;
  }
}

/**
 * Generate data with LLM, with fallback to smart generator
 * @param {Object} extractedVars - Variables extracted from template
 * @param {string} templateContent - The template content
 * @param {Function} fallbackGenerator - Fallback function if LLM fails
 * @param {Object} templateAnalysis - Template analysis for fallback
 * @returns {Promise<{data: Object, source: 'llm' | 'smart'}>}
 */
async function generateDataWithFallback(extractedVars, templateContent, fallbackGenerator, templateAnalysis) {
  try {
    // Check if Copilot is available
    const available = await isCopilotAvailable();
    if (!available) {
      console.log('Copilot not available, using smart generator fallback');
      return {
        data: fallbackGenerator(extractedVars, templateAnalysis),
        source: 'smart'
      };
    }
    
    // Try LLM generation
    const data = await generateWithLLM(extractedVars, templateContent);
    return {
      data,
      source: 'llm'
    };
  } catch (error) {
    console.warn('LLM generation failed, falling back to smart generator:', error.message);
    return {
      data: fallbackGenerator(extractedVars, templateAnalysis),
      source: 'smart'
    };
  }
}

// ============================================================================
// OPENAI API SUPPORT
// ============================================================================

// Cache for API key (managed by extension)
let _openaiApiKey = null;

/**
 * Set the OpenAI API key (called by webviewManager with key from SecretStorage)
 * @param {string | null} apiKey - The API key to set
 */
function setOpenAIApiKey(apiKey) {
  _openaiApiKey = apiKey && apiKey.trim() !== '' ? apiKey.trim() : null;
}

/**
 * Check if OpenAI API key is configured
 * @returns {boolean}
 */
function isOpenAIConfigured() {
  return !!_openaiApiKey;
}

/**
 * Validate an OpenAI API key by making a simple request
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>}
 */
async function validateOpenAIKey(apiKey) {
  if (!apiKey) return false;
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Generate data using OpenAI API with streaming
 * @param {Object} extractedVars - Variables extracted from template
 * @param {string} templateContent - The template content
 * @param {Function} onChunk - Callback for each chunk: (partialText, isDone) => void
 * @returns {Promise<Object>} - Final parsed data
 */
async function generateWithOpenAIStreaming(extractedVars, templateContent, onChunk) {
  if (!_openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const apiKey = _openaiApiKey;
  
  const { systemPrompt, userPrompt } = buildPrompts(extractedVars, templateContent);
  
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    });
    
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            reject(new Error(error.error?.message || `API error: ${res.statusCode}`));
          } catch {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
        return;
      }
      
      let responseText = '';
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                responseText += content;
                
                // Clean markdown artifacts for display
                let displayText = responseText;
                if (displayText.startsWith('```json\n')) {
                  displayText = displayText.slice(8);
                } else if (displayText.startsWith('```json')) {
                  displayText = displayText.slice(7);
                } else if (displayText.startsWith('```\n')) {
                  displayText = displayText.slice(4);
                } else if (displayText.startsWith('```')) {
                  displayText = displayText.slice(3);
                }
                
                if (onChunk) {
                  onChunk(displayText, false);
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      });
      
      res.on('end', () => {
        try {
          // Final cleanup
          responseText = cleanResponse(responseText);
          
          if (onChunk) {
            onChunk(responseText, true);
          }
          
          const generatedData = JSON.parse(responseText);
          resolve(generatedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// ============================================================================
// CLAUDE API SUPPORT
// ============================================================================

// Cache for Claude API key (managed by extension)
let _claudeApiKey = null;

/**
 * Set the Claude API key (called by webviewManager with key from SecretStorage)
 * @param {string | null} apiKey - The API key to set
 */
function setClaudeApiKey(apiKey) {
  _claudeApiKey = apiKey && apiKey.trim() !== '' ? apiKey.trim() : null;
}

/**
 * Check if Claude API key is configured
 * @returns {boolean}
 */
function isClaudeConfigured() {
  return !!_claudeApiKey;
}

/**
 * Validate a Claude API key by making a simple request
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>}
 */
async function validateClaudeKey(apiKey) {
  if (!apiKey) return false;
  
  return new Promise((resolve) => {
    const requestBody = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      // 200 = success, 400 = bad request (but key is valid)
      resolve(res.statusCode === 200 || res.statusCode === 400);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * Generate data using Claude API with streaming
 * @param {Object} extractedVars - Variables extracted from template
 * @param {string} templateContent - The template content
 * @param {Function} onChunk - Callback for each chunk: (partialText, isDone) => void
 * @returns {Promise<Object>} - Final parsed data
 */
async function generateWithClaudeStreaming(extractedVars, templateContent, onChunk) {
  if (!_claudeApiKey) {
    throw new Error('Claude API key not configured');
  }
  
  const apiKey = _claudeApiKey;
  const { systemPrompt, userPrompt } = buildPrompts(extractedVars, templateContent);
  
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      stream: true
    });
    
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            reject(new Error(error.error?.message || `API error: ${res.statusCode}`));
          } catch {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
        return;
      }
      
      let responseText = '';
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]' || data === '') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              // Claude uses content_block_delta for streaming
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                responseText += parsed.delta.text;
                
                // Clean markdown artifacts for display
                let displayText = responseText;
                if (displayText.startsWith('```json\n')) {
                  displayText = displayText.slice(8);
                } else if (displayText.startsWith('```json')) {
                  displayText = displayText.slice(7);
                } else if (displayText.startsWith('```\n')) {
                  displayText = displayText.slice(4);
                } else if (displayText.startsWith('```')) {
                  displayText = displayText.slice(3);
                }
                
                if (onChunk) {
                  onChunk(displayText, false);
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      });
      
      res.on('end', () => {
        try {
          // Final cleanup
          responseText = cleanResponse(responseText);
          
          if (onChunk) {
            onChunk(responseText, true);
          }
          
          const generatedData = JSON.parse(responseText);
          resolve(generatedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// ============================================================================
// GEMINI API SUPPORT
// ============================================================================

// Cache for Gemini API key (managed by extension)
let _geminiApiKey = null;

/**
 * Set the Gemini API key (called by webviewManager with key from SecretStorage)
 * @param {string | null} apiKey - The API key to set
 */
function setGeminiApiKey(apiKey) {
  _geminiApiKey = apiKey && apiKey.trim() !== '' ? apiKey.trim() : null;
}

/**
 * Check if Gemini API key is configured
 * @returns {boolean}
 */
function isGeminiConfigured() {
  return !!_geminiApiKey;
}

/**
 * Validate a Gemini API key by making a simple request
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>}
 */
async function validateGeminiKey(apiKey) {
  if (!apiKey) return false;
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models?key=${apiKey}`,
      method: 'GET',
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Generate data using Gemini API with streaming
 * @param {Object} extractedVars - Variables extracted from template
 * @param {string} templateContent - The template content
 * @param {Function} onChunk - Callback for each chunk: (partialText, isDone) => void
 * @returns {Promise<Object>} - Final parsed data
 */
async function generateWithGeminiStreaming(extractedVars, templateContent, onChunk) {
  if (!_geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const apiKey = _geminiApiKey;
  const { systemPrompt, userPrompt } = buildPrompts(extractedVars, templateContent);
  
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    });
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            reject(new Error(error.error?.message || `API error: ${res.statusCode}`));
          } catch {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
        return;
      }
      
      let responseText = '';
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]' || data === '') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              
              if (content) {
                responseText += content;
                
                // Clean markdown artifacts for display
                let displayText = responseText;
                if (displayText.startsWith('```json\n')) {
                  displayText = displayText.slice(8);
                } else if (displayText.startsWith('```json')) {
                  displayText = displayText.slice(7);
                } else if (displayText.startsWith('```\n')) {
                  displayText = displayText.slice(4);
                } else if (displayText.startsWith('```')) {
                  displayText = displayText.slice(3);
                }
                
                if (onChunk) {
                  onChunk(displayText, false);
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      });
      
      res.on('end', () => {
        try {
          // Final cleanup
          responseText = cleanResponse(responseText);
          
          if (onChunk) {
            onChunk(responseText, true);
          }
          
          const generatedData = JSON.parse(responseText);
          resolve(generatedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// ============================================================================
// AI DEBUG ERROR ANALYSIS
// ============================================================================

/**
 * Add line numbers to template content for better AI analysis
 * @param {string} template - The template content
 * @returns {string} Template with line numbers
 */
function addLineNumbers(template) {
  const lines = template.split('\n');
  return lines.map((line, i) => `${String(i + 1).padStart(3, ' ')}| ${line}`).join('\n');
}

/**
 * Build the prompts for AI error debugging
 * @param {string} errorMessage - The error message from Jinja2
 * @param {string} templateContent - The template content
 * @param {Object} variables - The current variables
 * @returns {{systemPrompt: string, userPrompt: string}}
 */
function buildDebugPrompts(errorMessage, templateContent, variables) {
  const systemPrompt = `You are an expert Jinja2 template debugger. Your task is to analyze template errors and provide clear, actionable fix recommendations.

CRITICAL: The template is shown with line numbers in the format "  N| code". Use these EXACT line numbers in your response. Count carefully - every line including blank lines has a number.

Guidelines:
- Identify the root cause of the error
- Consider both the template syntax AND the variable data
- Templates should ideally work with empty/null variables (null-safe handling)
- Provide EXACT line numbers from the numbered template
- Explain WHY the error occurred
- Suggest defensive coding practices (like using 'default' filter, 'is defined' checks)

Response Format (MUST be valid JSON):
{
  "errorType": "Brief error category (e.g., 'UndefinedVariable', 'SyntaxError', 'TypeError')",
  "errorLocation": {
    "line": <EXACT line number from the numbered template>,
    "description": "Brief description of where the error is"
  },
  "rootCause": "Clear explanation of why this error occurred",
  "fixes": [
    {
      "type": "template" | "variables" | "both",
      "priority": "high" | "medium" | "low",
      "title": "Short title for the fix",
      "description": "Detailed explanation of the fix",
      "templateChange": {
        "before": "Original code snippet (if applicable)",
        "after": "Fixed code snippet (if applicable)",
        "line": <EXACT line number from the numbered template>
      },
      "variableChange": {
        "before": "Original variable structure (if applicable)",
        "after": "Fixed variable structure (if applicable)"
      }
    }
  ],
  "nullSafetyTips": [
    "Suggestions for making the template more robust against missing/null variables"
  ]
}

IMPORTANT: 
1. Return ONLY valid JSON, no explanation or markdown formatting.
2. Use the EXACT line numbers shown in the template (e.g., if error is on line "11| {{ buton(...) }}", the line number is 11).`;

  // Add line numbers to template for accurate line reference
  const numberedTemplate = addLineNumbers(templateContent);

  const userPrompt = `I have a Jinja2 template error that I need help debugging.

## Error Message:
\`\`\`
${errorMessage}
\`\`\`

## Template Content (with line numbers):
\`\`\`
${numberedTemplate.substring(0, 5000)}${numberedTemplate.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

## Current Variables:
\`\`\`json
${JSON.stringify(variables, null, 2).substring(0, 2000)}
\`\`\`

Please analyze this error and provide fix recommendations. 
IMPORTANT: Use the EXACT line numbers shown above (the numbers before the | character).

Consider:
1. Does the template handle missing/null variables gracefully?
2. Is there a syntax error in the template?
3. Are the variable types correct for how they're being used?
4. Would the template work with empty variables (null-safety)?

Return ONLY the JSON response.`;

  return { systemPrompt, userPrompt };
}

/**
 * Debug template error using Copilot
 * @param {string} errorMessage - The error message
 * @param {string} templateContent - The template content
 * @param {Object} variables - Current variables
 * @param {Function} onChunk - Streaming callback
 * @returns {Promise<Object>} - Debug analysis result
 */
async function debugWithCopilotStreaming(errorMessage, templateContent, variables, onChunk) {
  try {
    const models = await vscode.lm.selectChatModels({ 
      vendor: 'copilot',
      family: 'gpt-4o'
    });
    
    if (!models || models.length === 0) {
      const fallbackModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!fallbackModels || fallbackModels.length === 0) {
        throw new Error('No Copilot model available. Please ensure GitHub Copilot is installed and activated.');
      }
      models.push(...fallbackModels);
    }
    
    const model = models[0];
    const { systemPrompt, userPrompt } = buildDebugPrompts(errorMessage, templateContent, variables);
    
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
    
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    let responseText = '';
    for await (const chunk of response.text) {
      responseText += chunk;
      if (onChunk) {
        onChunk(responseText, false);
      }
    }
    
    responseText = cleanResponse(responseText);
    
    if (onChunk) {
      onChunk(responseText, true);
    }
    
    const debugResult = JSON.parse(responseText);
    return debugResult;
  } catch (error) {
    console.error('Copilot debug error:', error);
    throw error;
  }
}

/**
 * Debug template error using OpenAI
 * @param {string} errorMessage - The error message
 * @param {string} templateContent - The template content
 * @param {Object} variables - Current variables
 * @param {Function} onChunk - Streaming callback
 * @returns {Promise<Object>} - Debug analysis result
 */
async function debugWithOpenAIStreaming(errorMessage, templateContent, variables, onChunk) {
  if (!_openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const { systemPrompt, userPrompt } = buildDebugPrompts(errorMessage, templateContent, variables);
  
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 3000
    });
    
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_openaiApiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            reject(new Error(error.error?.message || `API error: ${res.statusCode}`));
          } catch {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
        return;
      }
      
      let responseText = '';
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                responseText += content;
                if (onChunk) {
                  onChunk(cleanResponse(responseText), false);
                }
              }
            } catch (e) { /* Skip invalid lines */ }
          }
        }
      });
      
      res.on('end', () => {
        try {
          responseText = cleanResponse(responseText);
          if (onChunk) onChunk(responseText, true);
          const debugResult = JSON.parse(responseText);
          resolve(debugResult);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

/**
 * Debug template error using Claude
 * @param {string} errorMessage - The error message
 * @param {string} templateContent - The template content
 * @param {Object} variables - Current variables
 * @param {Function} onChunk - Streaming callback
 * @returns {Promise<Object>} - Debug analysis result
 */
async function debugWithClaudeStreaming(errorMessage, templateContent, variables, onChunk) {
  if (!_claudeApiKey) {
    throw new Error('Claude API key not configured');
  }
  
  const { systemPrompt, userPrompt } = buildDebugPrompts(errorMessage, templateContent, variables);
  
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true
    });
    
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': _claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            reject(new Error(error.error?.message || `API error: ${res.statusCode}`));
          } catch {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
        return;
      }
      
      let responseText = '';
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]' || data === '') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                responseText += parsed.delta.text;
                if (onChunk) {
                  onChunk(cleanResponse(responseText), false);
                }
              }
            } catch (e) { /* Skip invalid lines */ }
          }
        }
      });
      
      res.on('end', () => {
        try {
          responseText = cleanResponse(responseText);
          if (onChunk) onChunk(responseText, true);
          const debugResult = JSON.parse(responseText);
          resolve(debugResult);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

/**
 * Debug template error using Gemini
 * @param {string} errorMessage - The error message
 * @param {string} templateContent - The template content
 * @param {Object} variables - Current variables
 * @param {Function} onChunk - Streaming callback
 * @returns {Promise<Object>} - Debug analysis result
 */
async function debugWithGeminiStreaming(errorMessage, templateContent, variables, onChunk) {
  if (!_geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const { systemPrompt, userPrompt } = buildDebugPrompts(errorMessage, templateContent, variables);
  
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000
      }
    });
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${_geminiApiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            reject(new Error(error.error?.message || `API error: ${res.statusCode}`));
          } catch {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
        return;
      }
      
      let responseText = '';
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]' || data === '') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                responseText += content;
                if (onChunk) {
                  onChunk(cleanResponse(responseText), false);
                }
              }
            } catch (e) { /* Skip invalid lines */ }
          }
        }
      });
      
      res.on('end', () => {
        try {
          responseText = cleanResponse(responseText);
          if (onChunk) onChunk(responseText, true);
          const debugResult = JSON.parse(responseText);
          resolve(debugResult);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

module.exports = {
  isCopilotAvailable,
  generateWithLLM,
  generateWithLLMStreaming,
  generateDataWithFallback,
  // OpenAI exports
  setOpenAIApiKey,
  isOpenAIConfigured,
  validateOpenAIKey,
  generateWithOpenAIStreaming,
  // Claude exports
  setClaudeApiKey,
  isClaudeConfigured,
  validateClaudeKey,
  generateWithClaudeStreaming,
  // Gemini exports
  setGeminiApiKey,
  isGeminiConfigured,
  validateGeminiKey,
  generateWithGeminiStreaming,
  // AI Debug exports
  debugWithCopilotStreaming,
  debugWithOpenAIStreaming,
  debugWithClaudeStreaming,
  debugWithGeminiStreaming
};
