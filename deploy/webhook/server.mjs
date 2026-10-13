/**
 * Deploy webhook for the production server (no dependencies; Node 18+).
 *
 *   POST /hooks/deploy         signed request from GitHub Actions -> deploy that commit
 *   GET  /hooks/deploy/status  last deploy: { state, sha, startedAt, finishedAt, message }
 *
 * The body is JSON { ref, sha, ts } signed with HMAC-SHA256 using DEPLOY_SECRET
 * (header X-Deploy-Signature: sha256=<hex>). Only the configured branch is
 * deployed, requests older than 5 minutes are refused, and deploys never run
 * in parallel: a request during a deploy is queued (the newest one wins).
 *
 * Settings come from the environment (see webecommerce-deploy.service):
 *   DEPLOY_SECRET   shared secret, also stored as a GitHub Actions secret
 *   DEPLOY_BRANCH   branch to deploy (default: main)
 *   APP_DIR         the git checkout (default: /opt/webecommerce)
 *   PORT / HOST     where to listen (default: 127.0.0.1:9095, reached via cloudflared)
 *   STATE_DIR       status and logs (default: /var/lib/webecommerce-deploy)
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SECRET = process.env.DEPLOY_SECRET || "";
const BRANCH = process.env.DEPLOY_BRANCH || "main";
const APP_DIR = process.env.APP_DIR || "/opt/webecommerce";
const PORT = Number(process.env.PORT || 9095);
const HOST = process.env.HOST || "127.0.0.1";
const STATE_DIR = process.env.STATE_DIR || "/var/lib/webecommerce-deploy";
const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "deploy.sh");
const MAX_AGE_SECONDS = 300;

if (SECRET.length < 32) {
  console.error("DEPLOY_SECRET must be set (at least 32 characters)");
  process.exit(1);
}
fs.mkdirSync(STATE_DIR, { recursive: true });
const statusFile = path.join(STATE_DIR, "status.json");

const log = (msg) => console.log(`[deploy-webhook] ${new Date().toISOString()} ${msg}`);
const send = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

function validSignature(raw, header) {
  const expected = `sha256=${crypto.createHmac("sha256", SECRET).update(raw).digest("hex")}`;
  const a = Buffer.from(String(header || ""));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

let running = false;
let queued = null;

function runDeploy(sha) {
  if (running) {
    queued = sha;
    log(`deploy running, queued ${sha.slice(0, 7)}`);
    return;
  }
  running = true;
  log(`deploying ${sha.slice(0, 7)}`);
  const out = fs.openSync(path.join(STATE_DIR, "deploy.log"), "a");
  const child = spawn("bash", [SCRIPT, sha], {
    env: { ...process.env, APP_DIR, DEPLOY_BRANCH: BRANCH, STATE_DIR },
    stdio: ["ignore", out, out],
  });
  child.on("exit", (code) => {
    fs.closeSync(out);
    running = false;
    log(`deploy of ${sha.slice(0, 7)} exited with ${code}`);
    if (queued) {
      const next = queued;
      queued = null;
      runDeploy(next);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/hooks/deploy/status") {
    try {
      return send(res, 200, { ...JSON.parse(fs.readFileSync(statusFile, "utf8")), running, queued });
    } catch {
      return send(res, 200, { state: "none", running, queued });
    }
  }

  if (req.method !== "POST" || url.pathname !== "/hooks/deploy") return send(res, 404, { error: "not found" });

  const chunks = [];
  let size = 0;
  req.on("data", (c) => {
    size += c.length;
    if (size > 16 * 1024) req.destroy();
    else chunks.push(c);
  });
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    if (!validSignature(raw, req.headers["x-deploy-signature"])) {
      log("rejected: bad signature");
      return send(res, 401, { error: "bad signature" });
    }
    let body;
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      return send(res, 400, { error: "invalid JSON" });
    }
    if (Math.abs(Date.now() / 1000 - Number(body.ts)) > MAX_AGE_SECONDS) {
      return send(res, 400, { error: "request too old" });
    }
    if (body.ref !== `refs/heads/${BRANCH}`) {
      return send(res, 202, { ignored: `only ${BRANCH} is deployed` });
    }
    if (!/^[0-9a-f]{40}$/.test(String(body.sha))) return send(res, 400, { error: "invalid sha" });

    runDeploy(body.sha);
    return send(res, 202, { accepted: body.sha, queued: running && queued === body.sha });
  });
});

server.listen(PORT, HOST, () => log(`listening on ${HOST}:${PORT}, deploying ${BRANCH} in ${APP_DIR}`));
