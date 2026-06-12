import {
  defaultProcessCommandTimeoutMilliseconds,
  defaultProcessErrorOutputPreviewCharacterLimit,
  runProcessCommand,
  SelfHostedEditorProcessCommandError,
} from "./SelfHostedEditorProcessBridge.js";

assertEqual(defaultProcessCommandTimeoutMilliseconds, 30000, "default process command timeout");
assertEqual(defaultProcessErrorOutputPreviewCharacterLimit, 4000, "default process error output preview limit");

const success = await runProcessCommand({
  args: ["-e", "process.stdout.write('ok'); process.stderr.write('note');"],
  command: process.execPath,
}, "process bridge success contract", {
  timeoutMilliseconds: 1000,
});
assertEqual(success.stdout, "ok", "successful process stdout");
assertEqual(success.stderr, "note", "successful process stderr");

let failedError = null;
try {
  await runProcessCommand({
    args: [
      "-e",
      [
        "process.stdout.write('stdout-' + 'x'.repeat(80));",
        "process.stderr.write('stderr-' + 'y'.repeat(80));",
        "process.exit(7);",
      ].join(""),
    ],
    command: process.execPath,
  }, "process bridge failure contract", {
    outputPreviewCharacterLimit: 24,
    timeoutMilliseconds: 1000,
  });
} catch (error) {
  failedError = error;
}

assertProcessError(failedError, "process bridge failure contract", false);
assertEqual(failedError.details.exitCode, 7, "failed process exit code");
assertEqual(failedError.details.stderr.truncated, true, "failed process stderr preview should be truncated");
assertEqual(failedError.details.stdout.truncated, true, "failed process stdout preview should be truncated");
assertIncludes(failedError.message, "exit code 7", "failed process message should expose exit code");
assertNotIncludes(failedError.message, "y".repeat(60), "failed process message should not expose full stderr");

let timedOutError = null;
try {
  await runProcessCommand({
    args: ["-e", "process.stdout.write('started'); setTimeout(() => {}, 5000);"],
    command: process.execPath,
  }, "process bridge timeout contract", {
    outputPreviewCharacterLimit: 24,
    timeoutMilliseconds: 50,
  });
} catch (error) {
  timedOutError = error;
}

assertProcessError(timedOutError, "process bridge timeout contract", true);
assertEqual(timedOutError.details.exitCode, null, "timed out process exit code");
assertEqual(timedOutError.details.stdout.text, "started", "timed out process stdout preview");
assertIncludes(timedOutError.message, "timed out", "timed out process message");

console.log("SelfHostedEditor process bridge contract ok");

function assertProcessError(error, label, timedOut) {
  assertEqual(error instanceof SelfHostedEditorProcessCommandError, true, `${label} error type`);
  assertEqual(error.details?.format, "inscape.self-hosted-editor.process-error", `${label} details format`);
  assertEqual(error.details?.formatVersion, 1, `${label} details formatVersion`);
  assertEqual(error.details?.label, label, `${label} details label`);
  assertEqual(error.details?.timedOut, timedOut, `${label} timedOut`);
  assertTruthy(error.details?.durationMilliseconds >= 0, `${label} duration`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!String(text || "").includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(text)} to include ${JSON.stringify(expected)}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (String(text || "").includes(unexpected)) {
    throw new Error(`${label}: expected ${JSON.stringify(text)} not to include ${JSON.stringify(unexpected)}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}: expected a truthy value.`);
  }
}
