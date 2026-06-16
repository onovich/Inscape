export const EditorBackendSettingsSchemaFormat = "inscape.self-hosted-editor.settings-schema";
export const EditorBackendSettingsSummaryFormat = "inscape.self-hosted-editor.settings-summary";
export const EditorBackendSettingsFormatVersion = 1;

export const EditorBackendSettingsDefaults = Object.freeze({
  global: Object.freeze({
    autosaveEnabled: true,
    backupRetentionDays: 30,
    backupRetentionLimit: 20,
    defaultAssetDirectory: "assets",
    theme: "system",
  }),
  workspace: Object.freeze({
    backupEnabled: true,
    entryTitle: "",
    exportProfile: "default",
    gitCheckpointPolicy: "manual",
    resourceDirectory: "assets",
    resourceImportPolicy: "copy-into-workspace",
  }),
});

const globalSettingDescriptors = Object.freeze([
  Object.freeze({
    category: "save",
    key: "autosaveEnabled",
    scope: "global",
    valueType: "boolean",
  }),
  Object.freeze({
    category: "backup",
    key: "backupRetentionDays",
    minimum: 0,
    scope: "global",
    valueType: "integer",
  }),
  Object.freeze({
    category: "backup",
    key: "backupRetentionLimit",
    minimum: 1,
    scope: "global",
    valueType: "integer",
  }),
  Object.freeze({
    category: "assets",
    key: "defaultAssetDirectory",
    pathRule: "assets/**",
    scope: "global",
    valueType: "workspace-relative-path",
  }),
  Object.freeze({
    allowedValues: Object.freeze(["system", "light", "dark"]),
    category: "appearance",
    key: "theme",
    scope: "global",
    valueType: "enum",
  }),
]);

const workspaceSettingDescriptors = Object.freeze([
  Object.freeze({
    category: "backup",
    key: "backupEnabled",
    scope: "workspace",
    valueType: "boolean",
  }),
  Object.freeze({
    category: "project",
    key: "entryTitle",
    scope: "workspace",
    valueType: "string",
  }),
  Object.freeze({
    category: "export",
    key: "exportProfile",
    scope: "workspace",
    valueType: "string",
  }),
  Object.freeze({
    allowedValues: Object.freeze(["manual", "prompt", "off"]),
    category: "git",
    key: "gitCheckpointPolicy",
    scope: "workspace",
    valueType: "enum",
  }),
  Object.freeze({
    category: "assets",
    key: "resourceDirectory",
    pathRule: "assets/**",
    scope: "workspace",
    valueType: "workspace-relative-path",
  }),
  Object.freeze({
    allowedValues: Object.freeze(["copy-into-workspace", "reference-external"]),
    category: "assets",
    key: "resourceImportPolicy",
    scope: "workspace",
    supportedValues: Object.freeze(["copy-into-workspace"]),
    valueType: "enum",
  }),
]);

export class EditorBackendSettingsSchemaModel {
  static buildSchema({
    settingsSummary = null,
  } = {}) {
    const summary = normalizeEditorBackendSettingsSummary(settingsSummary);
    const scopes = [
      buildSettingsScope({
        defaults: EditorBackendSettingsDefaults.global,
        descriptorOwner: "user-preference",
        descriptors: globalSettingDescriptors,
        projectBehavior: false,
        scope: "global",
        settings: summary.global,
      }),
      buildSettingsScope({
        defaults: EditorBackendSettingsDefaults.workspace,
        descriptorOwner: "project-behavior",
        descriptors: workspaceSettingDescriptors,
        projectBehavior: true,
        scope: "workspace",
        settings: summary.workspace,
      }),
    ];

    return {
      defaults: buildSettingsDefaultsSnapshot(),
      format: EditorBackendSettingsSchemaFormat,
      formatVersion: EditorBackendSettingsFormatVersion,
      payloadContentExposed: false,
      schemaCompleteForP1: true,
      scopes,
      settingCount: scopes.reduce((count, scope) => count + scope.settings.length, 0),
      settingsSummary: summary,
    };
  }
}

export function buildEditorBackendSettingsSummary(settings = {}) {
  const normalizedInput = normalizeSettingsSummaryInput(settings);
  const globalSettings = normalizedInput.globalSettings;
  const workspaceSettings = normalizedInput.workspaceSettings;

  return {
    format: EditorBackendSettingsSummaryFormat,
    formatVersion: EditorBackendSettingsFormatVersion,
    global: {
      autosaveEnabled: globalSettings.autosaveEnabled !== false,
      backupRetentionDays: normalizeNonNegativeInteger(
        globalSettings.backupRetentionDays,
        EditorBackendSettingsDefaults.global.backupRetentionDays
      ),
      backupRetentionLimit: normalizePositiveInteger(
        globalSettings.backupRetentionLimit,
        EditorBackendSettingsDefaults.global.backupRetentionLimit
      ),
      defaultAssetDirectory: normalizeAssetDirectory(
        globalSettings.defaultAssetDirectory,
        EditorBackendSettingsDefaults.global.defaultAssetDirectory
      ),
      theme: normalizeEnum(
        globalSettings.theme,
        ["system", "light", "dark"],
        EditorBackendSettingsDefaults.global.theme
      ),
    },
    workspace: {
      backupEnabled: workspaceSettings.backupEnabled !== false,
      entryTitle: String(workspaceSettings.entryTitle ?? EditorBackendSettingsDefaults.workspace.entryTitle),
      exportProfile: String(workspaceSettings.exportProfile || EditorBackendSettingsDefaults.workspace.exportProfile),
      gitCheckpointPolicy: normalizeEnum(
        workspaceSettings.gitCheckpointPolicy,
        ["manual", "prompt", "off"],
        EditorBackendSettingsDefaults.workspace.gitCheckpointPolicy
      ),
      resourceDirectory: normalizeAssetDirectory(
        workspaceSettings.resourceDirectory,
        EditorBackendSettingsDefaults.workspace.resourceDirectory
      ),
      resourceImportPolicy: normalizeEnum(
        workspaceSettings.resourceImportPolicy,
        ["copy-into-workspace", "reference-external"],
        EditorBackendSettingsDefaults.workspace.resourceImportPolicy
      ),
    },
  };
}

export function normalizeEditorBackendSettingsSummary(settingsSummary = null) {
  return buildEditorBackendSettingsSummary(settingsSummary || {});
}

function buildSettingsScope({
  defaults,
  descriptorOwner,
  descriptors,
  projectBehavior,
  scope,
  settings,
}) {
  return {
    owner: descriptorOwner,
    projectBehavior: Boolean(projectBehavior),
    scope,
    settings: descriptors.map((descriptor) => buildSettingDescriptor({
      currentValue: settings[descriptor.key],
      defaultValue: defaults[descriptor.key],
      descriptor,
      descriptorOwner,
      projectBehavior,
    })),
  };
}

function buildSettingDescriptor({
  currentValue,
  defaultValue,
  descriptor,
  descriptorOwner,
  projectBehavior,
}) {
  return {
    allowedValues: descriptor.allowedValues ? [...descriptor.allowedValues] : [],
    category: descriptor.category,
    currentValue,
    defaultValue,
    key: descriptor.key,
    minimum: descriptor.minimum ?? null,
    owner: descriptorOwner,
    pathRule: descriptor.pathRule || "",
    projectBehavior: Boolean(projectBehavior),
    scope: descriptor.scope,
    supportedValues: descriptor.supportedValues ? [...descriptor.supportedValues] : [],
    valueType: descriptor.valueType,
  };
}

function buildSettingsDefaultsSnapshot() {
  return {
    global: { ...EditorBackendSettingsDefaults.global },
    workspace: { ...EditorBackendSettingsDefaults.workspace },
  };
}

function normalizeSettingsSummaryInput(settings) {
  if (settings?.global || settings?.workspace) {
    return {
      globalSettings: settings.global || {},
      workspaceSettings: settings.workspace || {},
    };
  }

  return {
    globalSettings: settings?.globalSettings || {},
    workspaceSettings: settings?.workspaceSettings || {},
  };
}

function normalizeAssetDirectory(value, fallback) {
  const normalized = normalizeRelativePath(value || fallback);
  if (
    !normalized
    || normalized.includes("..")
    || normalized.includes(":")
    || normalized.startsWith("/")
    || normalized.startsWith("\\")
  ) {
    return fallback;
  }

  if (normalized !== "assets" && !normalized.startsWith("assets/")) {
    return fallback;
  }

  return normalized;
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value || "").trim();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/g, "");
}
