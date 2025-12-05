/**
 * Smart Data Generator for Jinja Templates
 * 
 * Generates realistic test data based on:
 * - Variable names and naming conventions
 * - Filter usage patterns (| currency → number, | date → date)
 * - Template structure (for loops → arrays, dot notation → objects)
 * - Common patterns in web/DevOps templates
 */

// ============================================================================
// DATA POOLS - Realistic sample data for different categories
// ============================================================================

const DATA_POOLS = {
  // People names
  firstNames: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James', 'Mia', 'Alexander', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Sebastian'],
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'],
  
  // Companies
  companies: ['Acme Corp', 'TechFlow Inc', 'CloudNine Systems', 'DataPulse', 'NexGen Solutions', 'Quantum Labs', 'CyberSphere', 'InnovateTech', 'GlobalSync', 'FutureStack'],
  
  // Products
  products: ['Wireless Headphones', 'Smart Watch', 'Laptop Stand', 'USB-C Hub', 'Mechanical Keyboard', 'Monitor Light Bar', 'Webcam HD', 'Bluetooth Speaker', 'Portable Charger', 'Ergonomic Mouse'],
  
  // Cities
  cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Denver', 'Austin', 'Portland', 'Boston', 'Miami', 'Atlanta', 'San Diego', 'Dallas'],
  
  // Countries
  countries: ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'Mexico'],
  
  // Streets
  streets: ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Park Ave', 'Lake Dr', 'Hill Rd', 'River Rd'],
  
  // Colors
  colors: ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'indigo', 'pink', 'cyan', 'amber'],
  
  // Status values
  statuses: ['active', 'pending', 'completed', 'cancelled', 'processing', 'approved', 'rejected', 'draft'],
  
  // Roles
  roles: ['admin', 'user', 'moderator', 'editor', 'viewer', 'guest', 'manager', 'developer'],
  
  // Categories
  categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Health', 'Beauty', 'Food', 'Automotive'],
  
  // Tags
  tags: ['featured', 'new', 'sale', 'popular', 'trending', 'limited', 'exclusive', 'bestseller', 'eco-friendly', 'premium'],
  
  // Tech terms (for DevOps/config templates)
  services: ['nginx', 'redis', 'postgres', 'mongodb', 'elasticsearch', 'rabbitmq', 'kafka', 'prometheus', 'grafana', 'vault'],
  environments: ['development', 'staging', 'production', 'testing', 'qa'],
  regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'eu-central-1'],
  
  // Lorem ipsum words for descriptions
  loremWords: ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'labore', 'dolore', 'magna', 'aliqua'],
};

// ============================================================================
// PATTERN MATCHERS - Rules for detecting variable types from names
// ============================================================================

const PATTERNS = {
  // Person/User related
  name: /^(name|full_?name|display_?name|user_?name|username|author|owner|creator|sender|recipient)$/i,
  firstName: /^(first_?name|given_?name|fname)$/i,
  lastName: /^(last_?name|family_?name|surname|lname)$/i,
  email: /^(email|e_?mail|mail|email_?address)$/i,
  phone: /^(phone|telephone|tel|mobile|cell|phone_?number)$/i,
  avatar: /^(avatar|profile_?image|profile_?pic|photo|picture|image_?url|avatar_?url)$/i,
  
  // Authentication
  password: /^(password|passwd|pwd|secret|pass)$/i,
  token: /^(token|api_?key|access_?token|auth_?token|jwt|bearer|secret_?key)$/i,
  
  // Location
  address: /^(address|street|street_?address|addr)$/i,
  city: /^(city|town|locality)$/i,
  state: /^(state|province|region)$/i,
  country: /^(country|nation|country_?code)$/i,
  zip: /^(zip|zip_?code|postal|postal_?code|postcode)$/i,
  
  // Dates & Times
  date: /^(date|day|created|updated|modified|published|posted|due|start|end|birth|expir|timestamp).*$/i,
  time: /^(time|hour|minute|second|duration|elapsed).*$/i,
  
  // Numbers
  id: /^(id|_id|ID|uuid|guid|key|pk)$/i,
  count: /^(count|total|num|number|quantity|qty|amount|size|length).*$/i,
  price: /^(price|cost|amount|total|subtotal|fee|rate|salary|budget|balance|revenue)$/i,
  percentage: /^(percent|percentage|pct|ratio|rate|progress).*$/i,
  age: /^(age|years?)$/i,
  
  // Boolean
  boolean: /^(is_?|has_?|can_?|should_?|will_?|did_?|was_?|enable|disable|active|visible|hidden|show|hide|flag|checked|selected|valid|verified|confirm|agree|opt)/i,
  
  // Status & State
  status: /^(status|state|condition|phase|stage)$/i,
  role: /^(role|permission|access|level|type|kind|tier)$/i,
  priority: /^(priority|importance|urgency|severity|level)$/i,
  
  // Content
  title: /^(title|headline|heading|subject|name|label)$/i,
  description: /^(description|desc|summary|abstract|overview|details|content|text|body|message|note|comment|bio|about)$/i,
  url: /^(url|link|href|uri|website|site|homepage|redirect|callback|endpoint)$/i,
  slug: /^(slug|handle|permalink|alias)$/i,
  
  // Media
  image: /^(image|img|photo|picture|thumbnail|thumb|banner|cover|logo|icon).*$/i,
  video: /^(video|movie|clip|media).*$/i,
  file: /^(file|document|attachment|upload).*$/i,
  
  // Collections (arrays)
  array: /^(items?|list|array|collection|data|results?|records?|entries|elements?|rows?|users?|products?|orders?|posts?|comments?|tags?|categories|options?|choices?|values?|children|nodes?)$/i,
  
  // Objects
  object: /^(config|settings?|options?|params?|parameters?|props?|properties|attributes?|metadata|meta|info|details?|data|context|payload|body|request|response|headers?|query|filter)$/i,
  
  // DevOps/Config
  host: /^(host|hostname|server|domain|fqdn)$/i,
  port: /^(port|ports?)$/i,
  path: /^(path|dir|directory|folder|root|base|prefix|suffix)$/i,
  env: /^(env|environment|stage|tier|namespace)$/i,
  version: /^(version|ver|v|release|build)$/i,
  replicas: /^(replicas?|instances?|count|scale|workers?)$/i,
  memory: /^(memory|mem|ram)$/i,
  cpu: /^(cpu|cores?|processors?)$/i,
  
  // Company/Organization
  company: /^(company|organization|org|business|enterprise|firm|brand)$/i,
  department: /^(department|dept|team|group|unit|division)$/i,
  
  // Product/Commerce
  product: /^(product|item|sku|article|goods?)$/i,
  category: /^(category|cat|type|class|group|genre)$/i,
  color: /^(color|colour|hue|shade)$/i,
  size: /^(size|dimension|scale|magnitude)$/i,
  
  // Misc
  code: /^(code|key|ref|reference|identifier)$/i,
  language: /^(language|lang|locale|i18n)$/i,
  currency: /^(currency|curr|money_?type)$/i,
};

// ============================================================================
// GENERATORS - Functions that create specific types of data
// ============================================================================

const GENERATORS = {
  // Pick random from array
  random: (arr) => arr[Math.floor(Math.random() * arr.length)],
  
  // Random integer in range
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  
  // Random float in range
  randomFloat: (min, max, decimals = 2) => {
    const num = Math.random() * (max - min) + min;
    return parseFloat(num.toFixed(decimals));
  },
  
  // Generate a full name
  fullName: () => `${GENERATORS.random(DATA_POOLS.firstNames)} ${GENERATORS.random(DATA_POOLS.lastNames)}`,
  
  // Generate email
  email: (name) => {
    const base = name ? name.toLowerCase().replace(/\s+/g, '.') : 
      `${GENERATORS.random(DATA_POOLS.firstNames).toLowerCase()}.${GENERATORS.random(DATA_POOLS.lastNames).toLowerCase()}`;
    const domains = ['gmail.com', 'outlook.com', 'example.com', 'company.io', 'mail.com'];
    return `${base}@${GENERATORS.random(domains)}`;
  },
  
  // Generate phone
  phone: () => {
    const area = GENERATORS.randomInt(200, 999);
    const mid = GENERATORS.randomInt(200, 999);
    const end = GENERATORS.randomInt(1000, 9999);
    return `+1 (${area}) ${mid}-${end}`;
  },
  
  // Generate address
  address: () => `${GENERATORS.randomInt(100, 9999)} ${GENERATORS.random(DATA_POOLS.streets)}`,
  
  // Generate date (ISO format)
  date: (future = false) => {
    const now = Date.now();
    const offset = GENERATORS.randomInt(1, 365) * 24 * 60 * 60 * 1000;
    const timestamp = future ? now + offset : now - offset;
    return new Date(timestamp).toISOString().split('T')[0];
  },
  
  // Generate datetime
  datetime: (future = false) => {
    const now = Date.now();
    const offset = GENERATORS.randomInt(1, 365) * 24 * 60 * 60 * 1000;
    const timestamp = future ? now + offset : now - offset;
    return new Date(timestamp).toISOString();
  },
  
  // Generate UUID-like string
  uuid: () => {
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4';
      } else {
        uuid += hex[Math.floor(Math.random() * 16)];
      }
    }
    return uuid;
  },
  
  // Generate a token-like string
  token: (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },
  
  // Generate URL
  url: (path = '') => {
    const domains = ['example.com', 'mysite.io', 'app.dev', 'api.service.com'];
    return `https://${GENERATORS.random(domains)}${path || '/' + GENERATORS.random(['api', 'v1', 'users', 'products', 'data'])}`;
  },
  
  // Generate image URL
  imageUrl: (width = 400, height = 300) => {
    const services = [
      `https://picsum.photos/${width}/${height}`,
      `https://placehold.co/${width}x${height}`,
      `https://via.placeholder.com/${width}x${height}`,
    ];
    return GENERATORS.random(services);
  },
  
  // Generate slug
  slug: (text) => {
    if (text) return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${GENERATORS.random(['awesome', 'great', 'new', 'best', 'top'])}-${GENERATORS.random(['product', 'post', 'item', 'article'])}-${GENERATORS.randomInt(1, 999)}`;
  },
  
  // Generate Lorem Ipsum text
  lorem: (words = 10) => {
    const result = [];
    for (let i = 0; i < words; i++) {
      result.push(GENERATORS.random(DATA_POOLS.loremWords));
    }
    // Capitalize first letter
    result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
    return result.join(' ') + '.';
  },
  
  // Generate paragraph
  paragraph: (sentences = 3) => {
    return Array.from({ length: sentences }, () => GENERATORS.lorem(GENERATORS.randomInt(8, 15))).join(' ');
  },
  
  // Generate IP address
  ip: () => `${GENERATORS.randomInt(1, 255)}.${GENERATORS.randomInt(0, 255)}.${GENERATORS.randomInt(0, 255)}.${GENERATORS.randomInt(1, 255)}`,
  
  // Generate port
  port: () => GENERATORS.random([80, 443, 3000, 5000, 8000, 8080, 8443, 9000, 27017, 5432, 6379]),
  
  // Generate version
  version: () => `${GENERATORS.randomInt(1, 5)}.${GENERATORS.randomInt(0, 20)}.${GENERATORS.randomInt(0, 99)}`,
  
  // Generate color hex
  colorHex: () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
};

// ============================================================================
// MAIN GENERATOR LOGIC
// ============================================================================

/**
 * Infer the type of a variable from its name
 * @param {string} name - Variable name
 * @param {Object} context - Additional context (filters used, template patterns)
 * @returns {string} - Inferred type
 */
function inferType(name, context = {}) {
  const lowerName = name.toLowerCase();
  
  // Check filters first (most reliable signal)
  // context.filters is an object: { varName: ['filter1', 'filter2'] }
  const varFilters = context.filters && context.filters[name];
  if (varFilters && Array.isArray(varFilters)) {
    if (varFilters.includes('currency') || varFilters.includes('float') || varFilters.includes('round')) {
      return 'price';
    }
    if (varFilters.includes('date') || varFilters.includes('strftime')) {
      return 'date';
    }
    if (varFilters.includes('int') || varFilters.includes('abs')) {
      return 'integer';
    }
    if (varFilters.includes('length')) {
      return 'array';
    }
    if (varFilters.includes('items') || varFilters.includes('keys') || varFilters.includes('values')) {
      return 'object';
    }
  }
  
  // Check if used in for loop (array)
  if (context.iterables && context.iterables.has && context.iterables.has(name)) {
    return 'array';
  }
  
  // Check patterns
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(name)) {
      return type;
    }
  }
  
  // Check for common suffixes/prefixes
  if (lowerName.endsWith('_id') || lowerName.endsWith('id')) return 'id';
  if (lowerName.endsWith('_at') || lowerName.endsWith('_date')) return 'date';
  if (lowerName.endsWith('_count') || lowerName.endsWith('_num')) return 'count';
  if (lowerName.endsWith('_url') || lowerName.endsWith('_link')) return 'url';
  if (lowerName.endsWith('_path')) return 'path';
  if (lowerName.endsWith('_list') || lowerName.endsWith('s')) return 'array';
  
  // Default to string
  return 'string';
}

/**
 * Generate a value based on the inferred type
 * @param {string} type - The inferred type
 * @param {string} name - Original variable name (for context)
 * @returns {*} - Generated value
 */
function generateValue(type, name = '') {
  switch (type) {
    // Person/User
    case 'name':
      return GENERATORS.fullName();
    case 'firstName':
      return GENERATORS.random(DATA_POOLS.firstNames);
    case 'lastName':
      return GENERATORS.random(DATA_POOLS.lastNames);
    case 'email':
      return GENERATORS.email();
    case 'phone':
      return GENERATORS.phone();
    case 'avatar':
      return GENERATORS.imageUrl(150, 150);
    
    // Auth
    case 'password':
      return '••••••••';
    case 'token':
      return GENERATORS.token(32);
    
    // Location
    case 'address':
      return GENERATORS.address();
    case 'city':
      return GENERATORS.random(DATA_POOLS.cities);
    case 'state':
      return GENERATORS.random(['California', 'Texas', 'New York', 'Florida', 'Washington', 'Colorado', 'Oregon', 'Nevada']);
    case 'country':
      return GENERATORS.random(DATA_POOLS.countries);
    case 'zip':
      return GENERATORS.randomInt(10000, 99999).toString();
    
    // Dates
    case 'date':
      return GENERATORS.date(name.includes('expir') || name.includes('due') || name.includes('end'));
    case 'time':
      return GENERATORS.datetime();
    
    // Numbers
    case 'id':
      return name.toLowerCase().includes('uuid') ? GENERATORS.uuid() : GENERATORS.randomInt(1, 10000);
    case 'count':
    case 'integer':
      return GENERATORS.randomInt(0, 100);
    case 'price':
      return GENERATORS.randomFloat(9.99, 999.99, 2);
    case 'percentage':
      return GENERATORS.randomInt(0, 100);
    case 'age':
      return GENERATORS.randomInt(18, 80);
    
    // Boolean
    case 'boolean':
      return Math.random() > 0.5;
    
    // Status
    case 'status':
      return GENERATORS.random(DATA_POOLS.statuses);
    case 'role':
      return GENERATORS.random(DATA_POOLS.roles);
    case 'priority':
      return GENERATORS.random(['low', 'medium', 'high', 'critical']);
    
    // Content
    case 'title':
      return GENERATORS.lorem(GENERATORS.randomInt(3, 7)).replace('.', '');
    case 'description':
      return GENERATORS.paragraph(2);
    case 'url':
      return GENERATORS.url();
    case 'slug':
      return GENERATORS.slug();
    
    // Media
    case 'image':
    case 'video':
    case 'file':
      return GENERATORS.imageUrl();
    
    // DevOps
    case 'host':
      return GENERATORS.random(['localhost', 'api.example.com', '192.168.1.100', 'db.internal']);
    case 'port':
      return GENERATORS.port();
    case 'path':
      return '/var/' + GENERATORS.random(['data', 'log', 'app', 'config', 'www']);
    case 'env':
      return GENERATORS.random(DATA_POOLS.environments);
    case 'version':
      return GENERATORS.version();
    case 'replicas':
      return GENERATORS.randomInt(1, 5);
    case 'memory':
      return GENERATORS.random(['256Mi', '512Mi', '1Gi', '2Gi', '4Gi']);
    case 'cpu':
      return GENERATORS.random(['100m', '250m', '500m', '1', '2']);
    
    // Company
    case 'company':
      return GENERATORS.random(DATA_POOLS.companies);
    case 'department':
      return GENERATORS.random(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']);
    
    // Product
    case 'product':
      return GENERATORS.random(DATA_POOLS.products);
    case 'category':
      return GENERATORS.random(DATA_POOLS.categories);
    case 'color':
      return GENERATORS.random(DATA_POOLS.colors);
    case 'size':
      return GENERATORS.random(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    
    // Misc
    case 'code':
      return GENERATORS.token(8).toUpperCase();
    case 'language':
      return GENERATORS.random(['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'it']);
    case 'currency':
      return GENERATORS.random(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']);
    
    // Collections
    case 'array':
      return [];  // Will be populated separately with item structure
    
    case 'object':
      return {};  // Will be populated with nested properties
    
    // Default
    case 'string':
    default:
      // Try to generate something contextual based on name
      if (name.length > 0) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
      }
      return GENERATORS.lorem(3).replace('.', '');
  }
}

/**
 * Generate smart data for a variable structure
 * @param {Object} extractedVars - Variables extracted from template (with structure)
 * @param {Object} templateAnalysis - Analysis of template patterns
 * @returns {Object} - Generated data
 */
function generateSmartData(extractedVars, templateAnalysis = {}) {
  const result = {};
  
  for (const [varName, varValue] of Object.entries(extractedVars)) {
    result[varName] = generateForVariable(varName, varValue, templateAnalysis);
  }
  
  return result;
}

/**
 * Generate data for a single variable (handles nesting)
 * @param {string} name - Variable name
 * @param {*} structure - Current structure/value
 * @param {Object} analysis - Template analysis
 * @param {string} path - Full path to the variable (for nested lookups)
 * @returns {*} - Generated value
 */
function generateForVariable(name, structure, analysis = {}, path = '') {
  // Build the full path for comparison lookup
  const fullPath = path ? `${path}.${name}` : name;
  
  // Check if there's a comparison value for this variable (use first match)
  if (analysis.comparisons) {
    // Try full path first, then just the name
    const compValue = analysis.comparisons[fullPath] || analysis.comparisons[name];
    if (compValue && compValue.length > 0) {
      // Use the first comparison value found
      return compValue[0];
    }
  }
  
  // If it's an array with objects, generate array items
  if (Array.isArray(structure)) {
    if (structure.length > 0 && typeof structure[0] === 'object' && structure[0] !== null) {
      // Generate a single item based on the structure
      return [generateForVariable(name.replace(/s$/, ''), structure[0], analysis, fullPath)];
    }
    // Empty array - infer item type from name and generate meaningful items
    const singularName = name.replace(/s$/, '').replace(/_list$/, '').replace(/List$/, '');
    
    // Check if it's likely an array of objects based on common patterns
    const objectArrayPatterns = /^(user|item|product|order|post|comment|article|person|customer|employee|member|record|entry|row|result|data|object)s?$/i;
    if (objectArrayPatterns.test(name)) {
      // Generate single object based on the singular item name
      return [generateSmartObject(singularName)];
    }
    
    // Otherwise generate single primitive
    const itemType = inferType(singularName, analysis);
    // Prevent recursive array generation
    if (itemType === 'array') {
      return [GENERATORS.lorem(2).replace('.', '')];
    }
    return [generateValue(itemType, singularName)];
  }
  
  // If it's an object, recurse into properties
  if (typeof structure === 'object' && structure !== null) {
    const result = {};
    for (const [propName, propValue] of Object.entries(structure)) {
      result[propName] = generateForVariable(propName, propValue, analysis, fullPath);
    }
    return result;
  }
  
  // Primitive value - generate based on name
  const type = inferType(name, analysis);
  return generateValue(type, name);
}

/**
 * Generate a smart object based on common entity names
 * @param {string} entityName - Name of the entity (e.g., 'user', 'product')
 * @returns {Object} - Generated object with appropriate fields
 */
function generateSmartObject(entityName) {
  const lowerName = entityName.toLowerCase();
  
  // User/Person entity
  if (/^(user|person|customer|employee|member|author|owner|admin)$/i.test(lowerName)) {
    return {
      id: GENERATORS.randomInt(1, 1000),
      name: GENERATORS.fullName(),
      email: GENERATORS.email(),
      avatar: GENERATORS.imageUrl(150, 150)
    };
  }
  
  // Product/Item entity
  if (/^(product|item|good|sku|article)$/i.test(lowerName)) {
    return {
      id: GENERATORS.randomInt(1, 1000),
      name: GENERATORS.random(DATA_POOLS.products),
      price: GENERATORS.randomFloat(9.99, 299.99, 2),
      category: GENERATORS.random(DATA_POOLS.categories)
    };
  }
  
  // Order entity
  if (/^(order|purchase|transaction)$/i.test(lowerName)) {
    return {
      id: GENERATORS.randomInt(10000, 99999),
      date: GENERATORS.date(),
      total: GENERATORS.randomFloat(19.99, 999.99, 2),
      status: GENERATORS.random(DATA_POOLS.statuses)
    };
  }
  
  // Post/Article/Comment entity
  if (/^(post|article|blog|entry|comment)$/i.test(lowerName)) {
    return {
      id: GENERATORS.randomInt(1, 1000),
      title: GENERATORS.lorem(GENERATORS.randomInt(4, 8)).replace('.', ''),
      content: GENERATORS.paragraph(2),
      date: GENERATORS.date()
    };
  }
  
  // Generic record/entry
  return {
    id: GENERATORS.randomInt(1, 1000),
    name: GENERATORS.lorem(2).replace('.', ''),
    value: GENERATORS.random(['active', 'pending', 'completed', GENERATORS.randomInt(1, 100).toString()])
  };
}

/**
 * Analyze a template to extract context for generation
 * @param {string} template - Template content
 * @returns {Object} - Analysis results
 */
function analyzeTemplate(template) {
  const analysis = {
    iterables: new Set(),
    filters: {},
    conditionals: new Set(),
    comparisons: {}, // NEW: Track comparison values { varName: ['value1', 'value2'] }
  };
  
  // Find for loops to identify iterables
  const forPattern = /\{%[-+]?\s*for\s+\w+(?:\s*,\s*\w+)?\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  let match;
  while ((match = forPattern.exec(template)) !== null) {
    analysis.iterables.add(match[1].split('.')[0]);
  }
  
  // Find filters used on variables
  const filterPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\|\s*([a-zA-Z_]+)/g;
  while ((match = filterPattern.exec(template)) !== null) {
    const varName = match[1].split('.')[0];
    const filter = match[2];
    if (!analysis.filters[varName]) {
      analysis.filters[varName] = [];
    }
    analysis.filters[varName].push(filter);
  }
  
  // Find conditionals
  const ifPattern = /\{%[-+]?\s*if\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  while ((match = ifPattern.exec(template)) !== null) {
    analysis.conditionals.add(match[1]);
  }
  
  // NEW: Find comparison values (variable == "value", variable != "value", etc.)
  // Pattern: variable == "value" or variable == 'value'
  const comparisonPatterns = [
    // variable == "value" or variable == 'value'
    /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[=!]=\s*["']([^"']+)["']/g,
    // "value" == variable or 'value' == variable
    /["']([^"']+)["']\s*[=!]=\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    // variable in ["value1", "value2"] - extract first value
    /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+in\s*\[\s*["']([^"']+)["']/g,
    // variable == number
    /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[=!]=\s*(\d+(?:\.\d+)?)/g,
  ];
  
  // Process standard comparisons: var == "value"
  const stdCompPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[=!]=\s*["']([^"']+)["']/g;
  while ((match = stdCompPattern.exec(template)) !== null) {
    const varPath = match[1];
    const value = match[2];
    if (!analysis.comparisons[varPath]) {
      analysis.comparisons[varPath] = [];
    }
    if (!analysis.comparisons[varPath].includes(value)) {
      analysis.comparisons[varPath].push(value);
    }
  }
  
  // Process reversed comparisons: "value" == var
  const revCompPattern = /["']([^"']+)["']\s*[=!]=\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  while ((match = revCompPattern.exec(template)) !== null) {
    const value = match[1];
    const varPath = match[2];
    if (!analysis.comparisons[varPath]) {
      analysis.comparisons[varPath] = [];
    }
    if (!analysis.comparisons[varPath].includes(value)) {
      analysis.comparisons[varPath].push(value);
    }
  }
  
  // Process "in" checks: var in ["value1", ...]
  const inPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+in\s*\[\s*["']([^"']+)["']/g;
  while ((match = inPattern.exec(template)) !== null) {
    const varPath = match[1];
    const value = match[2];
    if (!analysis.comparisons[varPath]) {
      analysis.comparisons[varPath] = [];
    }
    if (!analysis.comparisons[varPath].includes(value)) {
      analysis.comparisons[varPath].push(value);
    }
  }
  
  // Process numeric comparisons: var == 123
  const numCompPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[=!<>]=?\s*(\d+(?:\.\d+)?)\b/g;
  while ((match = numCompPattern.exec(template)) !== null) {
    const varPath = match[1];
    const value = match[2];
    // Store as number
    const numValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
    if (!analysis.comparisons[varPath]) {
      analysis.comparisons[varPath] = [];
    }
    if (!analysis.comparisons[varPath].includes(numValue)) {
      analysis.comparisons[varPath].push(numValue);
    }
  }
  
  return analysis;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateSmartData,
  generateForVariable,
  generateSmartObject,
  generateValue,
  inferType,
  analyzeTemplate,
  GENERATORS,
  DATA_POOLS,
  PATTERNS,
};

