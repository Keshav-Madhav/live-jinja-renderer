# Test Suite Documentation

## Overview

This directory contains comprehensive tests for the Live Jinja Renderer VS Code extension. The test suite covers all aspects of the extension including variable extraction, IntelliSense, commands, settings, and real-world usage scenarios.

## Test Structure

```
test/
├── extension.test.js           # Main extension tests (activation, commands, settings)
├── variableExtractor.test.js   # Specialized variable extraction tests
├── commands.test.js            # Command execution and integration tests
├── integration.test.js         # End-to-end integration tests
├── fixtures/
│   └── sample-templates.js     # Reusable test templates
└── TEST_README.md             # This file
```

## Test Categories

### 1. Extension Activation Tests (`extension.test.js`)
- Extension loading and initialization
- Command registration
- Status bar creation
- Webview provider registration
- Basic functionality verification

### 2. Variable Extraction Tests (`variableExtractor.test.js`)
Comprehensive tests for the variable extraction engine:
- **Basic Extraction**: Simple variables, nested objects, arrays
- **Type Inference**: String, number, boolean type detection
- **Loop Constructs**: for loops, nested loops, loop variables
- **Conditionals**: if/elif/else, ternary operators, complex expressions
- **Filters**: Filter chains, filter arguments, variable filters
- **Advanced Features**: Macros, template inheritance, includes
- **Edge Cases**: Malformed syntax, unicode, special characters
- **Performance**: Large templates, many variables, deep nesting

### 3. Command Tests (`commands.test.js`)
Tests for all VS Code commands:
- View commands (showSidebar, render, openInPanel)
- Toggle commands (markdown, mermaid, whitespace)
- Variable commands (extract, save, load, delete)
- Import/Export commands
- Settings commands
- Error handling
- Keyboard shortcuts
- Menu contributions

### 4. Integration Tests (`integration.test.js`)
End-to-end workflow tests:
- **User Workflows**: Complete usage scenarios from file open to rendering
- **Real-World Templates**: Email templates, config files, reports, Ansible playbooks
- **Feature Integration**: IntelliSense, syntax highlighting, error navigation
- **Multi-File Management**: Context switching, file history
- **Performance**: Load testing, rapid operations
- **Error Recovery**: Graceful degradation, edge cases

### 5. IntelliSense Tests (`extension.test.js`)
- Completion provider registration
- Variable updates
- File type associations
- Trigger characters

### 6. Settings Tests (`extension.test.js`)
- Default values
- Setting categories
- Value ranges
- Configuration updates

## Running Tests

### Using VS Code

1. Open the extension project in VS Code
2. Press `F5` to open Extension Development Host
3. In the Extension Development Host, press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
4. Type "Test: Run All Tests"
5. View results in the Test Explorer

### Using Command Line

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "Variable Extraction"

# Run with coverage
npm test -- --coverage
```

### Using NPM Scripts

```bash
# Lint and test
npm run pretest

# Run tests only
npm run test
```

## Test Fixtures

The `fixtures/sample-templates.js` file contains reusable Jinja templates for testing:

- **Basic Templates**: Simple variables, greetings
- **Loop Templates**: Various loop constructs
- **Conditional Templates**: If/elif/else statements
- **Filter Templates**: Filter chains and arguments
- **Real-World Templates**: Email templates, configuration files, reports
- **Edge Cases**: Empty templates, comments, raw blocks
- **Advanced Features**: Macros, inheritance, includes

## Test Coverage

### Current Coverage Areas

✅ **Variable Extraction** (90+ tests)
- Simple variables
- Nested objects (10+ levels deep)
- Arrays and loops
- Type inference
- Filter chains
- Conditional expressions
- Edge cases and malformed input

✅ **Command Execution** (40+ tests)
- All 19 commands tested
- Error handling
- Rapid execution
- Context conditions

✅ **Integration** (30+ tests)
- Complete workflows
- Real-world scenarios
- Performance under load
- Multi-file handling

✅ **Settings** (20+ tests)
- All configuration options
- Default values
- Value validation
- Update mechanisms

### Test Statistics

- **Total Tests**: 180+
- **Test Files**: 4
- **Test Suites**: 40+
- **Sample Templates**: 25+
- **Coverage**: Comprehensive

## Writing New Tests

### Test Template

```javascript
suite('Feature Name', () => {
	test('Should do something specific', async () => {
		// Arrange: Set up test data
		const template = '{{ variable }}';
		
		// Act: Execute the functionality
		const result = extractVariablesFromTemplate(template);
		
		// Assert: Verify expectations
		assert.ok(result.variable !== undefined);
	});
});
```

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
2. **Single Responsibility**: Each test should test one thing
3. **Arrange-Act-Assert**: Follow the AAA pattern
4. **Async Handling**: Use async/await for asynchronous operations
5. **Cleanup**: Clean up resources after tests
6. **Isolation**: Tests should not depend on each other
7. **Error Cases**: Test both success and failure scenarios

### Adding Sample Templates

To add new test templates, update `fixtures/sample-templates.js`:

```javascript
newTemplate: {
	template: '{{ your_template }}',
	expectedVars: ['your_variable'],
	description: 'Description of what this template tests'
}
```

## Future Test Additions

### Planned Test Categories

- [ ] **Webview Communication Tests**: Message passing between extension and webview
- [ ] **Ghost Save Tests**: Auto-save and restore functionality
- [ ] **File History Tests**: History tracking and navigation
- [ ] **Selection Rendering Tests**: Partial file rendering
- [ ] **Extension Loading Tests**: Jinja2 extension activation
- [ ] **Performance Benchmarks**: Detailed performance metrics
- [ ] **UI Tests**: Visual testing with screenshots
- [ ] **Accessibility Tests**: Screen reader compatibility

### Future Feature Tests

- [ ] **Custom Jinja Extensions**: User-defined extensions
- [ ] **Multi-Workspace Support**: Multiple workspace folders
- [ ] **Remote Development**: Test in remote scenarios
- [ ] **Language Server Protocol**: LSP integration
- [ ] **WebAssembly Integration**: WASM-based rendering
- [ ] **Collaborative Editing**: Multiple users
- [ ] **Template Debugging**: Breakpoints and stepping
- [ ] **Variable Validation**: Schema validation

## Continuous Integration

### GitHub Actions Configuration

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        vscode-version: ['stable', 'insiders']
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

## Debugging Tests

### VS Code Debugging

1. Set breakpoints in test files
2. Open Debug view (`Ctrl+Shift+D`)
3. Select "Extension Tests" configuration
4. Press `F5` to start debugging

### Console Output

Tests use console output for debugging:
- `console.log()` for general information
- `console.error()` for errors
- `vscode.window.showInformationMessage()` for VS Code notifications

## Test Maintenance

### Regular Tasks

1. **Update Tests**: When adding new features, add corresponding tests
2. **Review Coverage**: Ensure new code is covered by tests
3. **Fix Flaky Tests**: Address intermittent failures
4. **Performance Check**: Monitor test execution time
5. **Documentation**: Keep this README updated

### Deprecation

When deprecating features:
1. Mark tests as deprecated with comments
2. Keep tests for backward compatibility
3. Remove tests when feature is fully removed

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
- **Solution**: Increase timeout in test configuration
- **Cause**: Slow operations or infinite loops

**Issue**: Extension not activating
- **Solution**: Check activation events in package.json
- **Cause**: Missing activation events

**Issue**: Commands not found
- **Solution**: Verify command registration in extension.js
- **Cause**: Command IDs mismatch

**Issue**: Settings not updating
- **Solution**: Check configuration target (Global vs Workspace)
- **Cause**: Configuration scope issues

### Getting Help

- Check VS Code Extension Testing docs: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Review existing tests for examples
- Open an issue on GitHub for test failures

## Contributing Tests

When contributing tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include comments explaining complex logic
4. Test both success and failure scenarios
5. Update this README if adding new test categories
6. Ensure all tests pass before submitting PR

## Resources

- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Test Framework](https://mochajs.org/)
- [VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)
- [Extension Development Best Practices](https://code.visualstudio.com/api/references/extension-guidelines)

---

**Last Updated**: November 2025  
**Test Suite Version**: 1.0  
**Extension Version**: 1.8.0

