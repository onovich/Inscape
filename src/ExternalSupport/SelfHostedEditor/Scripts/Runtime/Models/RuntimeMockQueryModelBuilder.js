export const RuntimeMockQueryAuthoringFormat = "inscape.self-hosted-editor.runtime-mock-query-authoring";
export const RuntimeMockQueryAuthoringFormatVersion = 1;

export class RuntimeMockQueryModelBuilder {
  static build({
    hostSchemaCatalog = null,
    mockEntries = [],
    sessionId = "",
    workspaceRevision = null,
  } = {}) {
    const catalog = normalizeHostSchemaCatalog(hostSchemaCatalog);
    const entries = normalizeMockEntries(mockEntries);
    const queriesByName = new Map(catalog.queries.map((query) => [query.name, query]));
    const entriesByName = groupMockEntries(entries.filter((entry) => queriesByName.has(entry.name)));
    const rows = [];
    const diagnostics = [];

    for (const query of catalog.queries) {
      const queryEntries = entriesByName.get(query.name) || [];
      if (!queryEntries.length) {
        const row = buildRow(query, null, rows.length);
        rows.push(row);
        diagnostics.push(...row.diagnostics);
        continue;
      }

      for (const entry of queryEntries) {
        const row = buildRow(query, entry, rows.length);
        rows.push(row);
        diagnostics.push(...row.diagnostics);
      }
    }

    const unknownQueries = entries
      .filter((entry) => !queriesByName.has(entry.name))
      .map((entry) => buildUnknownQuery(entry));

    for (const unknownQuery of unknownQueries) {
      diagnostics.push(...unknownQuery.diagnostics);
    }

    const readyRows = rows.filter((row) => row.state === "ready" && row.enabled);
    const runtimeQueryProvider = {
      kind: "Mock",
      mockValues: readyRows.map((row) => ({
        arguments: row.runtimeArguments,
        name: row.name,
        value: row.runtimeValue,
      })),
    };

    return {
      authoringOnly: true,
      contentPolicy: {
        excludes: [
          "workspace-text",
          "formal-runtime-state",
          "runtime-substate",
          "host-state",
        ],
        writesToRuntimeState: false,
      },
      diagnostics,
      format: RuntimeMockQueryAuthoringFormat,
      formatVersion: RuntimeMockQueryAuthoringFormatVersion,
      hostSchema: {
        errorMessageAvailable: Boolean(catalog.hostSchema.errorMessage),
        loaded: catalog.hostSchema.loaded,
        queryCount: catalog.queries.length,
        resolvedPath: catalog.hostSchema.resolvedPath,
      },
      invalidCount: rows.filter((row) => row.state === "invalid-value").length,
      missingCount: rows.filter((row) => row.state === "missing-value").length,
      payloadContentExposed: false,
      readyCount: readyRows.length,
      rows,
      runtimeQueryProvider,
      sessionId: formatSessionId(sessionId),
      unknownCount: unknownQueries.length,
      unknownQueries,
      unsupportedCount: rows.filter((row) => row.state === "unsupported-type").length,
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }
}

function buildRow(query, entry, index) {
  const valueKind = normalizeValueKind(query.returnType);
  const enabled = entry?.enabled !== false;
  const diagnostics = [];
  const parameterResults = buildParameterResults(query.parameters, entry);
  const valueResult = parseRuntimeValue(valueKind, entry, "value");
  let state = "ready";

  if (valueKind === "Unsupported" || parameterResults.some((parameter) => parameter.valueKind === "Unsupported")) {
    state = "unsupported-type";
    diagnostics.push(buildDiagnostic("mock-query-unsupported-type", query.name, query.returnType));
  } else if (!entry || !valueResult.hasValue || parameterResults.some((parameter) => !parameter.hasValue)) {
    state = "missing-value";
    diagnostics.push(buildDiagnostic("mock-query-missing-value", query.name, query.returnType));
  } else if (!valueResult.isValid || parameterResults.some((parameter) => !parameter.isValid)) {
    state = "invalid-value";
    diagnostics.push(buildDiagnostic("mock-query-invalid-value", query.name, query.returnType));
  }

  return {
    arguments: parameterResults.map((parameter) => ({
      idKind: parameter.idKind,
      index: parameter.index,
      name: parameter.name,
      state: parameter.state,
      type: parameter.type,
      valueKind: parameter.valueKind,
      valueLabel: parameter.valueLabel,
    })),
    diagnostics,
    enabled,
    isAsync: Boolean(query.isAsync),
    name: query.name,
    parameters: query.parameters.map((parameter, parameterIndex) => ({
      idKind: normalizeLabel(parameter.idKind, ""),
      index: parameterIndex,
      name: normalizeLabel(parameter.name, `argument${parameterIndex + 1}`),
      type: normalizeLabel(parameter.type, "string"),
    })),
    returnType: query.returnType,
    rowId: `${query.name}#${index + 1}`,
    runtimeArguments: state === "ready"
      ? parameterResults.map((parameter) => parameter.runtimeValue)
      : [],
    runtimeValue: state === "ready" ? valueResult.runtimeValue : null,
    source: {
      character: normalizeNonNegativeInteger(query.character, 0),
      length: normalizePositiveInteger(query.length, query.name.length || 1),
      line: normalizeNonNegativeInteger(query.line, 0),
      sourcePath: normalizeLabel(query.sourcePath, ""),
    },
    state,
    valueKind,
    valueLabel: valueResult.valueLabel,
  };
}

function buildParameterResults(parameters, entry) {
  const args = Array.isArray(entry?.arguments) ? entry.arguments : [];
  return parameters.map((parameter, index) => {
    const valueKind = normalizeValueKind(parameter.type || "string");
    const valueResult = parseRuntimeValue(valueKind, { value: args[index] }, "value");
    const state = valueKind === "Unsupported"
      ? "unsupported-type"
      : !valueResult.hasValue
        ? "missing-value"
        : valueResult.isValid
          ? "ready"
          : "invalid-value";

    return {
      hasValue: valueResult.hasValue,
      idKind: normalizeLabel(parameter.idKind, ""),
      index,
      isValid: valueResult.isValid && valueKind !== "Unsupported",
      name: normalizeLabel(parameter.name, `argument${index + 1}`),
      runtimeValue: valueResult.runtimeValue,
      state,
      type: normalizeLabel(parameter.type, "string"),
      valueKind,
      valueLabel: valueResult.valueLabel,
    };
  });
}

function buildUnknownQuery(entry) {
  return {
    diagnostics: [
      {
        code: "mock-query-unknown",
        queryName: entry.name,
        severity: "warning",
      },
    ],
    name: entry.name,
    state: "unknown-query",
  };
}

function buildDiagnostic(code, queryName, returnType) {
  return {
    code,
    queryName,
    returnType: normalizeLabel(returnType, ""),
    severity: code === "mock-query-missing-value" ? "info" : "warning",
  };
}

function parseRuntimeValue(valueKind, source, key) {
  if (valueKind === "Unsupported") {
    return {
      hasValue: false,
      isValid: false,
      runtimeValue: null,
      valueLabel: "",
    };
  }

  if (!Object.prototype.hasOwnProperty.call(source || {}, key) || source[key] === null || typeof source[key] === "undefined") {
    return {
      hasValue: false,
      isValid: false,
      runtimeValue: null,
      valueLabel: "",
    };
  }

  const value = source[key];
  if (valueKind === "String") {
    return {
      hasValue: true,
      isValid: true,
      runtimeValue: {
        kind: "String",
        stringValue: String(value),
      },
      valueLabel: String(value),
    };
  }

  if (valueKind === "Number") {
    const numericValue = typeof value === "number" ? value : Number(String(value).trim());
    const isValid = Number.isFinite(numericValue);
    return {
      hasValue: true,
      isValid,
      runtimeValue: isValid
        ? {
          kind: "Number",
          numberValue: numericValue,
        }
        : null,
      valueLabel: String(value),
    };
  }

  const boolValue = parseBool(value);
  return {
    hasValue: true,
    isValid: boolValue !== null,
    runtimeValue: boolValue === null
      ? null
      : {
        boolValue,
        kind: "Bool",
      },
    valueLabel: String(value),
  };
}

function parseBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const text = String(value).trim().toLowerCase();
  if (text === "true") {
    return true;
  }

  if (text === "false") {
    return false;
  }

  return null;
}

function normalizeValueKind(typeName) {
  const normalizedType = String(typeName || "").trim().toLowerCase();
  if (normalizedType === "string" || normalizedType === "text") {
    return "String";
  }

  if (
    normalizedType === "number"
    || normalizedType === "int"
    || normalizedType === "integer"
    || normalizedType === "float"
    || normalizedType === "double"
    || normalizedType === "decimal"
  ) {
    return "Number";
  }

  if (normalizedType === "bool" || normalizedType === "boolean") {
    return "Bool";
  }

  return "Unsupported";
}

function groupMockEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.name)) {
      groups.set(entry.name, []);
    }

    groups.get(entry.name).push(entry);
  }

  return groups;
}

function normalizeMockEntries(mockEntries) {
  if (!Array.isArray(mockEntries)) {
    return [];
  }

  return mockEntries
    .filter((entry) => entry && typeof entry.name === "string")
    .map((entry) => ({
      arguments: Array.isArray(entry.arguments) ? entry.arguments : [],
      enabled: entry.enabled !== false,
      name: entry.name.trim(),
      value: entry.value,
    }))
    .filter((entry) => entry.name);
}

function normalizeHostSchemaCatalog(hostSchemaCatalog) {
  const catalog = hostSchemaCatalog && typeof hostSchemaCatalog === "object"
    ? hostSchemaCatalog
    : {};
  return {
    hostSchema: {
      errorMessage: normalizeLabel(catalog.hostSchema?.errorMessage, ""),
      loaded: catalog.hostSchema?.loaded === true,
      resolvedPath: normalizeLabel(catalog.hostSchema?.resolvedPath, ""),
    },
    queries: normalizeQueries(catalog.queries),
  };
}

function normalizeQueries(queries) {
  if (!Array.isArray(queries)) {
    return [];
  }

  return queries
    .filter((query) => query && typeof query.name === "string")
    .map((query) => ({
      character: normalizeNonNegativeInteger(query.character, 0),
      description: normalizeLabel(query.description, ""),
      isAsync: query.isAsync === true,
      length: normalizePositiveInteger(query.length, query.name.length || 1),
      line: normalizeNonNegativeInteger(query.line, 0),
      name: query.name.trim(),
      parameters: Array.isArray(query.parameters) ? query.parameters : [],
      returnType: normalizeLabel(query.returnType, ""),
      sourcePath: normalizeLabel(query.sourcePath, ""),
    }))
    .filter((query) => query.name)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function formatSessionId(sessionId) {
  const text = normalizeLabel(sessionId, "default");
  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function normalizeLabel(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeOptionalNonNegativeInteger(value) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return normalizeNonNegativeInteger(value, null);
}

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}
