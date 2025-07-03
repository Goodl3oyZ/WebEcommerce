// src/utils/parseUserAgent.js
import { UAParser } from "ua-parser-js";

export function parseUserAgent(userAgentString) {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  return {
    browser: result.browser.name || null,
    browserVersion: result.browser.version || null,
    os: result.os.name || null,
    osVersion: result.os.version || null,
    device: result.device.model || "Desktop",
    platform: result.device.type || "desktop", // e.g. mobile, tablet, desktop
  };
}
