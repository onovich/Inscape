export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

export function assertIncludes(diagnostics, message) {
  if (!diagnostics.some((diagnostic) => diagnostic.message === message)) {
    throw new Error(`Expected diagnostic: ${message}`);
  }
}

export function assertIncludesText(text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}

export function assertNotIncludesText(text, unexpected) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected text not to include: ${unexpected}`);
  }
}

export function createHoverModel(text) {
  const lines = text.split(/\r?\n/);
  return {
    getLineContent(lineNumber) {
      return lines[lineNumber - 1] || "";
    },
  };
}

export function createWheelEvent(deltaY) {
  return {
    deltaY,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

export function createFakeMonaco(documentModel) {
  const text = documentModel.nodes
    .flatMap((node) => [`# ${node.title}`, ...node.lines.map((line) => line.text)])
    .join("\n");
  const lines = text.split(/\r?\n/);
  const fakeModel = {
    getLineCount: () => 5,
    getLineContent: (lineNumber) => lines[lineNumber - 1] || "",
    getLineMaxColumn: (lineNumber) => (lines[lineNumber - 1] || "").length + 1,
  };
  const fakeEditor = {
    deltaDecorations: (_oldDecorations, decorations) => decorations.map((_item, index) => `decoration-${index}`),
    getContentHeight: () => 180,
    getModel: () => fakeModel,
    getOption: () => 36,
    getScrollTop: () => 0,
    getTopForLineNumber: (lineNumber) => (lineNumber - 1) * 36,
    onDidChangeCursorPosition: () => {},
    onDidChangeModelContent: () => {},
    onDidContentSizeChange: () => {},
    onDidScrollChange: () => {},
    onMouseLeave: () => {},
    onMouseMove: () => {},
  };
  return {
    editor: {
      create: () => fakeEditor,
      createModel: () => fakeModel,
      defineTheme: () => {},
      EditorOption: {
        lineHeight: "lineHeight",
      },
    },
    Range: class {
      constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        this.startLineNumber = startLineNumber;
        this.startColumn = startColumn;
        this.endLineNumber = endLineNumber;
        this.endColumn = endColumn;
      }
    },
  };
}

export class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  createElementNS(_namespace, tagName) {
    return new FakeElement(tagName);
  }

  createTextNode(text) {
    return new FakeTextNode(text);
  }
}

export class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.style = {
      setProperty(name, value) {
        this[name] = value;
      },
    };
    this.textContent = "";
    this.type = "";
    this.scrollTop = 0;
    this.clientHeight = 100;
    this.scrollHeight = 100;
    this.eventHandlers = new Map();
    this.classList = {
      add: (...classNames) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const className of classNames) {
          classes.add(className);
        }
        this.className = Array.from(classes).join(" ");
      },
      remove: (...classNames) => {
        const removeSet = new Set(classNames);
        this.className = this.className
          .split(/\s+/)
          .filter((className) => className && !removeSet.has(className))
          .join(" ");
      },
      toggle: (className, force) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (force) {
          classes.add(className);
        } else {
          classes.delete(className);
        }

        this.className = Array.from(classes).join(" ");
      },
    };
  }

  addEventListener(type, handler) {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.push(handler);
    this.eventHandlers.set(type, handlers);
  }

  click() {
    const results = [];
    for (const handler of this.eventHandlers.get("click") || []) {
      results.push(handler({
        stopPropagation: () => {},
        target: this,
      }));
    }

    return Promise.all(results.filter((result) => result && typeof result.then === "function"));
  }

  closest(selector) {
    if (selector === "button" && this.tagName === "button") {
      return this;
    }

    return null;
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this[name] = String(value);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  removeAttribute(name) {
    delete this[name];
    if (name.startsWith("data-")) {
      delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())];
    }
  }

  querySelectorAll(selector) {
    const results = [];
    collectMatchingElements(this, selector, results);
    return results;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

export class FakeTextNode {
  constructor(text) {
    this.textContent = String(text);
    this.children = [];
  }
}

export function findElementByClass(element, className) {
  if (element.className?.split(/\s+/).includes(className)) {
    return element;
  }

  for (const child of element.children || []) {
    const match = findElementByClass(child, className);
    if (match) {
      return match;
    }
  }

  return null;
}

export function getTextContent(element) {
  if (!element) {
    return "";
  }

  return [
    element.textContent || "",
    ...(element.children || []).map((child) => getTextContent(child)),
  ].join("");
}

export function collectMatchingElements(element, selector, results) {
  if (matchesSelector(element, selector)) {
    results.push(element);
  }

  for (const child of element.children || []) {
    collectMatchingElements(child, selector, results);
  }
}

export function matchesSelector(element, selector) {
  if (selector === "[data-source-line]") {
    return Boolean(element.dataset?.sourceLine);
  }

  if (selector.startsWith(".")) {
    return element.className?.split(/\s+/).includes(selector.slice(1));
  }

  return false;
}


export function installFakeDomEnvironment(windowOverrides = {}) {
  globalThis.document = new FakeDocument();
  globalThis.window = {
    clearTimeout() {},
    setTimeout(handler) {
      handler();
      return 1;
    },
    ...windowOverrides,
  };

  return {
    document: globalThis.document,
    window: globalThis.window,
  };
}

