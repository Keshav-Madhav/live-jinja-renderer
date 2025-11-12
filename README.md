# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.6.3-blue)
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
- **Import/Export Variables**: Share variables via JSON files or clipboard
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

### Import/Export Variables
**NEW**: Share and backup variable configurations with intuitive import/export.

- **Export to File**: Save variables as formatted JSON files with smart naming
- **Export to Clipboard**: Copy variables as JSON for quick sharing
- **Import from Workspace**: Choose from JSON files in your workspace
- **Import from File Browser**: Load from any JSON file on your system  
- **Import from Active Editor**: Use JSON from currently open file

### Jinja2 Extensions
**v1.6.0**: Full support for Jinja2 extensions with instant activation! 🔌

- **Built-in Extensions**: 6 standard Jinja2 extensions available via settings
  - **i18n**: Internationalization support with `{% trans %}` tags
  - **do**: Execute statements without output using `{% do %}`
  - **loopcontrols**: Use `{% break %}` and `{% continue %}` in loops
  - **with**: Create scoped contexts with `{% with %}`
  - **autoescape**: Automatic HTML escaping control
  - **debug**: Use `{% debug %}` tag for template debugging
- **Custom Extensions**: Add your own extensions via comma-separated paths
- **Instant Activation**: Extensions activate immediately upon selection
- **Visual Indicator**: See active extensions displayed above the output
- **Status Bar Indicator**: Shows count of active extensions (hover for details)
- **Use cases**: Complex templates, multilingual content, advanced control flow

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

All settings are now organized into clear categories for easier configuration:

### Rendering
- `liveJinjaRenderer.rendering.enableMarkdown`: Markdown rendering (default: `false`)
- `liveJinjaRenderer.rendering.enableMermaid`: Mermaid diagrams (default: `false`)
- `liveJinjaRenderer.rendering.showWhitespace`: Show whitespace characters (default: `true`)
- `liveJinjaRenderer.rendering.cullWhitespace`: Remove excessive whitespace (default: `false`)
- `liveJinjaRenderer.rendering.autoRerender`: Automatic re-rendering (default: `true`)
- `liveJinjaRenderer.rendering.rerenderDelay`: Delay before auto-rerender in ms (default: `300`)

### Editor
- `liveJinjaRenderer.editor.autoResizeVariables`: Auto-resize variables section (default: `true`)
- `liveJinjaRenderer.editor.formatVariablesJson`: Auto-format JSON (default: `true`)

### Variables
- `liveJinjaRenderer.variables.autoExtract`: Auto-extract variables (default: `true`)
- `liveJinjaRenderer.variables.preserveCustomValues`: Preserve custom values on re-extract (default: `true`)

### History
- `liveJinjaRenderer.history.enabled`: Enable file history tracking (default: `true`)
- `liveJinjaRenderer.history.size`: Max history items, 3-15 (default: `5`)

### Advanced
- `liveJinjaRenderer.advanced.ghostSave`: Auto-save variables per file (default: `true`)
- `liveJinjaRenderer.advanced.ghostSaveDelay`: Delay before ghost-save in ms (default: `1000`)
- `liveJinjaRenderer.advanced.showLoadingIndicators`: Show loading messages (default: `true`)

### Extensions
- `liveJinjaRenderer.extensions`: Configure Jinja2 extensions via a single settings object with checkboxes:
  - `i18n`: Enable i18n extension for internationalization (default: `false`)
  - `do`: Enable do extension for statements without output (default: `false`)
  - `loopcontrols`: Enable loop controls (break/continue) (default: `false`)
  - `with`: Enable with extension for scoped context (default: `false`)
  - `autoescape`: Enable autoescape extension for HTML escaping (default: `false`)
  - `debug`: Enable debug extension for {% debug %} tag (default: `false`)
  - `custom`: Comma-separated list of custom extension paths (default: `""`)

> **Note**: Old setting names (e.g., `liveJinjaRenderer.enableMarkdown`) still work for backwards compatibility.

## Recent Updates

### 1.6.0 - Jinja2 Extensions Support
- **Built-in Extensions**: 6 standard Jinja2 extensions (i18n, do, loopcontrols, with, autoescape, debug)
- **Single Settings Object**: Expandable checkbox list in settings (like ESLint rules)
- **Quick Access**: "Configure Jinja2 Extensions" option in sidebar three-dot menu
- **Custom Extensions**: Support for custom extension paths
- **Instant Activation**: Extensions activate immediately with auto-rerender
- **Visual Indicator**: Active extensions displayed above output
- **Status Bar Integration**: Shows extension count with detailed tooltip
- **Better Error Messages**: Clear feedback when extensions fail to load
- **All Disabled by Default**: Enable only what you need

### 1.5.4 - Quick Selection Actions
- **Lightbulb Actions**: Select text to see quick action buttons
- **One-Click Rendering**: Instantly render selected text
- Works on `.jinja`, `.j2`, `.txt`, and plaintext files

### 1.5.3 - Variables Import/Export System
- Export variables to JSON file or clipboard
- Import from workspace files, file browser, or active editor
- Full JSON validation with helpful error messages

### 1.5.2 - Enhanced Variable Extraction
- Expanded Jinja keyword list with 40+ new filters and built-ins
- Added support for ternary expressions in templates
- Added support for slice notation (e.g., `{{ items[1:5] }}`)
- Added support for negative array indices (e.g., `{{ items[-1] }}`)
- Added support for method calls (e.g., `{{ dict.keys() }}`)
- Improved handling of multi-line `{% set %}` blocks
- Better variable extraction accuracy for complex templates

### 1.5.1 - Migration & Compatibility Patch
- Fixed settings migration and backwards compatibility for toggle commands
- Improved fallback logic for reading old/new setting names

### 1.5.0 - Enhanced Settings & Customization
- **Reorganized Settings**: Clear categories (Rendering, Editor, Variables, History, Advanced)
- **8 New Settings**: Control render delay, auto-resize, JSON formatting, file history, ghost save delay, and more
- **Better Defaults**: Show Whitespace now ON, Cull Whitespace now OFF by default
- **Smart UI**: File history dropdown hides when disabled, ghost save respects settings
- **Backwards Compatible**: Old setting names still work

### 1.4.6 - Status Bar Indicator
- Status bar shows current settings (hover to see all)
- Click status bar to open extension settings
- Removed toast notifications for less intrusive experience

### 1.4.5 - Code Quality & Type Safety
- **Major Refactor**: Split webview code into separate files (HTML, CSS, JS) for better maintainability
- **Clean Code**: Fixed all TypeScript and ESLint errors without using `@ts-nocheck`
- Added comprehensive type declarations for webview APIs and external libraries
- Improved code organization following separation of concerns best practices
- Zero linting errors with proper type checking enabled
- No functional changes - all features work exactly as before

### 1.4.4 - Bug Fixes
- Fixed selection highlight persistence when closing/reopening sidebar
- Highlights properly clear and re-apply when switching views

### 1.4.3 - File History
- **File History Dropdown**: Quick access to last 5 files/selections via dropdown menu
- Each history entry maintains its own state (file, selection, variables)
- Live-linked to source files for automatic updates
- Click chevron icon next to file name to switch contexts
- Perfect for multi-file workflows and rapid context switching

### 1.4.2 - Selection Range Adjustment
- Dynamic selection range adjustment when adding/removing lines
- Selection automatically expands and shrinks based on edits

### 1.4.1 - Visual Highlighting
- Subtle blue background tint highlights selected rendering range
- Shows in overview ruler for easy navigation

### 1.4.0 - MAJOR UPDATE
- **Selection-based rendering**: Select any portion of text to render just that section
- **Visual highlight**: Subtle blue tint on selected range in editor
- Scoped operations: Variables, auto-refresh, ghost save all work on selection
- File name displays line range when rendering selection
- Smart error navigation adjusts for selection offset

### 1.3.3 - Auto-Rerender Control
- Dynamic file name display above variables
- Auto-rerender toggle control for performance
- Sidebar toggle button for quick access

### 1.3.2 - Ghost Save
- Ghost save: Variables auto-save per file
- Smarter variable extraction with merge

### 1.3.1 - Context Menu Integration
- Editor context menu integration
- Variable preset quick action buttons

### 1.3.0 - Error Navigation
Clickable error messages with line highlighting - jump directly to errors in your template. Enhanced error detection and navigation for faster debugging.

### 1.2.1 - Enhanced JSON Editor
Enhanced JSON editor with smart auto-closing brackets, auto-indentation, tab support, and better editing experience.

### 1.2.0 - Loading Indicators
Loading indicators for async operations, improved variable extraction algorithm (30+ test cases), and cleaner JSON output with 2-space indentation.

### 1.1.4 - Auto-Resizing
Auto-resizing variables section that dynamically adjusts height based on content (100px min, 60% viewport max).

### 1.1.3 - Bug Fixes
Fixed "Update for Current File" button functionality for proper variable extraction and live updates.

### 1.1.2 - Bug Fixes
Fixed "Extract Variables" button in panel view and improved icon visibility in menus.

### 1.1.0 - Variable Presets
Variable Presets feature - save, load, and delete variable configurations for reuse across templates.

### 1.0.2 - Smart Extraction
Smart variable extraction (auto-extract on file load, manual via `Ctrl+Alt+E`). Fixed newline rendering and whitespace preservation bugs.

### 1.0.1 - UI/UX Improvements
UI/UX improvements - moved controls to native VS Code menus, added navigation bar buttons, fixed clipboard functionality.

### 1.0.0 - Initial Release
Initial Marketplace Release - production-ready with full feature set.

### 0.0.1 - Development Release
Initial Development Release - Authentic Python Jinja2 via Pyodide, JSON editor, live preview, Markdown/Mermaid rendering, whitespace control.

---

## Links

- **📦 GitHub Repository**: [live-jinja-renderer](https://github.com/Keshav-Madhav/live-jinja-renderer)
- **🌐 Companion Website**: [Live Jinja Renderer](https://keshav-madhav.github.io/live_jinja/)

## Contributing

Issues and pull requests are welcome! Visit the [GitHub repository](https://github.com/Keshav-Madhav/live-jinja-renderer) to contribute.

## License

This extension is licensed under the [MIT License](LICENSE).
