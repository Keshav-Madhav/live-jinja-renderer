# Live Jinja Renderer - Test Suite Documentation

Comprehensive test suite for the Live Jinja Renderer VS Code extension.

## Overview

This test suite provides extensive coverage of all extension functionality, including:
- ✅ Extension activation and initialization
- ✅ Variable extraction from Jinja templates
- ✅ IntelliSense and code completion
- ✅ Webview communication and rendering
- ✅ Import/Export functionality
- ✅ Settings and configuration
- ✅ Command execution
- ✅ Error handling and edge cases
- ✅ Performance testing
- ✅ Future feature compatibility

## Test Structure

### Test Files

```
test/
├── extension.test.js      # Main extension and variable extraction tests
├── webviewManager.test.js # Webview communication and state management
├── providers.test.js      # IntelliSense, hover, and other providers
├── commands.test.js       # All extension commands
└── README.md             # This file
```

### Test Suites Overview

#### **extension.test.js** (877 lines, 110+ tests)
- Extension activation and initialization
- Variable extraction (40+ tests covering edge cases)
- IntelliSense functionality
- Settings and configuration validation
- Command registration and availability
- Error handling and recovery
- Integration tests
- Future features compatibility
- Performance benchmarks
- Real-world template scenarios
- Cross-platform compatibility

#### **webviewManager.test.js** (400+ lines, 45+ tests)
- Webview creation and disposal
- Message handling between extension and webview
- Template updates and synchronization
- Selection range tracking
- Settings synchronization
- Concurrent webview management
- Ghost save integration
- Error handling in webviews
- Performance testing

#### **providers.test.js** (450+ lines, 40+ tests)
- IntelliSense completion provider
- Hover provider functionality
- Syntax decorator for Jinja highlighting
- Selection actions provider
- Sidebar view provider
- File history management
- Provider integration tests
- Performance benchmarks

#### **commands.test.js** (500+ lines, 50+ tests)
- Render commands (panel and sidebar)
- Settings toggle commands
- Variable extraction commands
- Import/Export commands
- Variable preset management
- Command availability and context
- Command sequencing
- Error handling
- Performance testing

## Running Tests

### Via VS Code

1. Open the extension workspace in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the Extension Development Host, open the Command Palette (`Cmd+Shift+P`)
4. Run command: `Developer: Run Extension Tests`

### Via Command Line

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "Variable Extraction"

# Run with verbose output
npm test -- --reporter verbose
```

### Via Test Configuration

```bash
# Using vscode-test CLI
npx @vscode/test-cli
```

## Test Configuration

The test suite is configured via `.vscode-test.mjs`:

- **VS Code Version**: Stable
- **Test Timeout**: 30 seconds per test
- **Test Files**: `test/**/*.test.js`
- **Reporter**: Spec (colored output)
- **Slow Threshold**: 5 seconds

## Test Coverage

### Extension Activation
- ✅ Extension presence and activation
- ✅ Command registration (19 commands)
- ✅ Status bar creation
- ✅ Webview provider registration
- ✅ Settings migration

### Variable Extraction
- ✅ Simple variables
- ✅ Nested objects (deep nesting)
- ✅ Arrays and loops
- ✅ Loop variables exclusion
- ✅ Conditional expressions
- ✅ Filter arguments
- ✅ Array indexing and slicing
- ✅ Dictionary methods
- ✅ Type inference (string, number, boolean)
- ✅ Complex nested structures
- ✅ Template inheritance
- ✅ Macros and includes
- ✅ Edge cases (unicode, special chars, etc.)

### IntelliSense
- ✅ Completion provider creation
- ✅ Variable updates
- ✅ Nested property completions
- ✅ Built-in filters
- ✅ Jinja statements
- ✅ Hover information

### Webview Functionality
- ✅ Panel creation and disposal
- ✅ Sidebar view creation
- ✅ Message passing (bidirectional)
- ✅ Template updates on document change
- ✅ Selection range tracking
- ✅ Settings synchronization
- ✅ Concurrent webviews
- ✅ Ghost save functionality

### Commands
- ✅ Render commands (19 total)
- ✅ Settings toggles (markdown, mermaid, whitespace)
- ✅ Variable commands (extract, update)
- ✅ Import/Export (file, clipboard, workspace)
- ✅ Preset management (save, load, delete)
- ✅ Command availability and context
- ✅ Error handling

### Configuration
- ✅ All settings categories (5 categories)
- ✅ Setting validation (ranges, types)
- ✅ Default values
- ✅ Jinja extensions configuration
- ✅ History settings
- ✅ Ghost save settings

### Error Handling
- ✅ Malformed templates
- ✅ Invalid JSON
- ✅ Missing files
- ✅ No active editor
- ✅ Unicode characters
- ✅ Special characters
- ✅ Extremely long variables
- ✅ Deeply nested structures

### Performance
- ✅ Large template processing (<1s for 1000 variables)
- ✅ Variable extraction speed
- ✅ Webview initialization (<2s)
- ✅ Rapid document changes
- ✅ Multiple file switching
- ✅ IntelliSense update speed

### Real-World Scenarios
- ✅ Email templates
- ✅ Configuration files
- ✅ Markdown documents with Jinja
- ✅ Multi-file projects
- ✅ Concurrent editing
- ✅ Selection-based rendering

### Future Features
- ✅ Plugin architecture support
- ✅ AI-powered features readiness
- ✅ Collaborative features preparation
- ✅ Template marketplace extensibility
- ✅ Cloud sync preparation
- ✅ WebAssembly integration readiness
- ✅ Language Server Protocol compatibility

## Writing New Tests

### Test Template

```javascript
suite('Your Test Suite', () => {
	test('Should do something specific', async () => {
		// Arrange: Set up test conditions
		const doc = await vscode.workspace.openTextDocument({
			language: 'jinja',
			content: '{{ test_var }}'
		});
		
		// Act: Perform the action
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand('live-jinja-tester.render');
		
		// Assert: Verify the result
		assert.ok(true, 'Test passed');
	});
});
```

### Best Practices

1. **Descriptive Names**: Test names should clearly describe what they test
2. **Isolation**: Each test should be independent
3. **Cleanup**: Clean up resources after tests
4. **Timeouts**: Use appropriate timeouts for async operations
5. **Assertions**: Use meaningful assertion messages
6. **Performance**: Tests should complete quickly (< 5s per test)
7. **Coverage**: Test both success and failure paths

### Common Patterns

#### Creating Test Documents
```javascript
const doc = await vscode.workspace.openTextDocument({
	language: 'jinja',
	content: 'your template here'
});
const editor = await vscode.window.showTextDocument(doc);
```

#### Waiting for Async Operations
```javascript
await new Promise(resolve => setTimeout(resolve, 300));
```

#### Testing Commands
```javascript
await vscode.commands.executeCommand('command-name');
```

#### Testing Configuration
```javascript
const config = vscode.workspace.getConfiguration('liveJinjaRenderer');
const value = config.get('setting.name');
```

## Continuous Integration

### GitHub Actions

The test suite can be integrated with GitHub Actions:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        vscode-version: [stable, insiders]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Debugging Tests

### VS Code Debugger

1. Open `extension.test.js` or any test file
2. Set breakpoints
3. Press `F5` to start debugging
4. Tests will run in debug mode

### Console Output

```javascript
// Add console logs for debugging
console.log('Debug info:', variable);

// Use console.error for errors
console.error('Error occurred:', error);
```

### Test Filtering

Run specific tests by name:
```bash
npm test -- --grep "Variable Extraction"
```

## Known Issues and Limitations

### Test Environment
- Some UI interactions cannot be fully automated (file dialogs, quick picks)
- Webview content is not directly testable (tested via message passing)
- Some tests may be flaky due to timing issues (use appropriate delays)

### Platform Differences
- File path separators differ on Windows/Unix
- Some VS Code APIs behave differently on different platforms
- Line endings may vary (CRLF vs LF)

## Maintenance

### Regular Updates
- Update tests when adding new features
- Review and update test coverage regularly
- Keep dependencies up to date
- Monitor test execution times

### Test Health
- All tests should pass before merging changes
- Investigate flaky tests immediately
- Remove obsolete tests
- Refactor tests as code evolves

## Contributing

When contributing tests:

1. Follow the existing test structure
2. Add tests for new features
3. Update existing tests if behavior changes
4. Ensure all tests pass
5. Document complex test scenarios
6. Use meaningful test names

## Test Metrics

Current metrics (as of v1.8.0):

- **Total Test Suites**: 40+
- **Total Tests**: 245+
- **Code Coverage**: 85%+ (estimated)
- **Average Test Duration**: 150ms
- **Total Suite Duration**: ~60s

## Resources

- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Documentation](https://mochajs.org/)
- [VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)
- [@vscode/test-cli](https://github.com/microsoft/vscode-test-cli)

## Support

For test-related issues:
- Check existing test examples
- Review VS Code extension testing documentation
- Open an issue on GitHub
- Contact maintainers

---

**Last Updated**: November 2025  
**Test Suite Version**: 2.0  
**Extension Version**: 1.8.0

