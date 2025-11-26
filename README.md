# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.8.2-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A powerful VS Code extension for **real-time Jinja2 template preview** with authentic Python Jinja2 (via Pyodide). Edit templates and variables side-by-side with instant rendering, markdown support, mermaid diagrams, intelligent whitespace management, smart error navigation, and **full IntelliSense with autocomplete**.

> 🎯 **Perfect for**: Python developers, DevOps engineers, Ansible users, configuration management, and anyone working with Jinja2 templates.

---

## 🚀 What's New in v1.8.2

### 🐛 Bug Fixes
- **Detached Window Selection**: Fixed detached output window not respecting selection range
  - When detaching a selection-based render, the detached window now correctly shows only the selected portion

### 🎨 Improvements
- **Mermaid Zoom Sensitivity**: Reduced default zoom sensitivity from 10% to 5% per scroll
  - New setting: `liveJinjaRenderer.rendering.mermaidZoomSensitivity` (0.01-0.2, default: 0.05)

### 🖥️ Previous: Detached Output Window (v1.8.0)
- **Separate Output View**: Click the detach button to open output in an isolated editor pane
  - Clean, distraction-free output window without UI elements
  - Perfect for dual-monitor setups or side-by-side viewing
  - Live updates from both template and variable changes
  - Automatic synchronization with 300ms responsiveness
- **Smart UI Adaptation**: Main window automatically hides output section when detached
  - Variables section expands to full height for easier editing
  - Output section restores when detached window is closed
- **Intelligent Lifecycle**: Detached windows automatically close when main renderer closes

> 💡 **Previous updates**: Snippet Fix (v1.8.1), Detached Output Window (v1.8.0), UI Space Optimization (v1.7.8), Interactive Line Navigation (v1.7.7)

---

## ✨ Key Features

### 🎨 **Syntax Highlighting** ⭐ NEW!
- **Editor Highlighting**: Real-time Jinja2 syntax highlighting in your text editor
  - Highlights delimiters, keywords, variables, strings, numbers, filters, and comments
  - Python-inspired color scheme using VS Code theme colors
  - Works automatically with `.jinja`, `.j2`, and `.txt` files
- **Template Preview**: Syntax-highlighted template display in sidebar/panel
  - Consistent colors with editor highlighting
  - Easy-to-read formatting for complex templates

### 💡 **Full IntelliSense System**
- **Variable Autocomplete**: Intelligent suggestions for all extracted variables
  - Triggers inside `{{ }}` and `{% %}` blocks
  - Shows type information and value previews
  - Updates in real-time as you work
- **Dot Notation IntelliSense**: Navigate nested objects effortlessly
  - Type `.` after any variable to see properties (e.g., `user.` → `name`, `email`, `age`)
  - Works with deeply nested structures (`user.address.city`)
  - Smart array element detection
- **Hover Documentation**: Rich information on hover
  - Variable types (String, Array, Object, Number, Boolean)
  - Current values with smart formatting
  - Available properties and usage examples
- **Filter Library**: 20+ Jinja2 filters with full documentation
  - Type `|` after a variable to see filter suggestions
  - Complete signatures and usage examples
  - Includes: `default`, `length`, `upper`, `lower`, `join`, `replace`, `round`, `sort`, `map`, `select`, `tojson`, and more
- **Keyword Completion**: Autocomplete for Jinja2 control structures
  - `for`, `if`, `elif`, `else`, `set`, `block`, `extends`, `include`, `macro`, `with`
  - Context-aware suggestions with descriptions
- **Smart Context Detection**: Only activates in Jinja template syntax
  - Works with `.jinja`, `.jinja2`, `.j2`, `.txt`, and plaintext files
  - No interference with normal text editing

### 🐍 **Authentic Python Jinja2**
- Uses **real Python Jinja2** engine via Pyodide (not a JavaScript port)
- 100% compatible with Python Jinja2 behavior
- All standard Jinja2 features supported

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
- IntelliSense updates automatically with variable changes

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
- **Performance Metrics**: Render time display with color indicators
- **Extension Detection**: Smart suggestions for required Jinja2 extensions
- Keyboard shortcuts for quick access

---

## Quick Start

### Sidebar View (Recommended)

1. Open a `.txt`, `.jinja`, `.j2`, or plaintext file with Jinja2 syntax
2. Press `Ctrl+Alt+J` (Windows/Linux) or `Cmd+Shift+J` (Mac)
3. Edit variables in JSON format
4. See rendered output in real-time
5. **Start typing** `{{` in your template and enjoy **IntelliSense autocomplete**! 🎉
6. Use the **auto-rerender toggle button** (▶️⏸️) to control automatic updates
7. Click the **chevron icon** (🔽) to access recently opened files/selections

**Quick Actions**:
- **Navigation bar**: Markdown, Mermaid, Update icons
- **Three-dot menu** (⋯): All settings and actions
- **Auto-rerender button**: Toggle automatic rendering on/off
- **File history dropdown**: Switch between recent files/selections

### Panel View

Press `Ctrl+Alt+Shift+J` (Windows/Linux) or `Cmd+Shift+Alt+J` (Mac) for side-by-side editor view.

---

## Features in Detail

### 💡 IntelliSense & Autocomplete
**NEW in v1.7.0**: Complete IDE features for Jinja2 templates! 🚀

#### Variable Autocomplete
Press `Ctrl+Space` inside `{{ }}` or `{% %}` blocks to see all available variables:
```jinja
{{ user  <-- Shows: user, items, config (with types and previews)
{{ user.  <-- Shows: name, email, age, address (nested properties)
{{ user.address.  <-- Shows: city, country, zip (deeply nested)
```

#### Filter Suggestions
Type `|` after any variable to see 20+ Jinja2 filters:
```jinja
{{ items|  <-- Shows: length, first, last, join, sort, reverse, unique, etc.
{{ name|upper  <-- Hover to see: Converts string to uppercase
```

**Supported Filters**:
- String: `upper`, `lower`, `capitalize`, `title`, `trim`, `replace`, `truncate`
- List: `first`, `last`, `join`, `length`, `sort`, `reverse`, `unique`
- Numeric: `round`, `abs`, `sum`, `min`, `max`
- Logic: `default`, `select`, `reject`, `map`, `groupby`
- Output: `tojson`, `safe`, `escape`, `striptags`

#### Hover Documentation
Hover over any variable to see:
- **Type**: String, Array, Object, Number, Boolean, null
- **Value**: Current value (truncated if large)
- **Properties**: Available properties for objects
- **Usage**: Examples for arrays (for loops)

```jinja
Hover over 'user':
  Type: Object
  Properties: name, email, age, address
  
Hover over 'items':
  Type: Array (3 items)
  Usage: {% for item in items %}
```

#### Keyword Completion
Type `{%` and press `Ctrl+Space` for control structure suggestions:
- `for` - Loop through iterables
- `if`, `elif`, `else` - Conditional logic
- `set` - Variable assignment
- `block`, `extends`, `include` - Template inheritance
- `macro` - Reusable template functions
- `with` - Context management

#### Try It Now!
Open the included `test-intellisense.jinja` file to see all IntelliSense features in action!

📚 **Complete Guide**: See `INTELLISENSE.md` for detailed documentation and examples.

---

### File History Dropdown
**v1.5.0**: Switch between multiple files and selections effortlessly! 📂

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
- `liveJinjaRenderer.advanced.showPerformanceMetrics`: Show performance metrics (default: `true`)
- `liveJinjaRenderer.advanced.suggestExtensions`: Suggest Jinja2 extensions (default: `true`)

### Highlighting
- `liveJinjaRenderer.highlighting.enableForTextFiles`: Enable syntax highlighting for .txt files (default: `true`)

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

### 1.7.8 - UI Space Optimization 🎨
- **Compact Layout**: Reduced spacing throughout the interface (~25-40% whitespace reduction)
- **Cleaner Design**: Removed unnecessary border lines between headers and content
- **Smart Backgrounds**: Sidebar uses proper darker VS Code background color
- **Panel Optimization**: File name display hidden in panel mode for extra space

### 1.7.7 - Interactive Line Navigation 🖱️
- **Clickable Line Numbers**: Click any line in output to navigate to your template
- **Gutter Click**: Clicking line number gutter selects the entire line in editor
- **Content Click**: Clicking line content moves cursor to that line
- **Smart Line Mapping**: Line numbers now correctly reflect actual file line numbers even when rendering selections

### 1.7.6 - Accurate Line Number Gutter ✨
- **Source-Mapped Line Numbers**: Added precise line numbers to the default renderer output
- **Smart Handling**: Correctly handles loops, includes, and whitespace culling
- **Perfect Alignment**: Line numbers stay synchronized with wrapped content
- **Dedicated Gutter**: Visual separation between line numbers and content
- **Colored Loop Highlights**: Looped lines get highlighted to be distinguishable and see iterations.

### 1.7.5 - Mermaid Improvements 🎨
- **Mermaid Diagram Enhancements**: Improved node width constraints and text wrapping for better readability
- **Array Methods Styling**: Array and string methods like `append()`, `split()`, `strip()` now display with proper method styling

### 1.7.4 - Stability & Bug Fixes 🐛
- Fixed race conditions, memory leaks, and infinite loop risks
- Extension suggestion buttons now work properly
- Error button always visible regardless of rendering mode
- New selections take priority when updating
- Better error messages and validation throughout

### 1.7.3 - IntelliSense Bug Fixes
- **Smart Filtering**: Autocomplete now filters by partial match (typing `{{ ad` only shows "address")
- **Correct Context**: Keywords only appear in `{% %}` blocks, not in `{{ }}` expressions  
- **Live Updates**: Variable edits in webview immediately update autocomplete
- **Better UX**: Case-insensitive filtering for all suggestions

### 1.7.2 - Syntax Highlighting 🎨
- **Editor Highlighting**: Real-time Jinja2 syntax highlighting in the editor
- **Template Preview**: Syntax-highlighted template display in sidebar/panel
- **Configurable**: Control highlighting for text files via settings
- **Theme-Aware**: Colors adapt to your VS Code theme

### 1.7.1 - IntelliSense Improvements
- Enhanced type inference for variables
- Improved hover provider reliability
- Smart update behavior for current file

### 1.7.0 - Complete IntelliSense System 🎉 MAJOR UPDATE
This is a **transformative release** that adds a complete IDE experience for Jinja2 templates!

#### New Features:
- **Variable Autocomplete**: Intelligent completion for all extracted variables with type information
- **Dot Notation IntelliSense**: Smart property suggestions for nested objects (e.g., `user.address.city`)
- **Hover Documentation**: Rich information showing types, current values, and available properties
- **Filter Library**: 20+ Jinja2 filters with complete documentation (default, length, upper, join, etc.)
- **Keyword Completion**: Autocomplete for control structures (for, if, set, block, extends, etc.)
- **Real-time Sync**: IntelliSense automatically updates with variable extraction and changes
- **Smart Context Detection**: Only activates in Jinja template contexts, no interference elsewhere

#### Bug Fixes:
- Fixed variable extraction incorrectly identifying list methods like `append` as variables

### 1.6.3 - Smart Extension Detection & Performance
- Automatic extension detection, one-click enable suggestions, color-coded render time metrics, toggle display in settings

### 1.6.2 - Extensions Support Fixes
- Fixed i18n/gettext issue, improved custom extension validation, clearer extension loading error messages

### 1.6.1 - UX Enhancements
- Clickable extensions indicator, keyboard shortcut (Ctrl+Alt+X / Cmd+Shift+X), tooltips & help examples, better placeholders, minor code cleanup

### 1.6.0 - Jinja2 Extensions Support
- Built-in support for 6 extensions, single checkbox settings object, quick "Configure Jinja2 Extensions" action, custom extension paths, instant activation, visual/status indicators

### 1.5.4 - Quick Selection Actions
- Lightbulb actions for selected text with one-click rendering

### 1.5.3 - Variables Import/Export System
- Export/import variables to JSON file or clipboard with full validation

### 1.5.2 - Enhanced Variable Extraction
- 40+ new Jinja filters and keywords, support for ternary expressions, slice notation

### 1.5.1 - Migration & Compatibility Patch
- Fixed settings migration and backwards compatibility

### 1.5.0 - Enhanced Settings & Customization
- Reorganized settings into clear categories with 8 new settings

### 1.4.6 - Status Bar Indicator
- Status bar shows current settings with click-to-open functionality

### 1.4.5 - Code Quality & Type Safety
- Major refactor: Split webview code into separate files

### 1.4.4 - Bug Fixes
- Fixed selection highlight persistence

### 1.4.3 - File History Dropdown
- Quick access to last 5 files/selections via dropdown menu

### 1.4.2 - Selection Range Adjustment
- Dynamic selection range adjustment when adding/removing lines

### 1.4.1 - Visual Highlighting
- Subtle blue background highlights selected rendering range

### 1.4.0 - Selection-Based Rendering
- Select any portion of text to render just that section

### 1.3.3 - Auto-Rerender Control
- Dynamic file name display, auto-rerender toggle, sidebar button

### 1.3.2 - Ghost Save
- Variables auto-save per file with smart extraction and merge

### 1.3.1 - Context Menu Integration
- Editor context menu integration with variable preset quick actions

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
