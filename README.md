# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A powerful VS Code extension for **real-time Jinja2 template preview** with authentic Python Jinja2 (via Pyodide). Edit templates and variables side-by-side with instant rendering, markdown support, mermaid diagrams, and intelligent whitespace management.

> 🎯 **Perfect for**: Python developers, DevOps engineers, Ansible users, configuration management, and anyone working with Jinja2 templates.

<!-- TODO: Add screenshots here -->
<!-- ![Demo](images/demo.gif) -->

## ✨ Key Features

### 🐍 **Authentic Python Jinja2**
- Uses **real Python Jinja2** engine via Pyodide (not a JavaScript port)
- 100% compatible with Python Jinja2 behavior
- No surprises when moving templates to production

### 🎨 **Flexible UI Options**
- **Sidebar View**: Persistent panel in Activity Bar (like Source Control or Debug)
- **Panel View**: Separate editor pane that opens beside your file
- Switch between views based on your workflow

### ⚡ **Real-time Everything**
- Instant rendering as you type
- Live variable updates with JSON editing
- Auto-sync when switching between files
- Multi-file support with automatic context switching

### 📝 **Rich Content Support**
- **Markdown rendering**: Beautiful formatted output
- **Mermaid diagrams**: Flowcharts, sequence diagrams, gantt charts, and more
- **Whitespace management**: Smart whitespace culling and visualization
- **Syntax highlighting**: Clear, readable variable JSON editing

### 🎯 **Developer Experience**

- Convenient menu for all controls (in sidebar mode)
- Resizable panes with drag handles
- Beautiful UI with VS Code theme integration
- Keyboard shortcuts for quick access

---

## Usage

### Sidebar View (Recommended)

1. Open a `.txt`, `.jinja`, `.j2`, or plaintext file containing Jinja2 template syntax
2. Click the **Jinja Renderer icon** (preview icon) in the Activity Bar (left sidebar)
3. The Live Preview panel will open showing:
   - **Variables section**: Enter your template variables in JSON format
   - **Output section**: See the rendered result in real-time
   - **Control toggles**: Enable/disable markdown, mermaid, whitespace visibility, and whitespace culling
4. The sidebar stays open as you switch between files and updates automatically

**Keyboard shortcut**:
- **Mac**: `Cmd+Shift+J`
- **Windows/Linux**: `Ctrl+Alt+J`

**Command Palette**:
- Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
- Type "Show Jinja Renderer Sidebar"
- Press Enter

### Panel View (Alternative)

If you prefer to open the renderer in a separate editor pane:

1. Open a `.txt`, `.jinja`, `.j2`, or plaintext file
2. Click the **window icon** in the editor toolbar
3. A panel opens beside your editor with the same features

**Keyboard shortcut**:
- **Mac**: `Cmd+Shift+Alt+J`
- **Windows/Linux**: `Ctrl+Alt+Shift+J`

**Command Palette**:
- Type "Open Jinja Renderer in Panel"

## Examples

### Basic Template

Template:
```jinja
Hello {{ name }}!

Your items:
{% for item in items %}
  - {{ item }}
{% endfor %}
```

Variables:
```json
{
  "name": "World",
  "items": ["apple", "banana", "orange"]
}
```

### Markdown Example

Template:
```jinja
# {{ title }}

## Features
{% for feature in features %}
- {{ feature }}
{% endfor %}

## Code Example
```python
print("{{ message }}")
```
```

Variables:
```json
{
  "title": "My Project",
  "features": ["Fast", "Reliable", "Easy to use"],
  "message": "Hello from Jinja!"
}
```

Enable the "Markdown" toggle to see formatted markdown output with proper headers, lists, and code blocks.

### Mermaid Diagram Example

Template:
```jinja
graph TD
    A[{{ start }}] --> B{{{ decision }}}
    B -->|Yes| C[{{ yes_action }}]
    B -->|No| D[{{ no_action }}]
```

Variables:
```json
{
  "start": "Start Process",
  "decision": "Is Valid?",
  "yes_action": "Process Data",
  "no_action": "Show Error"
}
```

Enable the "Mermaid" toggle to see a rendered flowchart diagram.

### Whitespace Management

The "Cull Whitespace" toggle (enabled by default) removes excessive blank lines and consolidates multiple spaces:
- Multiple consecutive blank lines are reduced to at most 2 newlines
- Multiple spaces are reduced to a single space
- Lines containing only whitespace are removed

The "Show Whitespace" toggle visualizes whitespace characters in plain text mode:
- Spaces appear as `·`
- Tabs appear as `→`
- Newlines appear as `↵`

## Requirements

No additional requirements. The extension uses:
- **Pyodide** (v0.25.1) - Python runtime in the browser for authentic Python Jinja2 rendering
- **Python Jinja2** - The real Jinja2 template engine, not a JavaScript port
- **Marked.js** (v11.1.0) - Markdown rendering (loaded from CDN)
- **Mermaid.js** (v10.6.1) - Diagram rendering (loaded from CDN)

**Note**: Internet connection is required to load libraries from CDN. First launch will take a few seconds to load the Python environment.

## Extension Settings

This extension doesn't add any VS Code settings currently. All features are controlled via toggle buttons in the preview panel.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release of Live Jinja Renderer with:
- **Authentic Python Jinja2 rendering via Pyodide** - 100% compatible with Python Jinja2
- JSON variable editor
- Live preview functionality
- Markdown rendering support (using marked.js v11.1.0)
- Mermaid diagram rendering (using mermaid.js v10.6.1)
- Whitespace culling to remove excessive blank lines and spaces
- Whitespace visualization for debugging
- Improved UI with toggle controls
- Loading indicator for Python environment initialization
