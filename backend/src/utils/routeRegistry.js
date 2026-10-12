/**
 * Introspect the mounted Express routers to get the real list of endpoints.
 * Shared by scripts/audit-routes.js and the route coverage checks in tests.
 */

/** Express path (/orders/:orderId) -> OpenAPI path (/orders/{orderId}) */
export const toOpenApiPath = (path) => path.replace(/:(\w+)/g, "{$1}");

/** Express path -> RegExp that matches concrete request paths. */
export const toMatcher = (path) =>
  new RegExp(
    "^" +
      path
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/:(\w+)/g, "[^/]+") +
      "/?$"
  );

/**
 * @param {Array<[string, import("express").Router]>} routeModules
 * @returns {Array<{ method: string, path: string, mountPath: string }>}
 *   In registration order, which is also Express' matching order.
 */
export function listRoutes(routeModules) {
  const routes = [];
  for (const [mountPath, router] of routeModules) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const routePath = layer.route.path === "/" ? "" : layer.route.path;
      for (const method of Object.keys(layer.route.methods)) {
        if (method === "_all") continue;
        routes.push({
          method: method.toUpperCase(),
          path: `${mountPath}${routePath}` || "/",
          mountPath,
        });
      }
    }
  }
  return routes;
}

/** Find the route a concrete request would hit (first match wins, like Express). */
export function matchRoute(routes, method, url) {
  const pathname = url.split("?")[0];
  return routes.find(
    (route) => route.method === method && toMatcher(route.path).test(pathname)
  );
}
