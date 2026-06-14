import {
  clearSelfHostedEditorSessionCaches,
  createSelfHostedEditorSessionCacheStore,
  getLineMapSessionState,
  getRuntimeSessionState,
  getSelfHostedEditorSessionCacheStatus,
  rememberLineMapSessionState,
  rememberRuntimeSessionState,
  resolveExistingLocalizationBaseline,
} from "./SelfHostedEditorSessionBridge.js";

function main() {
  assertCustomStoreLifecycle();
  assertSharedSessionCaches();
  console.log("SelfHostedEditor session cache contract ok");
}

function assertCustomStoreLifecycle() {
  let now = 1000;
  const store = createSelfHostedEditorSessionCacheStore("contract", {
    maximumEntries: 2,
    now: () => now,
    ttlMilliseconds: 50,
  });

  store.remember("first", { value: "first" });
  now += 10;
  store.remember("second", { value: "second" });
  now += 10;
  assertEqual(store.get("first")?.value, "first", "custom cache should return a stored value");
  now += 10;
  store.remember("third", { value: "third" });

  const boundedStatus = store.status();
  assertEqual(boundedStatus.entryCount, 2, "custom cache should stay within capacity");
  assertEqual(boundedStatus.maximumEntries, 2, "custom cache should report capacity");
  assertEqual(boundedStatus.capacityEvictionCount, 1, "custom cache should report capacity eviction");
  assertEqual(store.get("second"), null, "custom cache should evict the least recently accessed entry");
  assertTruthy(store.get("first"), "custom cache should keep the recently accessed entry");
  assertTruthy(store.get("third"), "custom cache should keep the newest entry");

  now += 60;
  const expiredStatus = store.status();
  assertEqual(expiredStatus.entryCount, 0, "custom cache should expire idle entries");
  assertEqual(expiredStatus.expiredEvictionCount, 2, "custom cache should report TTL eviction");
}

function assertSharedSessionCaches() {
  clearSelfHostedEditorSessionCaches();

  rememberRuntimeSessionState({ state: { currentNodeName: "Opening" } }, "runtime contract");
  rememberLineMapSessionState({ lineMap: { format: "inscape.localization-line-map" } }, "line map contract");
  resolveExistingLocalizationBaseline("anchor,text\n", "localization contract");

  assertEqual(getRuntimeSessionState("runtime contract")?.state?.currentNodeName, "Opening", "runtime cache readback");
  assertEqual(getLineMapSessionState("line map contract")?.format, "inscape.localization-line-map", "line-map cache readback");

  const status = getSelfHostedEditorSessionCacheStatus();
  assertEqual(status?.format, "inscape.self-hosted-editor.session-cache-status", "session cache status format");
  assertEqual(status?.formatVersion, 1, "session cache status version");
  assertEqual(status.languageSession?.kind, "process-per-request", "default language session kind");
  assertEqual(
    status.languageSession?.supportedEndpoints?.join(","),
    "diagnostics,completions,definition,references,hover,document-symbols",
    "default language session endpoints"
  );
  assertCacheStatus(status.caches?.runtime, "runtime", "runtime-contract");
  assertCacheStatus(status.caches?.lineMap, "line-map", "line-map-contract");
  assertCacheStatus(status.caches?.localizationBaseline, "localization-baseline", "localization-contract");

  const previousLanguageSessionMode = process.env.SELF_HOSTED_EDITOR_LANGUAGE_SESSION;
  process.env.SELF_HOSTED_EDITOR_LANGUAGE_SESSION = "stdio";
  try {
    const stdioStatus = getSelfHostedEditorSessionCacheStatus();
    assertEqual(stdioStatus.languageSession?.kind, "stdio-spike", "stdio language session kind");
    assertEqual(
      stdioStatus.languageSession?.supportedEndpoints?.join(","),
      "diagnostics,document-symbols",
      "stdio language session supported endpoints"
    );
    assertEqual(
      stdioStatus.languageSession?.fallbackEndpoints?.join(","),
      "completions,definition,references,hover",
      "stdio language session fallback endpoints"
    );
  } finally {
    if (previousLanguageSessionMode === undefined) {
      delete process.env.SELF_HOSTED_EDITOR_LANGUAGE_SESSION;
    } else {
      process.env.SELF_HOSTED_EDITOR_LANGUAGE_SESSION = previousLanguageSessionMode;
    }
  }

  clearSelfHostedEditorSessionCaches();
}

function assertCacheStatus(cacheStatus, kind, expectedSessionId) {
  assertEqual(cacheStatus?.kind, kind, `${kind} status kind`);
  assertEqual(cacheStatus?.entryCount, 1, `${kind} entry count`);
  assertEqual(cacheStatus?.maximumEntries, 64, `${kind} default capacity`);
  assertTruthy(cacheStatus?.ttlMilliseconds > 0, `${kind} TTL`);
  assertTruthy(cacheStatus?.totalByteLength > 0, `${kind} byte length`);
  const entry = cacheStatus?.entries?.[0] || {};
  assertEqual(entry.sessionId, expectedSessionId, `${kind} normalized session id`);
  assertTruthy(!Object.hasOwn(entry, "value"), `${kind} status should not expose cached values`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}: expected a truthy value.`);
  }
}

main();
