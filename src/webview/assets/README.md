# Webview Assets

This directory contains the separated components of the Live Jinja Renderer webview, refactored in version 1.4.5 for better code organization and maintainability.

## Files

### `template.html`
The HTML structure and layout for the webview. Contains placeholder markers that are replaced dynamically:
- `{{STYLES}}` - Injected with the contents of `styles.css`
- `{{SCRIPT}}` - Injected with the processed contents of `webview.js`
- `{{FILE_HISTORY_DROPDOWN}}` - Conditionally injected for sidebar mode
- `{{AUTO_RERENDER_TOGGLE}}` - Conditionally injected for sidebar mode
- `{{PANEL_CONTROLS}}` - Conditionally injected for panel mode
- `{{OUTPUT_FOOTER}}` - Conditionally injected for panel mode

### `styles.css`
All CSS styling for the webview in one organized file. Includes:
- Layout and container styles
- Component-specific styles (buttons, toggles, inputs)
- VS Code theme variable integration
- Markdown and Mermaid diagram styling
- Responsive design elements

### `webview.js`
All JavaScript functionality for the webview. Contains:
- VS Code API integration
- Pyodide/Jinja2 rendering engine
- Variable management and ghost save
- File history management
- Event handlers and UI interactions
- Contains one placeholder: `"__IS_SIDEBAR_PLACEHOLDER__"` replaced with boolean value
- Fully type-checked with proper TypeScript annotations

### `globals.d.ts`
TypeScript declaration file for webview global APIs and libraries:
- `acquireVsCodeApi()` - VS Code webview API function
- `loadPyodide()` - Pyodide loader function
- `mermaid` - Mermaid diagram library
- `marked` - Marked markdown parser library
- Enables full TypeScript checking without errors
- Provides IntelliSense and autocomplete in VS Code

## How It Works

The `webviewContent.js` file in the parent directory reads these three files and assembles them into a complete HTML document:

1. Reads `template.html`, `styles.css`, and `webview.js`
2. Processes conditional UI elements based on view mode (sidebar vs panel)
3. Replaces placeholders in the template with actual content
4. Returns the complete HTML string ready for the webview

## Benefits

- **Separation of Concerns**: HTML, CSS, and JS are in their own files
- **Type Safety**: Full TypeScript checking with zero linting errors
- **Easier Maintenance**: Update styles, structure, or behavior independently
- **Better Readability**: No more massive template strings
- **IDE Support**: Full syntax highlighting, IntelliSense, and code completion in each file
- **Debugging**: Easier to find and fix issues in specific components
- **Clean Code**: Proper type declarations without using `@ts-nocheck`

## Development

When making changes:
- Edit the appropriate file (`template.html`, `styles.css`, or `webview.js`)
- The changes will be automatically picked up on extension reload
- No need to modify `webviewContent.js` unless changing the assembly logic

## Version

Introduced in: **1.4.5** (2025-11-08)
