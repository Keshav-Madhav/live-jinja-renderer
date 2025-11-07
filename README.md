# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.4.3-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A powerful VS Code extension for **real-time Jinja2 template preview** with authentic Python Jinja2 (via Pyodide). Edit templates and variables side-by-side with instant rendering, markdown support, mermaid diagrams, intelligent whitespace management, and **smart error navigation**.

> 🎯 **Perfect for**: Python developers, DevOps engineers, Ansible users, configuration management, and anyone working with Jinja2 templates.

## ✨ Key Features

### 🐍 **Authentic Python Jinja2**
- Uses **real Python Jinja2** engine via Pyodide (not a JavaScript port)
- 100% compatible with Python Jinja2 behavior

### 🎨 **Flexible UI Options**
- **Sidebar View**: Persistent panel in Activity Bar (like Source Control or Debug)
- **Panel View**: Separate editor pane that opens beside your file
- **Selection Rendering**: Select any portion of text to render just that section
- **File History Dropdown**: Quick access to recently opened files/selections
- Switch between views based on your workflow

### ⚡ **Real-time Everything**
- Instant rendering as you type (or manual control with auto-rerender toggle)
- Live variable updates with JSON editing
- Auto-sync when switching between files
- Multi-file support with automatic context switching
- File history tracks last 5 contexts for easy switching

### 📝 **Rich Content Support**
- **Markdown rendering**: Beautiful formatted output
- **Mermaid diagrams**: Flowcharts, sequence diagrams, gantt charts
- **Whitespace management**: Smart culling and visualization

### 🎯 **Developer Experience**
- **Smart Error Navigation**: Click errors to jump to the line in your template
- **Visual Error Highlighting**: Red highlights on error lines
- **Save/Load Variable Presets**: Reuse complex JSON configurations
- **Ghost Save**: Variables auto-save per file and restore across sessions
- **Auto-Resizing**: Variables section adapts to content
- **File History**: Dropdown menu for quick context switching
- Keyboard shortcuts for quick access

---

## Quick Start

### Sidebar View (Recommended)

1. Open a `.txt`, `.jinja`, `.j2`, or plaintext file with Jinja2 syntax
2. Press `Ctrl+Alt+J` (Windows/Linux) or `Cmd+Shift+J` (Mac)
3. Edit variables in JSON format
4. See rendered output in real-time
5. Use the **auto-rerender toggle button** (▶️⏸️) to control automatic updates
6. Click the **chevron icon** (🔽) to access recently opened files/selections

**Quick Actions**:
- **Navigation bar**: Markdown, Mermaid, Update icons
- **Three-dot menu** (⋯): All settings and actions
- **Auto-rerender button**: Toggle automatic rendering on/off
- **File history dropdown**: Switch between recent files/selections

### Panel View

Press `Ctrl+Alt+Shift+J` (Windows/Linux) or `Cmd+Shift+Alt+J` (Mac) for side-by-side editor view.

## Features in Detail

### File History Dropdown
**NEW in v1.5.0**: Switch between multiple files and selections effortlessly! 📂

- **Quick access**: Click the chevron icon next to the file name in sidebar
- **Last 5 contexts**: Tracks your most recent files and selections
- **Live-linked**: Each entry stays connected to its source file for automatic updates
- **Unique states**: Each context maintains its own variables and selection range
- **Active indicator**: Checkmark shows which context is currently active
- **Use cases**: Multi-file projects, comparing template sections, rapid context switching

### Selection-Based Rendering
**v1.4.0**: Render only the portion of your file that matters! 🎯

- **Select text** in your Jinja/text file (any lines)
- **Open renderer** via sidebar, panel, or context menu
- **Visual highlight**: Selected range gets a subtle blue tint in your editor
- **File name shows selection**: `filename.txt (Lines 5-12)`
- **Scoped operations**: Variables, auto-refresh, ghost save all work on selected lines only
- **Persistent**: Each file remembers its rendering scope
- **History support**: Different selections of the same file appear as separate history entries
- **Use cases**: Large templates, focusing on sections, testing specific blocks

### Auto-Rerender Control
**v1.3.3**: Toggle automatic rendering for better performance with large templates.

- **Enabled (default)**: Template re-renders on every file/variable change
- **Disabled**: Manual render only - prevents automatic updates
- **Toggle button**: Click the play/pause icon in the sidebar file name bar
- **Setting**: `liveJinjaRenderer.autoRerender` in VS Code settings

### File Name Display
**v1.3.3**: See which file you're rendering at a glance.

- Displayed prominently above the Variables section
- Automatically updates when switching files
- Shows selection range if rendering partial document
- History dropdown for quick context switching
- Handles special characters correctly

### Variable Extraction

**Automatic**: When opening or switching files
**Manual**: `Ctrl+Alt+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)

Intelligently detects:
- `{{ variable }}` patterns
- `{% for item in items %}` loops
- Object properties like `{{ user.name }}`
- Preserves custom values on re-extraction

### Ghost Save
**Auto in v1.3.2**: Variables save automatically per file (1 second after editing) and restore when you reopen files.

### Variable Presets
**v1.1.0**: Save, load, and reuse variable configurations.

- **Save**: Click save icon or three-dot menu
- **Load**: Click load icon or three-dot menu
- **Use cases**: API responses, test scenarios, common templates

## Examples

### Basic Template
```jinja
Hello {{ name }}!
{% for item in items %}
  - {{ item }}
{% endfor %}
```

### Markdown Output
Enable "Markdown" toggle for formatted output with headers, lists, and code blocks.

### Mermaid Diagrams
Enable "Mermaid" toggle for flowcharts and sequence diagrams.

## Extension Settings

- `liveJinjaRenderer.enableMarkdown`: Markdown rendering (default: `false`)
- `liveJinjaRenderer.enableMermaid`: Mermaid diagrams (default: `false`)
- `liveJinjaRenderer.showWhitespace`: Show whitespace characters (default: `false`)
- `liveJinjaRenderer.cullWhitespace`: Remove excessive whitespace (default: `true`)
- `liveJinjaRenderer.autoRerender`: Automatic re-rendering (default: `true`)

## Recent Updates

### 1.5.0 - MAJOR UPDATE
- **File History Dropdown**: Quick access to last 5 files/selections via dropdown menu
- Each history entry maintains its own state (file, selection, variables)
- Live-linked to source files for automatic updates
- Click chevron icon next to file name to switch contexts
- Perfect for multi-file workflows and rapid context switching

### 1.4.0 - MAJOR UPDATE
- **Selection-based rendering**: Select any portion of text to render just that section
- **Visual highlight**: Subtle blue tint on selected range in editor
- Scoped operations: Variables, auto-refresh, ghost save all work on selection
- File name displays line range when rendering selection
- Smart error navigation adjusts for selection offset

### 1.3.3
- Dynamic file name display above variables
- Auto-rerender toggle control for performance
- Sidebar toggle button for quick access

### 1.3.2
- Ghost save: Variables auto-save per file
- Smarter variable extraction with merge

### 1.3.1
- Editor context menu integration
- Variable preset quick action buttons

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
