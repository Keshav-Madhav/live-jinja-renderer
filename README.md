# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.3.2-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A powerful VS Code extension for **real-time Jinja2 template preview** with authentic Python Jinja2 (via Pyodide). Edit templates and variables side-by-side with instant rendering, markdown support, mermaid diagrams, intelligent whitespace management, and **smart error navigation**.

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
- **Auto-Resizing Variable Section**: Variables window automatically expands/shrinks to fit content
- **Smart Error Navigation**: Click on error messages to jump directly to the error line in your template
- **Visual Error Highlighting**: Errors are highlighted with red background and border
- Resizable panes with drag handles for manual adjustment
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

**Context Menu**:
- Right-click in the editor
- Select "Jinja: Open in Sidebar"

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

**Context Menu**:
- Right-click in the editor
- Select "Jinja: Open in Editor Pane"

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
- **Context Menu**: Right-click in editor → "Jinja: Extract Variables from Template"

**How it works**:
- Detects `{{ variable }}` patterns in your template
- Identifies `{% for item in items %}` loops (creates arrays)
- Recognizes object properties like `{{ user.name }}`
- Creates appropriate JSON structures (objects, arrays, nested properties)
- Preserves your custom values when you manually re-extract

### Ghost Save (Automatic Per-File Variables)

**NEW in v1.3.2**: Variables automatically save and restore per file! 👻

Your variables are now saved automatically in the background (1 second after editing) and restored when you reopen the file. Each file remembers its own variables across sessions. When you re-extract variables, your custom values are preserved and new variables are added.

**Ghost Save vs. Named Presets**:
- **Ghost Save**: Automatic, per-file, invisible
- **Named Presets**: Manual, reusable across files, global

### Save & Load Variable Presets

**NEW in v1.1.0**: Save and reuse complex variable configurations!

**Quick Access** (v1.3.1):
- **Icon Buttons**: Click the Save or Load icons in the Variables header
- **Native Context Menu**: Right-click anywhere in the Sidebar or Panel webview for quick access to:
  - Rendering options (Toggle Markdown/Mermaid)
  - Whitespace options (Show/Cull Whitespace)
  - Jinja actions (Re-extract Variables)
  - Output actions (Copy Output - Panel only)
  - Variable presets (Save/Load)

**Saving a Preset**:
1. Configure your variables in the JSON editor
2. Click the **Save icon** in Variables header, or **three-dot menu** (⋯) → **Save Variables Preset**, or **right-click** in Variables → **Save Variables Preset**
3. Enter a name (default: `{filename} Variables`, e.g., "template Variables")
4. Press Enter to save

**Loading a Preset**:
1. Click the **Load icon** in Variables header, or **three-dot menu** (⋯) → **Load Variables Preset**, or **right-click** in Variables → **Load Variables Preset**
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

### 1.3.2

**Ghost Save Feature** 👻:
- Variables automatically save per file in the background (1 second after editing)
- Auto-restore when reopening files - each file remembers its own variables across sessions

**Smarter Variable Extraction** 🧠:
- Re-extraction now merges with existing variables instead of replacing them
- Your custom values are preserved, new variables are added seamlessly

### 1.3.1

**Context Menu Integration** 🖱️:
- Right-click in editor to access Jinja Renderer commands (Open in Sidebar, Open in Editor Pane, Extract Variables)

**Variables Quick Actions** ⚡:
- Save and Load variable preset icon buttons in the Variables header (using VS Code codicons)
- Icon buttons feature hover highlighting in VS Code style

**Native Context Menu** 📋:
- Right-click anywhere in Sidebar or Panel webviews for VS Code's native context menu
- Quick access to: Rendering options (Markdown/Mermaid), Whitespace options, Re-extract Variables, Copy Output (Panel), Save/Load Variable Presets
- No clipping issues, native look and feel with full keyboard navigation

### 1.3.0
Clickable error messages with line highlighting - jump directly to errors in your template. Enhanced error detection and navigation for faster debugging.

### 1.2.1
Enhanced JSON editor with smart auto-closing brackets, auto-indentation, tab support, and better editing experience.

### 1.2.0
Loading indicators for async operations, improved variable extraction algorithm (30+ test cases), and cleaner JSON output with 2-space indentation.

### 1.1.4
Auto-resizing variables section that dynamically adjusts height based on content (100px min, 60% viewport max).

### 1.1.3
Fixed "Update for Current File" button functionality for proper variable extraction and live updates.

### 1.1.2
Fixed "Extract Variables" button in panel view and improved icon visibility in menus.

### 1.1.0
Variable Presets feature - save, load, and delete variable configurations for reuse across templates.

### 1.0.2
Smart variable extraction (auto-extract on file load, manual via `Ctrl+Alt+E`). Fixed newline rendering and whitespace preservation bugs.

### 1.0.1
UI/UX improvements - moved controls to native VS Code menus, added navigation bar buttons, fixed clipboard functionality.

### 1.0.0
Initial Marketplace Release - production-ready with full feature set.

### 0.0.1
Initial Development Release - Authentic Python Jinja2 via Pyodide, JSON editor, live preview, Markdown/Mermaid rendering, whitespace control.

---

## Links

- **📦 GitHub Repository**: [live-jinja-renderer](https://github.com/Keshav-Madhav/live-jinja-renderer)
- **🌐 Companion Website**: [Live Jinja Renderer](https://keshav-madhav.github.io/live_jinja/)

## Contributing

Issues and pull requests are welcome! Visit the [GitHub repository](https://github.com/Keshav-Madhav/live-jinja-renderer) to contribute.

## License

This extension is licensed under the [MIT License](LICENSE).
