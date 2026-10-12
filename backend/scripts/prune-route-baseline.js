/**
 * Remove routes from src/tests/route-coverage-baseline.json that are now
 * documented / tested (after a full `npm test`). Never adds entries.
 *   npm run test:baseline:prune
 *   npm run test:baseline:prune -- --seed   # one-time: record all current gaps
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "src/tests/route-coverage-baseline.json");
const routes = JSON.parse(fs.readFileSync(path.join(root, "coverage/routes.json"), "utf8"));
const hits = new Set(JSON.parse(fs.readFileSync(path.join(root, "coverage/route-hits.json"), "utf8")));

const { swaggerSpec } = await import("../src/config/swagger.js");
const { toOpenApiPath } = await import("../src/utils/routeRegistry.js");
const isDocumented = (k) => {
  const [method, p] = k.split(" ");
  return Boolean(swaggerSpec.paths?.[toOpenApiPath(p)]?.[method.toLowerCase()]);
};

const seed = process.argv.includes("--seed");
const baseline = seed
  ? { undocumented: routes, untested: routes }
  : JSON.parse(fs.readFileSync(baselineFile, "utf8"));

const next = {
  undocumented: baseline.undocumented.filter((k) => routes.includes(k) && !isDocumented(k)),
  untested: baseline.untested.filter((k) => routes.includes(k) && !hits.has(k)),
};
fs.writeFileSync(baselineFile, JSON.stringify(next, null, 2) + "\n");
console.log(
  `Baseline: ${next.undocumented.length} undocumented, ${next.untested.length} untested ` +
    `(of ${routes.length} routes).`
);
process.exit(0);
