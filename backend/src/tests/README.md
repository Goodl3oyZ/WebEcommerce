# Backend tests

Integration tests run the real Express app against throwaway Postgres, Redis
and SeaweedFS containers (`docker-compose.test.yml`). Omise and email are mocked
in `setupAfterEnv.js`. Docker must be running.

```bash
npm test                     # starts test containers, fresh schema, runs everything
npm test -- payments         # one file (coverage gate is skipped when filtering)
npm run test:infra:down      # stop the test containers
npm run audit:routes         # route matrix: documented / tested / used by frontend
```

## Writing a test

```js
import { newAgent } from "./helpers/app.js";      // anonymous client with its own IP
import { loginAs, createUser } from "./helpers/factories.js";
import { createOrder } from "./helpers/fixtures.js";

const { agent, user } = await loginAs("admin");   // cookie-authenticated agent
const res = await agent.get("/api/admin/dashboard");
```

## Coverage gates

`route-coverage-baseline.json` lists routes that are not yet documented or
tested. The suite fails when:

- a route is missing from Swagger or has no test and is **not** in the baseline
  (that is, new routes must ship with docs and tests), or
- the baseline still lists a route that is now covered.

After adding docs or tests, run a full `npm test` and then
`npm run test:baseline:prune` to shrink the baseline. The baseline never grows.
