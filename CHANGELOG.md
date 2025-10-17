# Change Log

All notable changes to the "live-jinja-renderer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2025-10-17

### Added
- Initial release of Live Jinja Renderer
- **Real-time Jinja2 template rendering with Python Jinja2 via Pyodide** (authentic Python Jinja2, not a JavaScript port)
- JSON variable editor with live updates
- Side-by-side preview panel
- Auto-sync: changes to template file trigger automatic re-rendering
- **Markdown rendering**: Toggle to render output as formatted markdown with proper styling
- **Mermaid diagram support**: Toggle to render output as Mermaid diagrams (flowcharts, sequence diagrams, etc.)
- **Whitespace culling**: Automatically removes excessive blank lines and spaces (enabled by default)
- **Whitespace visualization**: Show spaces, tabs, and newlines as visible characters for debugging
- Improved UI with control toggles in the output header
- Support for `.txt`, `.jinja`, `.j2`, and HTML files
- Keyboard shortcuts: `Cmd+Shift+J` (Mac) or `Ctrl+Alt+J` (Windows/Linux)
- Command palette command: "Live Jinja Renderer"

### Features
- **Uses Pyodide (v0.25.1)** - Python runtime in browser for 100% Jinja2 compatibility
- **Uses Python Jinja2** - The actual Python Jinja2 library, ensuring perfect compatibility
- Uses marked.js (v11.1.0) for markdown rendering
- Uses mermaid.js (v10.6.1) for diagram rendering
- Whitespace culling reduces multiple blank lines to max 2 newlines
- Whitespace culling consolidates multiple spaces/tabs
- Mutually exclusive markdown and mermaid modes
- Show whitespace disabled when markdown/mermaid modes are active
- **Beautiful toggle switches** - Professional iOS-style switches instead of plain checkboxes
- **Enhanced UI styling** - Improved spacing, borders, shadows, and typography
- **Custom scrollbars** - Styled scrollbars that match VS Code theme
- **Resizable panes** - Drag the handle between variables and output to adjust heights
- **Responsive controls** - Toggle switches wrap on narrow screens to prevent overflow
- VS Code theme integration for consistent styling
- Loading indicator while Python environment initializes
