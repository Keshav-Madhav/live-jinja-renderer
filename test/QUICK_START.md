# Quick Start Guide - Running Tests

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests

```bash
npm test
```

### 3. View Results

Tests will run automatically in the VS Code Extension Host, and results will be displayed in your terminal.

---

## 📋 Common Test Commands

### Run All Tests
```bash
npm test
```

### Run Tests with Linting
```bash
npm run pretest
```

### Run Specific Test Suite
```bash
# Variable extraction tests only
npm test -- --grep "Variable Extraction"

# Command tests only
npm test -- --grep "Command Tests"

# Integration tests only
npm test -- --grep "Integration Tests"
```

### Run Tests in VS Code

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. In the Extension Development Host window:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: "Test: Run All Tests"
   - Press Enter

---

## 🎯 What Gets Tested?

### ✅ Included in Tests

- **Extension Activation**: Loading, initialization, registration
- **Variable Extraction**: 90+ tests covering all Jinja syntax patterns
- **Commands**: All 19 commands tested
- **Settings**: All configuration options validated
- **IntelliSense**: Completion providers and hover
- **Integration**: Real-world workflows
- **Performance**: Large templates and rapid operations
- **Error Handling**: Malformed input and edge cases

---

## 📊 Expected Results

When tests pass successfully, you should see:

```
  Extension Test Suite
    Extension Activation
      ✓ Extension should be present and activatable
      ✓ Extension should register all commands
      ✓ Extension should create status bar item
      ...

  Variable Extractor - Specialized Tests
    Advanced Type Inference
      ✓ Should infer string from concatenation
      ✓ Should infer number from division
      ...

  Command Tests
    View Commands
      ✓ showSidebar command should focus sidebar view
      ...

  Integration Tests
    Complete User Workflows
      ✓ Workflow: Open file -> Extract variables -> Update view
      ...

  180 passing (25s)
```

---

## 🐛 Troubleshooting

### Tests Don't Run

**Problem**: `npm test` does nothing or errors

**Solution**:
1. Ensure dependencies are installed: `npm install`
2. Check Node.js version: `node --version` (should be 18+)
3. Try: `npm run pretest` to check for linting errors first

### Tests Timeout

**Problem**: Tests hang or timeout

**Solution**:
1. Close VS Code Extension Host windows
2. Kill any running VS Code processes
3. Run tests again

### Tests Fail

**Problem**: Some tests fail unexpectedly

**Solution**:
1. Check if extension is properly installed: `npm install`
2. Verify VS Code version: Should be 1.85.0 or higher
3. Try running specific failing test:
   ```bash
   npm test -- --grep "failing test name"
   ```
4. Check the error message for specific issues

### Extension Not Activating in Tests

**Problem**: Extension activation tests fail

**Solution**:
1. Check `package.json` for correct extension ID
2. Verify activation events are configured
3. Ensure extension is built: Check if `extension.js` exists

---

## 🔍 Debugging Tests

### Enable Verbose Output

Add to your test command:
```bash
npm test -- --verbose
```

### Debug Specific Test

1. Open test file in VS Code
2. Set breakpoint in the test
3. Press `F5` to start debugging
4. Select "Extension Tests" from debug dropdown
5. Test will pause at breakpoint

### View Console Logs

Tests use `console.log()` for debugging:
- Open Debug Console in VS Code
- Run tests with `F5`
- View output in Debug Console

---

## 📈 Understanding Test Output

### Test Structure

```
Suite Name
  Subsuite Name
    ✓ Test name (123ms)
    ✓ Another test (45ms)
    ✗ Failed test (234ms)
      Error: Expected true to be false
```

### Timing Information

- **Green time** (< 100ms): Fast test ✅
- **Yellow time** (100-5000ms): Slow test ⚠️
- **Red time** (> 5000ms): Very slow test ❌

### Pass/Fail Indicators

- ✓ **Passed**: Test succeeded
- ✗ **Failed**: Test failed with error message
- ⊘ **Skipped**: Test was skipped (if using `.skip()`)

---

## 🎓 Learning More

### Test File Locations

- `test/extension.test.js` - Main extension tests
- `test/variableExtractor.test.js` - Variable extraction tests
- `test/commands.test.js` - Command tests
- `test/integration.test.js` - Integration tests
- `test/helpers.js` - Test utilities

### Documentation

- [Test README](./TEST_README.md) - Detailed documentation
- [Test Summary](../TEST_SUMMARY.md) - Executive overview
- [Extension README](../README.md) - Extension documentation

### Sample Templates

Check `test/fixtures/sample-templates.js` for 25+ example templates used in tests.

---

## 💡 Tips for Test Development

### Running Single Test

Add `.only()` to run a single test:
```javascript
test.only('Should test specific thing', () => {
  // This test will run alone
});
```

### Skipping Tests

Add `.skip()` to temporarily skip a test:
```javascript
test.skip('Should test something later', () => {
  // This test will be skipped
});
```

### Adding Console Output

Use console.log for debugging:
```javascript
test('My test', () => {
  console.log('Debug info:', someVariable);
  assert.ok(true);
});
```

---

## ✅ Verification Checklist

Before committing changes, ensure:

- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Added tests for new features
- [ ] Updated test documentation if needed
- [ ] Tests run in < 30 seconds
- [ ] No console errors or warnings

---

## 🆘 Getting Help

### Still Having Issues?

1. **Check Documentation**: Read [TEST_README.md](./TEST_README.md)
2. **Review Code**: Look at existing tests for examples
3. **Check Issues**: Search GitHub issues for similar problems
4. **Ask for Help**: Open a new GitHub issue with:
   - Test output
   - Error messages
   - System information (OS, Node version, VS Code version)

### Useful Commands

```bash
# Check versions
node --version
npm --version
code --version

# Clean install
rm -rf node_modules package-lock.json
npm install

# View test configuration
cat .vscode-test.mjs

# List all tests without running
npm test -- --dry-run
```

---

## 🎉 Success!

If you see **"180 passing"** at the end of your test run, you're all set! 

The extension's test suite is working correctly and all functionality is verified.

---

**Need More Details?** Check [TEST_README.md](./TEST_README.md) for comprehensive documentation.

**Want an Overview?** See [TEST_SUMMARY.md](../TEST_SUMMARY.md) for test statistics and coverage.

