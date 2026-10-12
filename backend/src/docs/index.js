// Import every *.docs.js module so its routes are registered, then build.
import "./auth.docs.js";
import "./oauth.docs.js";
import "./users.docs.js";

export { buildPaths } from "./registry.js";
