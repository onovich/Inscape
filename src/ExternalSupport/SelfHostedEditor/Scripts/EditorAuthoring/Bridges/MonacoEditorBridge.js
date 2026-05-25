const monacoBasePath = "../../node_modules/monaco-editor/min/vs";

export class MonacoEditorBridge {
  static load() {
    if (globalThis.monaco?.editor) {
      return Promise.resolve(globalThis.monaco);
    }

    if (!globalThis.require?.config) {
      return Promise.reject(new Error("Monaco AMD loader is not available."));
    }

    if (!MonacoEditorBridge.loadPromise) {
      globalThis.require.config({
        paths: {
          vs: monacoBasePath,
        },
      });

      MonacoEditorBridge.loadPromise = new Promise((resolve, reject) => {
        globalThis.require(["vs/editor/editor.main"], () => {
          resolve(globalThis.monaco);
        }, reject);
      });
    }

    return MonacoEditorBridge.loadPromise;
  }
}
