# Live Jinja Renderer

A VS Code / Cursor extension for rendering Jinja2 templates in real-time using **authentic Python Jinja2** (via Pyodide). Features live variable updates, markdown support, mermaid diagrams, and advanced whitespace management.

## Features

- **Authentic Python Jinja2**: Uses actual Python Jinja2 via Pyodide - 100% compatible with Python Jinja2, not a JavaScript port
- **Flexible UI Options**: 
  - **Sidebar View** (default): Persistent panel in the Activity Bar, similar to Source Control or Debug
  - **Panel View**: Optional separate editor pane that opens beside your file
  - Switch between views based on your workflow preference
- **Real-time rendering**: See your Jinja2 templates rendered as you type
- **Live variable updates**: Edit variables in JSON format and see instant results
- **Auto-sync**: Changes to the template file automatically trigger re-rendering
- **Multi-file support**: Sidebar automatically updates when switching between files
- **Markdown rendering**: Enable markdown mode to render output as formatted markdown
- **Mermaid diagrams**: Render beautiful flowcharts, sequence diagrams, and more using Mermaid syntax
- **Whitespace management**:
  - **Cull Whitespace**: Automatically removes excessive blank lines and spaces (enabled by default)
  - **Show Whitespace**: Visualize spaces, tabs, and newlines in plain text mode
- **Beautiful UI**: Professional toggle switches, enhanced styling, and VS Code theme integration
- **Resizable panes**: Drag the handle between variables and output sections to adjust sizes
- **Responsive design**: Controls wrap on narrow screens to prevent overflow

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
