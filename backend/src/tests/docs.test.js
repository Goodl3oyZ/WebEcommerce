/**
 * Swagger coverage gate: every route must be documented, except those still
 * listed in route-coverage-baseline.json. The baseline may only shrink.
 * Also writes coverage/routes.json for the route-test gate in globalTeardown.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(testsDir, "../..");
const baseline = JSON.parse(
  fs.readFileSync(path.join(testsDir, "route-coverage-baseline.json"), "utf8")
);

const { routeModules, deprecatedMountPaths } = await import("../routes/index.js");
const { listRoutes, toOpenApiPath } = await import("../utils/routeRegistry.js");
const { swaggerSpec } = await import("../config/swagger.js");

const routes = listRoutes(routeModules).filter(
  (route) => !deprecatedMountPaths.includes(route.mountPath)
);
const key = (route) => `${route.method} ${route.path}`;
const isDocumented = (route) =>
  Boolean(swaggerSpec.paths?.[toOpenApiPath(route.path)]?.[route.method.toLowerCase()]);

fs.mkdirSync(path.join(backendRoot, "coverage"), { recursive: true });
fs.writeFileSync(
  path.join(backendRoot, "coverage", "routes.json"),
  JSON.stringify(routes.map(key), null, 2)
);

describe("API documentation", () => {
  // swagger-parser is ESM-only underneath, which Jest 29 cannot load, so the
  // existing validator script runs in plain Node instead.
  test("OpenAPI spec is valid", () => {
    expect(() =>
      execFileSync(process.execPath, ["scripts/validate-swagger.js"], {
        cwd: backendRoot,
        stdio: "pipe",
      })
    ).not.toThrow();
  });

  test("every route is documented (or still listed in the baseline)", () => {
    const allowed = new Set(baseline.undocumented);
    const missing = routes.filter((r) => !isDocumented(r) && !allowed.has(key(r))).map(key);
    expect(missing).toEqual([]);
  });

  test("baseline has no entries that are now documented or no longer exist", () => {
    const existing = new Set(routes.map(key));
    const stale = baseline.undocumented.filter((k) => {
      const route = routes.find((r) => key(r) === k);
      return !existing.has(k) || (route && isDocumented(route));
    });
    expect(stale).toEqual([]);
  });

  test("documentation has no paths that do not exist", () => {
    const real = new Set(
      listRoutes(routeModules).map((r) => `${r.method} ${toOpenApiPath(r.path)}`)
    );
    const phantom = [];
    for (const [p, ops] of Object.entries(swaggerSpec.paths ?? {})) {
      for (const method of Object.keys(ops)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        if (!real.has(`${method.toUpperCase()} ${p}`)) phantom.push(`${method.toUpperCase()} ${p}`);
      }
    }
    expect(phantom).toEqual([]);
  });
});
