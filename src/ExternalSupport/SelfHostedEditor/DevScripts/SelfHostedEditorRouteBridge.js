const selfHostedEditorApiRouteDefinitions = [
  ["diagnostics", "/api/diagnostics"],
  ["hover", "/api/hover"],
  ["definition", "/api/definition"],
  ["references", "/api/references"],
  ["completions", "/api/completions"],
  ["documentSymbols", "/api/document-symbols"],
  ["hostSchemaCapabilities", "/api/host-schema-capabilities"],
  ["hostBindingCapabilities", "/api/host-binding-capabilities"],
  ["storyGraph", "/api/story-graph"],
  ["runtimeState", "/api/runtime-state"],
  ["runtimeAction", "/api/runtime-action"],
  ["lineMapRefresh", "/api/line-map-refresh"],
  ["sessionCacheStatus", "/api/session-cache-status"],
  ["nodeMapReview", "/api/node-map-review"],
  ["nodeMapApply", "/api/node-map-apply"],
  ["localizationReview", "/api/localization-review"],
  ["localizationUpdate", "/api/localization-update"],
];

export function createSelfHostedEditorApiRoutes(handlers) {
  return new Map(
    selfHostedEditorApiRouteDefinitions.map(([handlerName, routePath]) => [
      routePath,
      handlers[handlerName],
    ])
  );
}

export async function routeSelfHostedEditorApiRequest(request, response, requestUrl, routes) {
  const routeHandler = resolveSelfHostedEditorApiRoute(request.method, requestUrl.pathname, routes);
  if (!routeHandler) {
    return false;
  }

  await routeHandler(request, response);
  return true;
}

export function resolveSelfHostedEditorApiRoute(method, pathname, routes) {
  if (method !== "POST") {
    return null;
  }

  const routeHandler = routes.get(pathname);
  return typeof routeHandler === "function"
    ? routeHandler
    : null;
}

export function listSelfHostedEditorApiRoutePaths() {
  return selfHostedEditorApiRouteDefinitions.map(([, routePath]) => routePath);
}
