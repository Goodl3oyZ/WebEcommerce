/**
 * OpenAPI generation from the zod DTOs used for validation, so the docs cannot
 * drift from what the API actually accepts.
 *
 *   documentRoutes("Auth", [
 *     { method: "post", path: "/api/auth/login", summary: "Log in",
 *       auth: "public", body: authDto.login, responses: { 200: "Logged in" } },
 *   ]);
 *
 * auth: "public" | "user" | "moderator" | "admin" | "super_admin"  (adds security + 401/403)
 * body: zod schema (JSON) — bodyType: "multipart" for file uploads
 * query: zod object of query parameters
 * responses: { status: "description" | { description, schema } }
 */
import { zodToJsonSchema } from "zod-to-json-schema";

const operations = [];

export function documentRoutes(tag, routes) {
  for (const route of routes) operations.push({ tag, ...route });
}

const toJsonSchema = (schema) => {
  const json = zodToJsonSchema(schema, {
    target: "openApi3",
    $refStrategy: "none",
    pipeStrategy: "output",
  });
  delete json.$schema;
  return json;
};

const toOpenApiPath = (path) => path.replace(/:(\w+)/g, "{$1}");

const pathParams = (path) =>
  [...path.matchAll(/:(\w+)/g)].map(([, name]) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));

const queryParams = (schema) => {
  if (!schema) return [];
  const json = toJsonSchema(schema);
  return Object.entries(json.properties ?? {}).map(([name, prop]) => ({
    name,
    in: "query",
    required: json.required?.includes(name) ?? false,
    ...(prop.description && { description: prop.description }),
    schema: prop,
  }));
};

const errorResponse = (description) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
});

function buildOperation(op) {
  const responses = {};
  for (const [status, value] of Object.entries(op.responses ?? { 200: "OK" })) {
    if (typeof value === "string") {
      responses[status] = { description: value };
    } else {
      responses[status] = {
        description: value.description,
        ...(value.schema && {
          content: { "application/json": { schema: toJsonSchema(value.schema) } },
        }),
      };
    }
  }
  if (op.body || op.query) responses[400] ??= errorResponse("Validation failed");
  if (op.auth && op.auth !== "public") {
    responses[401] ??= errorResponse("Not authenticated, or the session has ended");
    if (op.auth !== "user") responses[403] ??= errorResponse(`Requires the ${op.auth} role`);
  }

  const operation = {
    tags: [op.tag],
    summary: op.summary,
    ...(op.description && { description: op.description }),
    ...(op.deprecated && { deprecated: true }),
    parameters: [...pathParams(op.path), ...queryParams(op.query)],
    responses,
  };
  if (op.auth && op.auth !== "public") {
    operation.security = [{ bearerAuth: [] }, { cookieAuth: [] }];
  } else {
    operation.security = [];
  }
  if (op.body) {
    const mediaType = op.bodyType === "multipart" ? "multipart/form-data" : "application/json";
    const schema = toJsonSchema(op.body);
    if (op.bodyType === "multipart" && op.fileField) {
      schema.properties = {
        ...schema.properties,
        [op.fileField]: { type: "string", format: "binary" },
      };
    }
    operation.requestBody = { required: !op.bodyOptional, content: { [mediaType]: { schema } } };
  }
  return operation;
}

/** OpenAPI `paths` for every documented route. */
export function buildPaths() {
  const paths = {};
  for (const op of operations) {
    const p = toOpenApiPath(op.path);
    paths[p] ??= {};
    paths[p][op.method.toLowerCase()] = buildOperation(op);
  }
  return paths;
}
