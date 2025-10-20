# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.1.0-blue)
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

- **Native VS Code UI**: Controls integrated into title bar and menus
- **Quick Access Buttons**: Markdown, Mermaid, and Update icons in navigation bar
- **Organized Menu**: All settings and actions in the three-dot menu
- **Save/Load Variable Presets**: Save complex JSON configurations and load them instantly
- Resizable panes with drag handles
- Beautiful UI with VS Code theme integration
- Keyboard shortcuts for quick access

---

## Usage

### Sidebar View (Recommended)

1. Open a `.txt`, `.jinja`, `.j2`, or plaintext file containing Jinja2 template syntax
2. Click the **Jinja Renderer icon** in the Activity Bar (left sidebar)
3. The Live Preview panel will open showing:
   - **Variables section**: Enter your template variables in JSON format
   - **Output section**: See the rendered result in real-time
4. Use the **navigation bar buttons** for quick access:
   - **Markdown** (📝): Toggle markdown rendering
   - **Mermaid** (diagram icon): Toggle mermaid diagram rendering
   - **Update** (🔄): Manually refresh to update for current file
5. Access more options via the **three-dot menu** (⋯):
   - **Rendering**: Toggle Markdown, Toggle Mermaid
   - **Whitespace**: Toggle Show Whitespace, Toggle Cull Whitespace
   - **Actions**: Re-extract Variables, Copy Output
   - **Variables**: Save Variables Preset, Load Variables Preset, Delete Variables Preset
   - **View**: Open in Editor Pane
6. The sidebar stays open as you switch between files and updates automatically

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
2. Click the **play icon** in the editor toolbar (or use the three-dot menu → "Open in Editor Pane")
3. A panel opens beside your editor with:
   - **Toggle switches**: Markdown, Mermaid, Show Whitespace, Cull Whitespace (visible in header)
   - **Action buttons**: Re-extract Variables, Rerender, Copy Output (visible in footer)
   - Same live preview functionality as sidebar view

**Keyboard shortcut**:
- **Mac**: `Cmd+Shift+Alt+J`
- **Windows/Linux**: `Ctrl+Alt+Shift+J`

**Command Palette**:
- Type "Open Jinja Renderer in Panel"

### Variable Extraction

The extension intelligently extracts variables from your Jinja2 templates:

**Automatic Extraction**:
- When you **first open a file**, variables are automatically detected and extracted
- When you **switch to a different file**, variables are extracted for that file

**Manual Extraction** (preserves your custom values during editing):
- **Keyboard shortcut**: 
  - **Mac**: `Cmd+Shift+E`
  - **Windows/Linux**: `Ctrl+Alt+E`
- **Three-dot menu**: Select "Extract Variables from Template"
- **Footer button** (panel mode): Click "🔄 Extract Variables"
- **Command Palette**: Type "Jinja: Extract Variables from Template"

**How it works**:
- Detects `{{ variable }}` patterns in your template
- Identifies `{% for item in items %}` loops (creates arrays)
- Recognizes object properties like `{{ user.name }}`
- Creates appropriate JSON structures (objects, arrays, nested properties)
- Preserves your custom values when you manually re-extract

### Save & Load Variable Presets

**NEW in v1.1.0**: Save and reuse complex variable configurations!

**Saving a Preset**:
1. Configure your variables in the JSON editor
2. Click the **three-dot menu** (⋯) → **Save Variables Preset**
3. Enter a name (default: `{filename} Variables`, e.g., "template Variables")
4. Press Enter to save

**Loading a Preset**:
1. Click the **three-dot menu** (⋯) → **Load Variables Preset**
2. Select from your saved presets in the Quick Pick menu
3. Variables are loaded instantly into the editor

**Deleting a Preset**:
1. Click the **three-dot menu** (⋯) → **Delete Variables Preset**
2. Select the preset to delete
3. Confirm the deletion

**Use Cases**:
- **Complex API Responses**: Save sample API response structures for testing
- **Multiple Scenarios**: Store different test data configurations
- **Common Templates**: Reuse variable sets across projects
- **Quick Switching**: Easily switch between different data sets

**Storage**: Presets are saved globally in VS Code and persist across all workspaces and sessions.

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

This extension contributes the following VS Code settings:

- `liveJinjaRenderer.enableMarkdown`: Enable markdown rendering for the output (default: `false`)
- `liveJinjaRenderer.enableMermaid`: Enable mermaid diagram rendering (default: `false`)
- `liveJinjaRenderer.showWhitespace`: Show whitespace characters (spaces, tabs, newlines) in the output (default: `false`)
- `liveJinjaRenderer.cullWhitespace`: Automatically remove excessive blank lines and whitespace from output (default: `true`)

**Note**: These settings can be toggled via the navigation bar buttons or three-dot menu. Changes are reflected in real-time across all views.

## Known Issues

None at this time.

## Release Notes

### 1.1.0

**New Feature - Variable Presets** 🎉:
- **Save Variables Preset**: Save your current variable configuration with a custom name
- **Load Variables Preset**: Instantly load previously saved presets from a Quick Pick menu
- **Delete Variables Preset**: Remove unwanted presets
- **Smart Default Names**: Auto-generates preset names based on current filename (e.g., "template Variables")
- **Global Storage**: Presets persist across all workspaces and VS Code sessions
- **Perfect for**: Complex JSON configurations, API responses, testing scenarios, reusable data sets

**New Commands**:
- `Jinja: Save Variables Preset` - Available in three-dot menu and Command Palette
- `Jinja: Load Variables Preset` - Available in three-dot menu and Command Palette
- `Jinja: Delete Variables Preset` - Available in three-dot menu and Command Palette

### 1.0.2

**Smart Variable Extraction**:
- Variables now automatically extracted only on first file load and when switching files
- Template edits preserve your custom variable values (no auto-extraction)
- Added keyboard shortcut `Ctrl+Alt+E` (Windows/Linux) or `Cmd+Shift+E` (Mac) for manual extraction
- Extract Variables command available in three-dot menu, footer, and command palette

**Bug Fixes**:
- Fixed newline rendering bug where output showed double newlines when "Cull Whitespace" was disabled
- Corrected Python template string escaping for accurate whitespace preservation

### 1.0.1

**UI/UX Improvements**:
- Moved controls from custom in-pane UI to native VS Code menus and navigation bar
- Added quick-access buttons (Markdown, Mermaid, Update) in navigation bar
- Organized three-dot menu with logical grouping
- Fixed clipboard functionality for reliable copy operations
- Added "Update for Current File" button for manual refresh

### 1.0.0

**Initial Marketplace Release**:
- Extension published to VS Code Marketplace
- Production-ready with full feature set

### 0.0.1

**Initial Development Release**:
- **Authentic Python Jinja2 rendering via Pyodide** - 100% compatible with Python Jinja2
- JSON variable editor
- Live preview functionality
- Markdown rendering support (using marked.js v11.1.0)
- Mermaid diagram rendering (using mermaid.js v10.6.1)
- Whitespace culling to remove excessive blank lines and spaces
- Whitespace visualization for debugging
- Improved UI with toggle controls
- Loading indicator for Python environment initialization

---

## Links

- **📦 GitHub Repository**: [live-jinja-renderer](https://github.com/Keshav-Madhav/live-jinja-renderer)
- **🌐 Companion Website**: [Live Jinja Renderer](https://keshav-madhav.github.io/live_jinja/)

## Contributing

Issues and pull requests are welcome! Visit the [GitHub repository](https://github.com/Keshav-Madhav/live-jinja-renderer) to contribute.

## License

This extension is licensed under the [MIT License](LICENSE).
