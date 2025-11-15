/**
 * Type declarations for VS Code webview global functions and libraries
 * These are loaded via script tags in the webview HTML
 */

/**
 * VS Code API function provided by the webview environment
 */
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  setState(state: any): void;
  getState(): any;
};

/**
 * Pyodide loader function
 */
declare function loadPyodide(options?: {
  indexURL?: string;
}): Promise<{
  loadPackage(packageName: string): Promise<void>;
  runPython(code: string): any;
}>;

/**
 * Mermaid diagram library
 */
declare const mermaid: {
  initialize(config: any): void;
  run(options: { querySelector: string }): Promise<void>;
};

/**
 * Marked markdown parser library
 */
declare const marked: {
  parse(markdown: string): string;
};
