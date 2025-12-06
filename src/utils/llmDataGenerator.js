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

module.exports = {
  isCopilotAvailable,
  generateWithLLM,
  generateWithLLMStreaming,
  generateDataWithFallback,
  // OpenAI exports
  setOpenAIApiKey,
  isOpenAIConfigured,
  validateOpenAIKey,
  generateWithOpenAIStreaming
};
