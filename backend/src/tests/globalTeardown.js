/**
 * Route-test gate: merges the per-file route hits and fails the run if a route
 * has no test and is not listed in route-coverage-baseline.json (or if the
 * baseline lists a route that is now tested — the baseline may only shrink).
 * Only enforced on a full run, not when filtering by file or test name.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const coverageDir = path.resolve(testsDir, "../../coverage");

export default async function globalTeardown(globalConfig) {
  const hitsDir = path.join(coverageDir, "route-hits");
  const hits = new Set();
  if (fs.existsSync(hitsDir)) {
    for (const file of fs.readdirSync(hitsDir)) {
      for (const k of JSON.parse(fs.readFileSync(path.join(hitsDir, file), "utf8"))) hits.add(k);
    }
  }
  fs.mkdirSync(coverageDir, { recursive: true });
  fs.writeFileSync(path.join(coverageDir, "route-hits.json"), JSON.stringify([...hits].sort(), null, 2));

  const filtered =
    Boolean(globalConfig.testPathPattern) ||
    Boolean(globalConfig.testNamePattern) ||
    globalConfig.onlyChanged ||
    globalConfig.findRelatedTests;
  const routesFile = path.join(coverageDir, "routes.json");
  if (filtered || !fs.existsSync(routesFile)) return;

  const routes = JSON.parse(fs.readFileSync(routesFile, "utf8"));
  const baseline = JSON.parse(
    fs.readFileSync(path.join(testsDir, "route-coverage-baseline.json"), "utf8")
  );
  const allowed = new Set(baseline.untested);
  const untested = routes.filter((k) => !hits.has(k) && !allowed.has(k));
  const stale = baseline.untested.filter((k) => hits.has(k) || !routes.includes(k));

  const problems = [];
  if (untested.length) problems.push(`Routes without any test:\n  ${untested.join("\n  ")}`);
  if (stale.length) {
    problems.push(
      `Remove these from route-coverage-baseline.json "untested" (now tested or removed):\n  ${stale.join("\n  ")}`
    );
  }
  console.log(`\nRoute test coverage: ${routes.filter((k) => hits.has(k)).length}/${routes.length}`);
  if (problems.length) throw new Error(`Route coverage gate failed.\n${problems.join("\n")}`);
}
