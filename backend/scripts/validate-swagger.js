import SwaggerParser from "@apidevtools/swagger-parser";
import { swaggerSpec } from "../src/config/swagger.js";

async function validateDocs() {
  try {
    console.log("🔍 Validating OpenAPI 3.0 specification...");
    const api = await SwaggerParser.validate(JSON.parse(JSON.stringify(swaggerSpec)));
    console.log("✅ OpenAPI Spec is 100% valid! Title:", api.info.title, "Version:", api.info.version);
    console.log(`📊 Total Paths Documented: ${Object.keys(api.paths || {}).length}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ OpenAPI Spec Validation Error:", err.message);
    process.exit(1);
  }
}

validateDocs();
