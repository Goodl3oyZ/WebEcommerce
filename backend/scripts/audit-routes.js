/**
 * Route audit: every Express endpoint vs. Swagger docs, tests and frontend usage.
 *
 *   npm run audit:routes            # summary + per-module table
 *   npm run audit:routes -- --all   # also list every route
 *   npm run audit:routes -- --json  # machine-readable output
 *
 * "Tested" comes from coverage/route-hits.json, written by the last `npm test`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const frontendSrc = path.resolve(backendRoot, "../frontend/src");

const { routeModules, deprecatedMountPaths } = await import("../src/routes/index.js");
const { swaggerSpec } = await import("../src/config/swagger.js");
const { listRoutes, matchRoute, toOpenApiPath } = await import("../src/utils/routeRegistry.js");

const allRoutes = listRoutes(routeModules);
// Deprecated aliases still count when matching frontend calls, but are not
// reported or required to be documented/tested themselves.
const routes = allRoutes.filter(
  (route) => !deprecatedMountPaths.includes(route.mountPath)
);

// --- Swagger -------------------------------------------------------------
const documented = (route) =>
  Boolean(swaggerSpec.paths?.[toOpenApiPath(route.path)]?.[route.method.toLowerCase()]);

// --- Tests ---------------------------------------------------------------
const hitsFile = path.join(backendRoot, "coverage", "route-hits.json");
const hits = fs.existsSync(hitsFile)
  ? new Set(JSON.parse(fs.readFileSync(hitsFile, "utf8")))
  : null;
const tested = (route) => hits?.has(`${route.method} ${route.path}`) ?? false;

// --- Frontend --------------------------------------------------------------
function frontendCalls() {
  const calls = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        const re = /\.(get|post|put|patch|delete)\(\s*[`"']([^`"']+)[`"']?/g;
        for (const [, method, rawUrl] of text.matchAll(re)) {
          let url = rawUrl.replace(/\$\{[^}]+\}/g, "x").split("?")[0];
          url = url.replace(/^https?:\/\/[^/]+/, "");
          if (!url.startsWith("/")) continue;
          if (!url.startsWith("/api") && !url.startsWith("/oauth")) url = `/api${url}`;
          calls.push({
            method: method.toUpperCase(),
            url: url.replace(/\/$/, ""),
            file: path.relative(path.resolve(backendRoot, ".."), full),
          });
        }
      }
    }
  };
  if (fs.existsSync(frontendSrc)) walk(frontendSrc);
  return calls;
}
const calls = frontendCalls();
const usedByFrontend = new Set();
const brokenCalls = [];
const deprecatedCalls = [];
const deprecatedTargets = { "/api/report": "/api/reports" };
for (const call of calls) {
  const route = matchRoute(allRoutes, call.method, call.url);
  if (!route) brokenCalls.push(call);
  else if (deprecatedMountPaths.includes(route.mountPath)) {
    deprecatedCalls.push(call);
    // Credit the canonical route the alias points to.
    const canonical = routes.find(
      (r) => r.method === route.method && r.path === route.path.replace(route.mountPath, deprecatedTargets[route.mountPath])
    );
    if (canonical) usedByFrontend.add(`${canonical.method} ${canonical.path}`);
  } else usedByFrontend.add(`${route.method} ${route.path}`);
}

// --- Report ----------------------------------------------------------------
const rows = routes.map((route) => ({
  method: route.method,
  path: route.path,
  module: route.mountPath,
  documented: documented(route),
  tested: tested(route),
  frontend: usedByFrontend.has(`${route.method} ${route.path}`),
}));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ routes: rows, brokenFrontendCalls: brokenCalls }, null, 2));
  process.exit(0);
}

const pct = (n) => `${n}/${rows.length} (${Math.round((n / rows.length) * 100)}%)`;
console.log(`Routes:            ${rows.length}`);
console.log(`Documented:        ${pct(rows.filter((r) => r.documented).length)}`);
console.log(
  `Tested:            ${hits ? pct(rows.filter((r) => r.tested).length) : "unknown (run npm test first)"}`
);
console.log(`Used by frontend:  ${pct(rows.filter((r) => r.frontend).length)}`);
console.log(`Broken frontend calls (no matching route): ${brokenCalls.length}\n`);

const byModule = new Map();
for (const row of rows) {
  const m = byModule.get(row.module) ?? { total: 0, documented: 0, tested: 0, frontend: 0 };
  m.total++;
  m.documented += row.documented;
  m.tested += row.tested;
  m.frontend += row.frontend;
  byModule.set(row.module, m);
}
console.table(Object.fromEntries(byModule));

if (brokenCalls.length) {
  console.log("\nFrontend calls with no matching backend route:");
  for (const c of brokenCalls) console.log(`  ${c.method.padEnd(6)} ${c.url}   (${c.file})`);
}

if (deprecatedCalls.length) {
  console.log("\nFrontend calls using deprecated aliases:");
  for (const c of deprecatedCalls) console.log(`  ${c.method.padEnd(6)} ${c.url}   (${c.file})`);
}

if (process.argv.includes("--all")) {
  console.log("\nAll routes:");
  for (const r of rows) {
    const flags = `${r.documented ? "D" : "-"}${r.tested ? "T" : "-"}${r.frontend ? "F" : "-"}`;
    console.log(`  [${flags}] ${r.method.padEnd(6)} ${r.path}`);
  }
}

process.exit(0);
