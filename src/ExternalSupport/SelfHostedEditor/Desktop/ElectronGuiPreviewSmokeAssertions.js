export const SelfHostedEditorElectronGuiPreviewSmokeDefaults = Object.freeze({
  expectedInitialText: "\u6cd5\u5ead\u91cc\u5f88\u5b89\u9759",
  expectedInitialTitle: "\u6cd5\u5ead\u5f00\u573a",
  expectedTargetText: "\u8bc1\u7269\u888b\u91cc\u53ea\u6709",
  expectedTargetTitle: "\u8bc1\u7269\u684c",
  targetChoiceText: "\u67e5\u770b\u8bc1\u7269",
});

const allowedPreviewProviders = new Set([
  "compiler-project",
  "offline-draft",
  "runtime",
]);

export async function assertSelfHostedEditorElectronGuiPreview(browserWindow, options = {}) {
  const config = {
    ...SelfHostedEditorElectronGuiPreviewSmokeDefaults,
    ...options,
  };
  const label = config.label || "Electron GUI Preview smoke";

  const initialState = await waitForPreviewState(browserWindow, {
    choiceText: config.targetChoiceText,
    expectedText: config.expectedInitialText,
    expectedTitle: config.expectedInitialTitle,
    label: `${label} initial render`,
  });
  assertAllowedPreviewProvider(initialState.provider, `${label} initial provider`);
  await waitForWorkbenchReady(browserWindow, label);

  const clickResult = await invokeRendererJavaScript(
    browserWindow,
    `(() => {
      const choiceText = ${JSON.stringify(config.targetChoiceText)};
      const preview = document.querySelector(".story-preview");
      const buttons = Array.from(preview?.querySelectorAll(".choice-button") || []);
      const button = buttons.find((candidate) => candidate.textContent.includes(choiceText));
      if (!button) {
        return {
          buttonCount: buttons.length,
          clicked: false,
          previewText: preview?.textContent || "",
        };
      }

      const buttonText = button.textContent.trim();
      button.click();
      return {
        buttonText,
        clicked: true,
      };
    })()`,
    `${label} choice click`
  );
  assertEqual(clickResult.clicked, true, `${label} clicked target Preview choice`);

  const targetState = await waitForPreviewState(browserWindow, {
    expectedText: config.expectedTargetText,
    expectedTitle: config.expectedTargetTitle,
    label: `${label} target render`,
  });
  assertAllowedPreviewProvider(targetState.provider, `${label} target provider`);

  const revealState = await waitForEditorTitleReveal(browserWindow, {
    label,
    targetTitle: config.expectedTargetTitle,
  });

  return {
    choiceText: clickResult.buttonText || "",
    initialProvider: initialState.provider,
    targetProvider: targetState.provider,
    targetSourceLine: revealState.sourceLine,
    targetTitle: targetState.title,
  };
}

async function waitForPreviewState(browserWindow, expectation = {}) {
  let lastState = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    lastState = await readPreviewState(browserWindow, expectation.label);
    if (matchesPreviewExpectation(lastState, expectation)) {
      return lastState;
    }

    await delay(50);
  }

  throw new Error(`${expectation.label || "Preview state"} did not match expectation: ${JSON.stringify(lastState)}`);
}

async function readPreviewState(browserWindow, label = "Preview state") {
  return await invokeRendererJavaScript(
    browserWindow,
    `(() => {
      const preview = document.querySelector(".story-preview");
      if (!preview) {
        return {
          choices: [],
          exists: false,
          provider: "",
          state: "",
          text: "",
          title: "",
        };
      }

      const choices = Array.from(preview.querySelectorAll(".choice-button")).map((button) => ({
        target: button.querySelector(".choice-target")?.textContent?.trim() || "",
        text: button.querySelector(".choice-text")?.textContent?.trim() || "",
      }));
      return {
        choices,
        exists: true,
        provider: preview.dataset.previewProvider || "",
        state: preview.dataset.previewState || "",
        text: preview.textContent || "",
        title: preview.querySelector(".story-title")?.textContent?.trim() || "",
      };
    })()`,
    label
  );
}

async function waitForWorkbenchReady(browserWindow, label) {
  let lastReadyState = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    lastReadyState = await invokeRendererJavaScript(
      browserWindow,
      `(() => ({
        activeSourceLine: Number(document.querySelector(".script-editor")?.dataset.activeSourceLine || 0),
        ready: document.querySelector(".app-shell")?.dataset.workbenchReady === "true",
      }))()`,
      `${label} Workbench ready`
    );
    if (lastReadyState.ready && lastReadyState.activeSourceLine > 0) {
      return;
    }

    await delay(50);
  }

  throw new Error(`${label} Workbench was not ready for Preview interaction: ${JSON.stringify(lastReadyState)}`);
}

function matchesPreviewExpectation(state, expectation) {
  if (!state?.exists || state.state === "error") {
    return false;
  }

  if (expectation.expectedTitle && state.title !== expectation.expectedTitle) {
    return false;
  }

  if (expectation.expectedText && !String(state.text || "").includes(expectation.expectedText)) {
    return false;
  }

  if (expectation.choiceText && !state.choices.some((choice) =>
    `${choice.text} ${choice.target}`.includes(expectation.choiceText))) {
    return false;
  }

  return true;
}

async function waitForEditorTitleReveal(browserWindow, { label, targetTitle }) {
  let lastState = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    lastState = await invokeRendererJavaScript(
      browserWindow,
      `(() => {
        const targetTitle = ${JSON.stringify(targetTitle)};
        const model = globalThis.monaco?.editor?.getModels?.()[0] || null;
        const matches = model?.findMatches?.(
          "# " + targetTitle,
          false,
          false,
          false,
          null,
          true
        ) || [];
        const sourceLine = Number(matches[0]?.range?.startLineNumber || 0);
        const titleHost = sourceLine > 0
          ? document.querySelector('.hint-line-title-host[data-source-line="' + sourceLine + '"]')
          : null;
        const visibleEditorText = Array.from(
          document.querySelectorAll(".script-editor .view-lines .view-line")
        ).map((line) => line.textContent || "").join("\\n");
        return {
          active: Boolean(titleHost?.closest(".hint-line")?.classList.contains("is-active")),
          activeSourceLine: Number(document.querySelector(".script-editor")?.dataset.activeSourceLine || 0),
          lineText: sourceLine > 0 ? model?.getLineContent?.(sourceLine) || "" : "",
          sourceLine,
          titleHostExists: Boolean(titleHost),
          visible: visibleEditorText.includes("# " + targetTitle),
        };
      })()`,
      `${label} editor reveal`
    );
    if (
      (
        lastState.active
        || lastState.visible
        || lastState.activeSourceLine === lastState.sourceLine
      )
      && lastState.lineText.includes(targetTitle)
    ) {
      return lastState;
    }

    await delay(50);
  }

  throw new Error(`${label} did not reveal Preview target in editor: ${JSON.stringify(lastState)}`);
}

function assertAllowedPreviewProvider(provider, label) {
  if (!allowedPreviewProviders.has(provider)) {
    throw new Error(`${label}: unexpected Preview provider ${String(provider || "")}`);
  }
}

async function invokeRendererJavaScript(browserWindow, script, label) {
  return await withTimeout(
    browserWindow.webContents.executeJavaScript(script),
    label
  );
}

async function withTimeout(promise, label, timeoutMs = 5000) {
  let timeout = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Electron GUI Preview smoke timed out during ${label}.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
