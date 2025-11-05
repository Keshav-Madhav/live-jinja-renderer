# Change Log

All notable changes to the "live-jinja-renderer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.3.2] - 2025-11-06

### Added
- **Ghost Save Feature** 👻
  - Variables automatically save per file in the background
  - Auto-restore when reopening files
  - Each file remembers its own variables across sessions

### Improved
- **Smarter Variable Extraction**
  - Re-extraction now merges with existing variables
  - User customizations are preserved
  - New variables added without removing old ones

## [1.3.1] - 2025-11-05

### Added
- **Editor Context Menu** - Right-click in editor for quick access to Jinja commands
- **Variables Quick Actions** - Save/Load icon buttons in Variables header

### Improved
- **Native Webview Context Menu** - Right-click in Sidebar/Panel for rendering options, whitespace settings, and variable management

## [1.3.0] - 2025-11-04

### Added
- **Enhanced Error Detection & Navigation** 🎯
  - Clickable error messages with line numbers
  - Navigate directly to error location in template file
  - Visual line highlighting with red background and border
  - Automatic cursor positioning at error line
  - Smart highlight removal on cursor movement away from error line
  - Supports both Jinja2 syntax errors and rendering errors

### Improved
- **Better Error Reporting** 🐛
  - More precise error line detection from Python Jinja2 tracebacks
  - Clearer error message formatting in output
  - Enhanced error parsing for multiple error types (UndefinedError, TemplateSyntaxError, etc.)
  - Visual feedback when clicking on error lines
  - Automatic document focus when navigating to errors

### Technical
- Added `goToLine` message handler in webview manager
- Implemented text editor decoration API for line highlighting
- Enhanced error extraction regex patterns for better accuracy
- Improved event handling for decoration lifecycle management
- Better cleanup of highlight decorations and event listeners

## [1.2.1] - 2025-11-03

### Added
- **Enhanced JSON Editor** ✍️
  - Smart auto-closing for brackets `{}`, `[]`, and quotes `""` `''`
  - Auto-indentation on Enter key based on context
  - Tab support: Tab for 2-space indent, Shift+Tab to unindent
  - Smart navigation: Skip over closing characters when typing
  - Smart backspace: Delete matching pairs when backspacing between brackets/quotes
  - Monospace font (Consolas, Monaco, Courier New) for better readability
  - Lightweight implementation with zero external dependencies

## [1.2.0] - 2025-10-28

### Added
- **Loading Indicators** ⏳
  - Shows "Extracting variables..." when clicking the Extract Variables button
  - Shows "Rendering template..." during initial template load
  - Shows loading status during variable extraction operations
  - Clear visual feedback for all async operations
  - Consistent loading indicator across all operations

### Improved
- **Enhanced Variable Extraction Algorithm** 🎯
  - More robust variable detection with better edge case handling
  - Smart literal detection: Pure literals (e.g., `{% set a = 5 %}`) are no longer extracted as input variables
  - Self-referencing detection: Variables like `{% set a = a + 2 %}` are correctly identified as required inputs
  - Loop variable exclusion: Iteration variables (e.g., `item` in `{% for item in items %}`) are no longer extracted
  - Filter argument extraction: Properly extracts variables from filter arguments (e.g., `{{ value | default(fallback) }}`)
  - Handles nested structures, array access, and complex expressions more accurately
  - 30+ test cases validate extraction accuracy for edge cases

- **Cleaner JSON Output** 📋
  - Changed JSON indentation from 4 spaces to 2 spaces for more compact display
  - Arrays now show single example items instead of duplicates (e.g., `[item]` instead of `[item, item]`)
  - Objects show single key-value pair for clarity (e.g., `{ "key": "value" }`)
  - More readable and industry-standard formatting

### Technical
- Improved code documentation and maintainability
- Better helper functions for variable extraction and processing

## [1.1.4] - 2025-10-26

### Added
- **Auto-Resizing Variables Section** 🎨
  - Variables window now automatically expands or shrinks to fit content
  - Dynamically adjusts height when variables are extracted or re-extracted
  - Automatically resizes when loading variable presets
  - Updates as you type or edit variables manually
  - Smart sizing with min/max limits (100px to 60% of viewport)
  - Line-based calculation: approximately 20px per line with padding
  - Output section automatically takes remaining space
  - Manual resize handle still available for custom preferences

### Improved
- **Better Workflow**: No need to manually adjust variable section height when working with different templates
- **Responsive UI**: Variables section adapts to content size, maximizing space efficiency
- **User Experience**: Smooth automatic transitions when content changes

## [1.1.3] - 2025-10-25

### Fixed
- **Update for Current File**: Fixed a critical bug where the "Update for Current File" button was not properly extracting variables and updating output. Now works as intended when switching files or manually refreshing.
- Other minor stability improvements and bug fixes.

## [1.1.2] - 2025-10-25

### Fixed
- **Extract Variables Button**: The "Extract Variables" button in the panel view now works correctly.
- **Icon Visibility**: Corrected issues where command icons were not appearing in certain menus.
- Minor stability improvements and bug fixes.

## [1.1.1] - 2025-10-20

### Fixed
- Minor fixes and code improvements
- Improved code readability and project structure

## [1.1.0] - 2025-10-20

### Added
- **Save Variables Preset Feature** 🎉
  - Save current variable configurations with custom names
  - Smart default naming: Auto-generates names based on filename (e.g., "template Variables")
  - Preset names are pre-selected for easy editing or quick acceptance
  - Variables stored in VS Code global state (persists across workspaces and sessions)
  
- **Load Variables Preset Feature**
  - Quick Pick menu displays all saved presets
  - Instantly load previously saved variable configurations
  - Variables are applied immediately with automatic re-rendering
  
- **Delete Variables Preset Feature**
  - Select presets to delete from Quick Pick menu
  - Confirmation dialog prevents accidental deletion
  - Clean up unwanted or outdated presets
  
- **New Commands**
  - `live-jinja-tester.saveVariables` - Save current variables as a preset
  - `live-jinja-tester.loadVariables` - Load a saved preset
  - `live-jinja-tester.deleteVariables` - Delete a saved preset
  - All available via three-dot menu and Command Palette

### Improved
- **User Experience**
  - Native VS Code input box with validation for preset names
  - Organized three-dot menu with new "Variables" section
  - Better error handling with proper user notifications
  - Seamless integration with existing variable workflow

### Use Cases
- Save complex API response samples for testing
- Store multiple test data scenarios
- Reuse common variable sets across templates
- Quickly switch between different data configurations

## [1.0.2] - 2025-10-20

### Changed
- **Variable Extraction Behavior**: Variables are no longer automatically extracted on every template change
  - Initial load: Variables are automatically extracted when first opening a file
  - Switching files: Variables are automatically extracted for each new file
  - Template edits: Variables are preserved (no auto-extraction) to maintain custom values

### Added
- **Manual Variable Extraction**: Added keyboard shortcut and enhanced controls for extracting variables
  - Keyboard shortcut: `Ctrl+Alt+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)
  - Available via three-dot menu: "Extract Variables from Template"
  - Available via footer button in panel mode: "🔄 Extract Variables"
  - Command palette: "Jinja: Extract Variables from Template"

### Fixed
- **Newline Rendering Bug**: Fixed issue where newlines were being doubled in output
  - When "Cull Whitespace" was disabled, single newlines appeared as double newlines
  - Caused by incorrect escaping in Python template string processing
  - Now correctly preserves exact newline count from rendered output

### Improved
- Better preservation of user-customized variable values during template editing
- More intuitive variable extraction workflow
- Cleaner initial setup experience with automatic first-time extraction

## [1.0.1] - 2025-10-19

### Changed
- **UI/UX Overhaul**: Moved controls from custom in-pane dropdowns to VS Code native UI
  - Toggle buttons (Markdown, Mermaid) now appear in both navigation bar and three-dot menu
  - All settings now accessible via three-dot menu in sidebar title bar
  - Panel mode retains toggle switches for larger viewing area
  - Cleaner, more native VS Code experience

### Added
- **Update for Current File Button**: Manual refresh button to update preview when switching files
  - Available in navigation bar (sync icon)
  - Also accessible from three-dot menu
- **Improved Menu Organization**: 
  - Navigation bar: Markdown, Mermaid, and Update icons (always visible)
  - Three-dot menu organized into logical groups:
    - Rendering: Toggle Markdown, Toggle Mermaid
    - Whitespace: Toggle Show Whitespace, Toggle Cull Whitespace
    - Actions: Re-extract Variables, Copy Output
    - View: Open in Editor Pane

### Fixed
- **Copy Output Functionality**: Fixed clipboard access issues in sidebar mode
  - Now uses VS Code's native clipboard API (`vscode.env.clipboard`)
  - More reliable copy operation across all contexts
  - Proper error handling and user notifications

### Improved
- Better integration with VS Code's UI patterns
- More discoverable features through standardized menus
- Consistent behavior between sidebar and panel modes

## [1.0.0] - 2025-10-19

### Released
- **Initial Marketplace Publication**
- Extension now available on Visual Studio Code Marketplace
- Stable release with full feature set
- Production-ready for public use

## [0.0.3] - 2025-10-17

### Improved
- **Sidebar UI Optimization**: All controls and actions now in compact three-dot menu (⋯) to maximize vertical space
  - Toggle options (Markdown, Mermaid, Show Whitespace, Cull Whitespace) in top section
  - Action buttons (Re-extract, Rerender, Copy) in bottom section with separator
  - Footer buttons removed in sidebar mode to save space
- **Panel UI**: Toggle switches and footer buttons remain visible in panel mode for larger viewing area
- **Responsive Design**: UI automatically adapts based on whether it's in sidebar or panel mode
- **Better UX**: Cleaner interface with more space for variables and output

### Added
- **Custom Icons**: 
  - Extension icon (favicon.png) now visible in Extensions list
  - Custom {{ }} brackets icon for Activity Bar (theme-aware SVG)
  - Better command icons: `$(symbol-method)` for sidebar, `$(split-horizontal)` for panel
- **Clearer Command Titles**:
  - "Open in Sidebar" (was "Show Jinja Renderer Sidebar")
  - "Open in Editor Pane" (was "Open Jinja Renderer in Panel")

## [0.0.2] - 2025-10-17

### Added
- **Sidebar View**: Added persistent sidebar view in Activity Bar (default mode)
- **Dual-mode UI**: Choose between sidebar view or panel view based on preference
- **Multi-file support**: Sidebar automatically updates when switching between files
- **Activity Bar icon**: Preview icon appears in the left sidebar for easy access
- **Alternative keyboard shortcut**: `Ctrl+Alt+Shift+J` (Windows/Linux) or `Cmd+Shift+Alt+J` (Mac) for panel view

### Changed
- **Primary interface**: Sidebar view is now the default (keyboard shortcut `Ctrl+Alt+J`)
- **Panel view**: Now an alternative option accessible via window icon or keyboard shortcut
- Refactored extension architecture for better code organization
- Updated documentation to reflect new UI options

### Improved
- Better VS Code integration following standard UI patterns
- More persistent and discoverable UI
- Less intrusive - sidebar doesn't take up editor space
- Improved user workflow with auto-switching files

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
