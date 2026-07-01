# Database migrations

Schema source of truth: `src/models/schema.js`

## Fresh database (Docker / local)

```bash
# Sync all tables from schema.js (recommended)
npm run migrate

# Or: generate SQL snapshot then apply
npm run generate    # creates migrations/0000_*.sql from schema
npm run migrate:sql # applies journal migrations
```

## After changing schema.js

1. Edit `src/models/schema.js`
2. Run `npm run migrate` (`drizzle-kit push`) **or** `npm run generate` then `npm run migrate:sql`
3. Run seeds if needed: `npm run seed:all`

## Reset everything

```bash
npm run clearSeed
npm run migrate
npm run seed:all
```

Old incremental migrations (0000–0014, 20240609_*) were removed; one schema file drives the DB.
