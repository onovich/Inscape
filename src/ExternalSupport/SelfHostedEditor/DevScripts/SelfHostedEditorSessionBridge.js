import { Buffer } from "node:buffer";

const defaultLocalizationSessionId = "default";
const defaultLineMapSessionId = "default";
const defaultRuntimeSessionId = "default";
const defaultSessionCacheTtlMilliseconds = 2 * 60 * 60 * 1000;
const defaultMaximumSessionCacheEntries = 64;
const localizationBaselineStates = createSelfHostedEditorSessionCacheStore("localization-baseline", {
  estimateByteLength: estimateTextByteLength,
});
const lineMapSessionStates = createSelfHostedEditorSessionCacheStore("line-map");
const runtimeSessionStates = createSelfHostedEditorSessionCacheStore("runtime");

export function createSelfHostedEditorSessionCacheStore(kind, options = {}) {
  const records = new Map();
  const ttlMilliseconds = normalizePositiveInteger(options.ttlMilliseconds, defaultSessionCacheTtlMilliseconds);
  const maximumEntries = normalizePositiveInteger(options.maximumEntries, defaultMaximumSessionCacheEntries);
  const estimateByteLength = typeof options.estimateByteLength === "function"
    ? options.estimateByteLength
    : estimateJsonByteLength;
  const getNow = typeof options.now === "function"
    ? options.now
    : () => Date.now();
  const counters = {
    capacityEvictionCount: 0,
    expiredEvictionCount: 0,
  };

  function remember(sessionId, value) {
    const now = getNow();
    cleanupExpired(now);
    const existingRecord = records.get(sessionId);
    records.set(sessionId, {
      byteLength: estimateByteLength(value),
      createdAt: existingRecord?.createdAt || now,
      lastAccessedAt: now,
      sessionId,
      updatedAt: now,
      value,
    });
    evictOverflowEntries(now);
    return value;
  }

  function get(sessionId) {
    const now = getNow();
    cleanupExpired(now);
    const record = records.get(sessionId);
    if (!record) {
      return null;
    }

    record.lastAccessedAt = now;
    return record.value;
  }

  function status() {
    const now = getNow();
    cleanupExpired(now);
    return createSessionCacheStatus(kind, records, counters, {
      maximumEntries,
      now,
      ttlMilliseconds,
    });
  }

  function clear() {
    records.clear();
    counters.capacityEvictionCount = 0;
    counters.expiredEvictionCount = 0;
  }

  function cleanupExpired(now) {
    for (const [sessionId, record] of records) {
      if (now - record.lastAccessedAt > ttlMilliseconds) {
        records.delete(sessionId);
        counters.expiredEvictionCount += 1;
      }
    }
  }

  function evictOverflowEntries(now) {
    while (records.size > maximumEntries) {
      const oldestRecord = [...records.values()]
        .sort((left, right) =>
          left.lastAccessedAt - right.lastAccessedAt
          || left.createdAt - right.createdAt
          || left.sessionId.localeCompare(right.sessionId)
        )[0];
      if (!oldestRecord) {
        break;
      }

      records.delete(oldestRecord.sessionId);
      counters.capacityEvictionCount += 1;
    }

    cleanupExpired(now);
  }

  return {
    clear,
    get,
    remember,
    status,
  };
}

export function getRuntimeSessionState(sessionId) {
  return runtimeSessionStates.get(normalizeRuntimeSessionId(sessionId)) || null;
}

export function rememberRuntimeSessionState(snapshot, sessionId) {
  const normalizedSessionId = normalizeRuntimeSessionId(sessionId);
  if (snapshot) {
    runtimeSessionStates.remember(normalizedSessionId, snapshot);
  }

  return snapshot;
}

export function normalizeRuntimeSessionId(sessionId) {
  return normalizeSessionId(sessionId, defaultRuntimeSessionId);
}

export async function resolveLocalizationBaseline(previousCsv, sessionId, extractCurrentCsv) {
  const explicitCsv = String(previousCsv || "");
  const normalizedSessionId = normalizeLocalizationSessionId(sessionId);
  if (explicitCsv.trim()) {
    rememberLocalizationBaseline(explicitCsv, normalizedSessionId);
    return {
      csv: explicitCsv,
      metadata: createLocalizationBaselineMetadata("request", normalizedSessionId, explicitCsv),
    };
  }

  const sessionCsv = getLocalizationBaseline(normalizedSessionId);
  if (sessionCsv) {
    return {
      csv: sessionCsv,
      metadata: createLocalizationBaselineMetadata("session", normalizedSessionId, sessionCsv),
    };
  }

  const currentCsv = await extractCurrentCsv();
  return {
    csv: currentCsv,
    metadata: createLocalizationBaselineMetadata("current-extract", normalizedSessionId, currentCsv),
  };
}

export function resolveExistingLocalizationBaseline(previousCsv, sessionId) {
  const explicitCsv = String(previousCsv || "");
  const normalizedSessionId = normalizeLocalizationSessionId(sessionId);
  if (explicitCsv.trim()) {
    rememberLocalizationBaseline(explicitCsv, normalizedSessionId);
    return {
      csv: explicitCsv,
      metadata: createLocalizationBaselineMetadata("request", normalizedSessionId, explicitCsv),
    };
  }

  const sessionCsv = getLocalizationBaseline(normalizedSessionId);
  return {
    csv: sessionCsv || "",
    metadata: createLocalizationBaselineMetadata(sessionCsv ? "session" : "missing", normalizedSessionId, sessionCsv || ""),
  };
}

export function normalizeLocalizationSessionId(sessionId) {
  return normalizeSessionId(sessionId, defaultLocalizationSessionId);
}

export function getLineMapSessionState(sessionId) {
  return lineMapSessionStates.get(normalizeLineMapSessionId(sessionId)) || null;
}

export function rememberLineMapSessionState(payload, sessionId) {
  const normalizedSessionId = normalizeLineMapSessionId(sessionId);
  if (payload?.lineMap) {
    lineMapSessionStates.remember(normalizedSessionId, payload.lineMap);
  }

  return payload;
}

export function normalizeLineMapSessionId(sessionId) {
  return normalizeSessionId(sessionId, defaultLineMapSessionId);
}

function rememberLocalizationBaseline(previousCsv, sessionId) {
  const normalizedSessionId = normalizeLocalizationSessionId(sessionId);
  const csv = String(previousCsv || "");
  if (csv.trim()) {
    localizationBaselineStates.remember(normalizedSessionId, csv);
  }
}

function getLocalizationBaseline(sessionId) {
  return localizationBaselineStates.get(normalizeLocalizationSessionId(sessionId)) || "";
}

function createLocalizationBaselineMetadata(source, sessionId, csv) {
  return {
    byteLength: Buffer.byteLength(String(csv || ""), "utf8"),
    sessionId: normalizeLocalizationSessionId(sessionId),
    source,
  };
}

export function getSelfHostedEditorSessionCacheStatus() {
  return {
    caches: {
      lineMap: lineMapSessionStates.status(),
      localizationBaseline: localizationBaselineStates.status(),
      runtime: runtimeSessionStates.status(),
    },
    format: "inscape.self-hosted-editor.session-cache-status",
    formatVersion: 1,
  };
}

export function clearSelfHostedEditorSessionCaches() {
  lineMapSessionStates.clear();
  localizationBaselineStates.clear();
  runtimeSessionStates.clear();
}

function normalizeSessionId(sessionId, defaultSessionId) {
  const normalized = String(sessionId || defaultSessionId).trim();
  if (!normalized) {
    return defaultSessionId;
  }

  const safe = normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120);
  return safe || defaultSessionId;
}

function createSessionCacheStatus(kind, records, counters, options) {
  const entries = [...records.values()]
    .sort((left, right) =>
      right.lastAccessedAt - left.lastAccessedAt
      || right.updatedAt - left.updatedAt
      || left.sessionId.localeCompare(right.sessionId)
    )
    .map((record) => ({
      ageMilliseconds: Math.max(0, options.now - record.createdAt),
      byteLength: record.byteLength,
      idleMilliseconds: Math.max(0, options.now - record.lastAccessedAt),
      sessionId: record.sessionId,
      updatedAgeMilliseconds: Math.max(0, options.now - record.updatedAt),
    }));

  return {
    capacityEvictionCount: counters.capacityEvictionCount,
    entries,
    entryCount: entries.length,
    expiredEvictionCount: counters.expiredEvictionCount,
    kind,
    maximumEntries: options.maximumEntries,
    ttlMilliseconds: options.ttlMilliseconds,
    totalByteLength: entries.reduce((total, entry) => total + entry.byteLength, 0),
  };
}

function estimateJsonByteLength(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return 0;
  }
}

function estimateTextByteLength(value) {
  return Buffer.byteLength(String(value || ""), "utf8");
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
}
