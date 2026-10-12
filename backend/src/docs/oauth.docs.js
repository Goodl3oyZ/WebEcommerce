import { documentRoutes } from "./registry.js";

const providers = { github: "GitHub", google: "Google", facebook: "Facebook" };

documentRoutes(
  "OAuth",
  Object.entries(providers).flatMap(([provider, label]) => [
    {
      method: "get",
      path: `/oauth/${provider}`,
      summary: `Start ${label} login`,
      description:
        "Browser navigation only. Redirects to the provider, or back to the app with `?error=PROVIDER_NOT_CONFIGURED`.",
      auth: "public",
      responses: { 302: "Redirect to provider (or to the app if not configured)" },
    },
    {
      method: "get",
      path: `/oauth/${provider}/callback`,
      summary: `${label} OAuth callback`,
      description:
        "Called by the provider. On success sets the auth cookies and redirects to `/auth/callback?success=true`; on failure to `/auth/callback?error=<code>`. An existing account is only linked when the provider reports the email as verified.",
      auth: "public",
      responses: { 302: "Redirect back to the app" },
    },
  ])
);

documentRoutes("OAuth", [
  {
    method: "get",
    path: "/oauth/me",
    summary: "Current user's profile (same as /api/users/profile)",
    auth: "user",
    responses: { 200: "Profile" },
  },
  {
    method: "get",
    path: "/oauth/logout",
    summary: "Log out and redirect to the app",
    auth: "public",
    responses: { 302: "Redirect to the app" },
  },
]);
