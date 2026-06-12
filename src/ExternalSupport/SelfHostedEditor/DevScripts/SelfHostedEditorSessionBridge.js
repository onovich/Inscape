import { Buffer } from "node:buffer";

const defaultLocalizationSessionId = "default";
const defaultLineMapSessionId = "default";
const defaultRuntimeSessionId = "default";
const localizationBaselineStates = new Map();
const lineMapSessionStates = new Map();
const runtimeSessionStates = new Map();

export function getRuntimeSessionState(sessionId) {
  return runtimeSessionStates.get(normalizeRuntimeSessionId(sessionId)) || null;
}

export function rememberRuntimeSessionState(snapshot, sessionId) {
  const normalizedSessionId = normalizeRuntimeSessionId(sessionId);
  if (snapshot) {
    runtimeSessionStates.set(normalizedSessionId, snapshot);
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
    lineMapSessionStates.set(normalizedSessionId, payload.lineMap);
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
    localizationBaselineStates.set(normalizedSessionId, csv);
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

function normalizeSessionId(sessionId, defaultSessionId) {
  const normalized = String(sessionId || defaultSessionId).trim();
  if (!normalized) {
    return defaultSessionId;
  }

  const safe = normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120);
  return safe || defaultSessionId;
}
