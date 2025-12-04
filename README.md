# Live Jinja Renderer

![Version](https://img.shields.io/badge/version-1.9.5-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A powerful VS Code extension for **real-time Jinja2 template preview** with authentic Python Jinja2 (via Pyodide). Edit templates and variables side-by-side with instant rendering, **template includes/extends**, markdown support, mermaid diagrams, intelligent whitespace management, smart error navigation, and **full IntelliSense with autocomplete**.

> 🎯 **Perfect for**: Python developers, DevOps engineers, Ansible users, prompt engineering, configuration management, and anyone working with Jinja2 templates.

---

## 🚀 What's New in v1.9.5

### 🎯 Go to Definition (Ctrl/Cmd+Click)
Navigate directly to definitions with **Ctrl/Cmd+Click**:

- **Macros**: Click `my_macro()` → jumps to `{% macro my_macro() %}`
- **Template paths**: Click path in `{% import 'path.jinja' %}` → opens the file
- **Variables**: Navigate to `{% set %}`, `{% for %}`, `{% with %}`, macro params
- **Imported names**: Click `button` in `{% from "x" import button %}` → goes to macro

### 📚 Enhanced Hover Documentation
Rich hover tooltips for all Jinja elements:

- **Macros**: Shows signature with parameters and default values
- **Filters**: 50+ filters with signatures, descriptions, and examples
- **Keywords**: `for`, `if`, `set`, `block`, `macro`, `import`, etc.
- **Tests**: `defined`, `none`, `even`, `odd`, `iterable`, etc.

> 💡 **Previous**: Rewritten Variable Extractor (v1.9.4), Relative Path Support (v1.9.3), Template Includes (v1.9.0)

---

## ✨ Key Features

### 🎨 **Syntax Highlighting**
- **Editor Highlighting**: Real-time Jinja2 syntax highlighting in your text editor
  - Highlights delimiters, keywords, variables, strings, numbers, filters, and comments
  - Works automatically with `.jinja`, `.j2`, and `.txt` files
- **Template Preview**: Syntax-highlighted template display in sidebar/panel

### 💡 **Full IntelliSense System**
- **Go to Definition**: Ctrl/Cmd+Click to navigate to macros, variables, blocks, and template paths
- **Hover Documentation**: Rich tooltips for macros (signatures), filters (50+), keywords, and tests
- **Variable Autocomplete**: Intelligent suggestions inside `{{ }}` and `{% %}` blocks
- **Dot Notation IntelliSense**: Navigate nested objects (e.g., `user.address.city`)
- **Filter Library**: 50+ Jinja2 filters with signatures and examples
- **Keyword Completion**: Autocomplete for `for`, `if`, `set`, `block`, `extends`, `macro`, etc.
- **Smart Context Detection**: Only activates in Jinja template syntax

### 🐍 **Authentic Python Jinja2**
- Uses **real Python Jinja2** engine via Pyodide (not a JavaScript port)
- 100% compatible with Python Jinja2 behavior
- **Full template composition**: `{% include %}`, `{% extends %}`, `{% import %}`

### 🎨 **Flexible UI Options**
- **Sidebar View**: Persistent panel in Activity Bar
- **Panel View**: Separate editor pane beside your file
- **Detached Output**: Open output in isolated editor pane for dual-monitor setups
- **Selection Rendering**: Render only selected portions of your template
- **File History**: Quick access to recently opened files/selections

### ⚡ **Real-time Everything**
- Instant rendering as you type (or manual control with auto-rerender toggle)
- Live variable updates with JSON editing
- Auto-sync when switching between files
- IntelliSense updates automatically with variable changes

### 📝 **Rich Content Support**
- **Markdown rendering**: Beautiful formatted output
- **Mermaid diagrams**: Flowcharts, sequence diagrams, gantt charts
- **Whitespace management**: Strip block whitespace, culling, and visualization

### 🎯 **Developer Experience**
- **Smart Error Navigation**: Click errors to jump to the line in your template
- **Save/Load Variable Presets**: Reuse complex JSON configurations
- **Import/Export Variables**: Share variables via JSON files or clipboard
- **Ghost Save**: Variables auto-save per file and restore across sessions
- **Performance Metrics**: Render time display with color indicators
- **Extension Detection**: Smart suggestions for required Jinja2 extensions

---

## Quick Start

### Sidebar View (Recommended)

1. Open a `.txt`, `.jinja`, `.j2`, or plaintext file with Jinja2 syntax
2. Press `Ctrl+Alt+J` (Windows/Linux) or `Cmd+Shift+J` (Mac)
3. Edit variables in JSON format
4. See rendered output in real-time
5. Start typing `{{` and enjoy **IntelliSense autocomplete**! 🎉

**Quick Actions**:
- **Navigation bar**: Markdown, Mermaid, Update icons
- **Three-dot menu** (⋯): All settings and actions
- **Auto-rerender button**: Toggle automatic rendering on/off
- **File history dropdown**: Switch between recent files/selections
- **Footer indicators**: Click any enabled setting to disable it

### Panel View

Press `Ctrl+Alt+Shift+J` (Windows/Linux) or `Cmd+Shift+Alt+J` (Mac) for side-by-side editor view.

---

## Features in Detail

### 💡 IntelliSense & Autocomplete

#### Variable Autocomplete
Press `Ctrl+Space` inside `{{ }}` or `{% %}` blocks:
```jinja
{{ user  <-- Shows: user, items, config (with types and previews)
{{ user.  <-- Shows: name, email, age, address (nested properties)
{{ user.address.  <-- Shows: city, country, zip (deeply nested)
```

#### Filter Suggestions
Type `|` after any variable to see 20+ Jinja2 filters:
```jinja
{{ items|  <-- Shows: length, first, last, join, sort, reverse, unique, etc.
```

**Supported Filters**: `upper`, `lower`, `capitalize`, `trim`, `replace`, `first`, `last`, `join`, `length`, `sort`, `reverse`, `unique`, `round`, `default`, `select`, `map`, `tojson`, `safe`, and more.

#### Hover Documentation
Hover over any variable to see type, current value, and available properties.

#### Keyword Completion
Type `{%` and press `Ctrl+Space` for control structure suggestions.

---

### 📝 Code Snippets

Type `j` followed by a keyword to quickly insert Jinja2 structures:

| Prefix | Expands To |
|--------|------------|
| `jif` | `{% if %}...{% endif %}` |
| `jifelse` | `{% if %}...{% else %}...{% endif %}` |
| `jifelif` | `{% if %}...{% elif %}...{% else %}...{% endif %}` |
| `jfor` | `{% for item in items %}...{% endfor %}` |
| `jforelse` | `{% for %}...{% else %}...{% endfor %}` |
| `jforif` | `{% for item in items if condition %}...{% endfor %}` |
| `jvar` | `{{ variable }}` |
| `jvarf` | `{{ variable \| filter }}` |
| `jset` | `{% set variable = value %}` |
| `jsetblock` | `{% set %}...{% endset %}` |
| `jblock` | `{% block name %}...{% endblock %}` |
| `jblocksuper` | `{% block %}{{ super() }}...{% endblock %}` |
| `jextends` | `{% extends "base.html" %}` |
| `jinclude` | `{% include "template.html" %}` |
| `jimport` | `{% import "macros.html" as macros %}` |
| `jfrom` | `{% from "macros.html" import macro %}` |
| `jmacro` | `{% macro name(args) %}...{% endmacro %}` |
| `jcall` | `{% call macro() %}...{% endcall %}` |
| `jfilter` | `{% filter name %}...{% endfilter %}` |
| `jwith` | `{% with var = value %}...{% endwith %}` |
| `jraw` | `{% raw %}...{% endraw %}` |
| `jcomment` | `{# comment #}` |
| `jdo` | `{% do expression %}` *(requires do extension)* |
| `jbreak` | `{% break %}` *(requires loopcontrols)* |
| `jcontinue` | `{% continue %}` *(requires loopcontrols)* |
| `jtrans` | `{% trans %}...{% endtrans %}` *(requires i18n)* |
| `jautoescape` | `{% autoescape %}...{% endautoescape %}` |

> 💡 All snippets also work with `jinja-` prefix (e.g., `jinja-if`, `jinja-for`)

---

### Detached Output Window
Open output in a separate editor pane for distraction-free viewing:
- Click the detach button (link icon) next to the output header
- Perfect for dual-monitor setups or side-by-side viewing
- Live updates from both template and variable changes
- Main window automatically adapts when output is detached

### Selection-Based Rendering
Render only the portion of your file that matters:
- **Select text** in your Jinja/text file
- **Open renderer** via sidebar, panel, or context menu
- **Visual highlight**: Selected range gets a subtle blue tint
- **History support**: Different selections appear as separate history entries

### Variable Presets
Save, load, and reuse variable configurations:
- **Save**: Click save icon or use three-dot menu
- **Load**: Click load icon or use three-dot menu
- **Ghost Save**: Variables auto-save per file and restore across sessions

### Import/Export Variables
Share and backup variable configurations:
- Export to JSON file or clipboard
- Import from workspace files, file browser, or active editor

### Jinja2 Extensions
Full support for Jinja2 extensions with instant activation:
- **Built-in**: i18n, do, loopcontrols, autoescape, debug
- **Note**: `with` is built-in since Jinja2 2.9 (no extension needed)
- **Custom Extensions**: Add your own via comma-separated paths
- **Visual Indicator**: See active extensions above the output

---

## Template Includes & Extends

Use Jinja2's powerful template composition features just like in Python.

### Basic Include
Include another template file:
```jinja
<header>
  {% include "partials/nav.jinja" %}
</header>

<main>
  {{ content }}
</main>

{% include "partials/footer.jinja" %}
```

### Template Inheritance
Create a base template with blocks:
```jinja
{# base.jinja #}
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}My Site{% endblock %}</title>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

Extend it in child templates:
```jinja
{# page.jinja #}
{% extends "base.jinja" %}

{% block title %}Home - {{ super() }}{% endblock %}

{% block content %}
<h1>Welcome, {{ user.name }}!</h1>
{% endblock %}
```

### Import Macros
Create reusable macros:
```jinja
{# macros.jinja #}
{% macro button(text, type="primary") %}
<button class="btn btn-{{ type }}">{{ text }}</button>
{% endmacro %}
```

Import and use them:
```jinja
{% from "macros.jinja" import button %}

{{ button("Click Me") }}
{{ button("Delete", "danger") }}
```

### Template Browser

The **"X templates loaded"** indicator in the footer shows all available templates:

1. **Click** to open a dropdown with all templates
2. **Click any template** to open it in the editor
3. **Click "Reload Templates"** after adding new files

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `templates.enableIncludes` | `true` | Enable/disable template loading |
| `templates.searchPaths` | `[]` | Directories to search. Supports `.` (current folder), `..`, `./path`, `../path` (relative to file), or paths relative to workspace |
| `templates.filePatterns` | `["**/*.jinja", "**/*.j2", "**/*.html", "**/*.txt"]` | File patterns to load |
| `templates.maxFiles` | `100` | Maximum templates to load |

**Example**: To match a Python project structure:
```json
{
  "liveJinjaRenderer.templates.searchPaths": ["templates", "src/templates"]
}
```

Now you can use short paths like `{% include "partials/header.jinja" %}` instead of full paths.

---

## Examples

### Basic Template
```jinja
Hello {{ name }}!
{% for item in items %}
  - {{ item }}
{% endfor %}
```

### With Block Whitespace Stripping (default ON)
```jinja
{% if show_greeting %}
Hello {{ name }}!
{% endif %}
```
Output is clean without extra blank lines.

---

## Extension Settings

All settings are organized into clear categories:

### Rendering
| Setting | Default | Description |
|---------|---------|-------------|
| `rendering.enableMarkdown` | `false` | Markdown rendering |
| `rendering.enableMermaid` | `false` | Mermaid diagrams |
| `rendering.showWhitespace` | `true` | Show whitespace characters |
| `rendering.cullWhitespace` | `false` | Remove excessive whitespace |
| `rendering.autoRerender` | `true` | Automatic re-rendering |
| `rendering.rerenderDelay` | `300` | Delay before auto-rerender (ms) |

### Environment
| Setting | Default | Description |
|---------|---------|-------------|
| `environment.stripBlockWhitespace` | `true` | Strip whitespace around block tags |

### Templates
| Setting | Default | Description |
|---------|---------|-------------|
| `templates.enableIncludes` | `true` | Enable include/extends support |
| `templates.searchPaths` | `[]` | Directories to search for templates |
| `templates.filePatterns` | `["**/*.jinja", ...]` | Glob patterns for template files |
| `templates.maxFiles` | `100` | Maximum templates to load |

### Editor
| Setting | Default | Description |
|---------|---------|-------------|
| `editor.autoResizeVariables` | `true` | Auto-resize variables section |
| `editor.formatVariablesJson` | `true` | Auto-format JSON |

### Variables
| Setting | Default | Description |
|---------|---------|-------------|
| `variables.autoExtract` | `true` | Auto-extract variables |
| `variables.preserveCustomValues` | `true` | Preserve custom values on re-extract |

### History
| Setting | Default | Description |
|---------|---------|-------------|
| `history.enabled` | `true` | Enable file history tracking |
| `history.size` | `5` | Max history items (3-15) |

### Advanced
| Setting | Default | Description |
|---------|---------|-------------|
| `advanced.ghostSave` | `true` | Auto-save variables per file |
| `advanced.showPerformanceMetrics` | `true` | Show render time |
| `advanced.suggestExtensions` | `true` | Suggest Jinja2 extensions |

### Highlighting
| Setting | Default | Description |
|---------|---------|-------------|
| `highlighting.enableForTextFiles` | `true` | Syntax highlighting for .txt files |

### Extensions
Configure Jinja2 extensions via `liveJinjaRenderer.extensions`:
- `i18n`, `do`, `loopcontrols`, `autoescape`, `debug` (all default: `false`)
- `custom`: Comma-separated custom extension paths

---

## Recent Updates

### 1.9.5 - Go to Definition & Hover Docs
- **Ctrl/Cmd+Click navigation** - Jump to macros, variables, blocks, template paths
- **Macro hover** - Shows signature with parameters and default values
- **Filter hover** - 50+ filters with signatures, descriptions, examples
- **Keyword/test hover** - Documentation for all Jinja keywords and tests

### 1.9.4 - Rewritten Variable Extractor
- **Complete rewrite** - Tokenizer-based architecture for robust variable extraction
- **Dict method support** - `.get()`, `.pop()`, `.setdefault()` extract keys as properties
- **Mixed access types** - `data["key"][0].prop` builds correct nested structures
- **Better scope tracking** - Proper handling of loops, set, with, and macros

### 1.9.3 - Relative Path Support
- **Relative search paths** - Use `.`, `..`, `./path` for file-relative template search
- **Current folder only mode** - Set `searchPaths: ["."]` to limit scope

### 1.9.2 - Smart Loading & JSON Validation
- **Smart Template Loading** - Zero overhead for simple templates
- **Color-coded Template Browser** - Green for used, dimmed for available
- **Inline JSON Validation** - Error indicator with line/column info
- Fixed toggle defaults and status footer overflow

### 1.9.1 - Detached Output Improvements
- **Status footer stays in main panel** when output is detached
- **Render time bar**: Click to re-render, shows count, performance tips
- **Zebra striping** on line gutter for better readability

### 1.9.0 - Template Includes & Extends (Major Update)
- **`{% include %}` and `{% extends %}` support** - Full template composition
- **Template Browser** - Click indicator to view/open all templates
- **Macro imports** - `{% from "macros.jinja" import button %}`
- Improved syntax highlighting for functions and filters

### 1.8.x - Environment Settings & UI Polish
- **Strip Block Whitespace** setting (default: ON)
- **Settings Footer** with click-to-disable
- **Detached Output Window** for dual-monitor setups
- Fixed `jinja2.ext.with_` compatibility

### 1.7.x - IntelliSense & Line Navigation
- **Complete IntelliSense System** with variable autocomplete, filters, hover docs
- **Clickable Line Numbers** for quick template navigation
- **Syntax Highlighting** in editor and preview
- UI space optimization and stability fixes

### 1.6.x - Extensions & Import/Export
- **Jinja2 Extensions Support** with 6 built-in extensions
- **Smart Extension Detection** with one-click enable
- **Variables Import/Export** to JSON files or clipboard
- Performance metrics and status bar indicator

### 1.5.x - History & Selection Actions
- **File History Dropdown** for quick context switching
- **Selection Actions** with lightbulb quick actions
- Reorganized settings into clear categories

### 1.4.x - Selection-Based Rendering
- **Selection Rendering** for focused template portions
- **Visual Highlighting** of selected ranges
- Dynamic selection range adjustment

### 1.3.x - Auto-Rerender & Ghost Save
- **Auto-Rerender Toggle** for performance control
- **Ghost Save** for automatic variable persistence
- **Error Navigation** with clickable error messages

### 1.0.x-1.2.x - Foundation
- Initial release with Python Jinja2 via Pyodide
- Variable presets, smart extraction, loading indicators
- JSON editor enhancements, UI/UX improvements

---

## Links

- **📦 GitHub Repository**: [live-jinja-renderer](https://github.com/Keshav-Madhav/live-jinja-renderer)
- **🌐 Companion Website**: [Live Jinja Renderer](https://keshav-madhav.github.io/live_jinja/)

## Contributing

Issues and pull requests are welcome! Visit the [GitHub repository](https://github.com/Keshav-Madhav/live-jinja-renderer) to contribute.

## License

This extension is licensed under the [MIT License](LICENSE).
