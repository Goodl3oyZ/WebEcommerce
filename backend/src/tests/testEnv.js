// Environment for the integration tests. Values here win over backend/.env
// because dotenv never overrides variables that are already set.
export const testEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:55432/webecommerce_test",
  REDIS_URL: "redis://localhost:56379",
  MINIO_HOST: "localhost",
  MINIO_API_PORT: "58333",
  MINIO_USE_SSL: "false",
  MINIO_ROOT_USER: "testaccesskey",
  MINIO_ROOT_PASSWORD: "testsecretkey123",
  MINIO_PUBLIC_URL: "http://localhost:58333",
  JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
  JWT_REFRESH_SECRET: "test-jwt-refresh-secret-at-least-32-characters",
  SESSION_SECRET: "test-session-secret-that-is-at-least-32-chars",
  FRONTEND_URL: "http://localhost:3000",
  ALLOWED_ORIGINS: "http://localhost:3000",
  // Each test agent sends its own X-Forwarded-For, so per-IP rate limits are
  // isolated between tests (and can themselves be tested).
  TRUST_PROXY: "1",
  OMISE_PUBLIC_KEY: "pkey_test_unit",
  OMISE_SECRET_KEY: "skey_test_unit",
  // OAuth: GitHub/Google configured with fake credentials, Facebook not at all.
  GITHUB_CLIENT_ID: "test-github-id",
  GITHUB_CLIENT_SECRET: "test-github-secret",
  GITHUB_CALLBACK_URL: "http://localhost:5000/oauth/github/callback",
  GOOGLE_CLIENT_ID: "test-google-id",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
  GOOGLE_CALLBACK_URL: "http://localhost:5000/oauth/google/callback",
  FACEBOOK_CLIENT_ID: "",
  FACEBOOK_CLIENT_SECRET: "",
  API_URL: "http://localhost:5000/api",
  MAX_LOGIN_ATTEMPTS: "5",
  LOCKOUT_DURATION: "300",
  // Blank SMTP settings: emails are captured by a mock, never sent.
  EMAIL_HOST: "",
  EMAIL_USER: "",
  EMAIL_APP_PASSWORD: "",
};

export const applyTestEnv = () => Object.assign(process.env, testEnv);
