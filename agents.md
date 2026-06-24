# AGENTS.md

## Project

This repository is **Les cocottes de Diane**, a monorepo application.

The project contains:

- `apps/api`: NestJS backend API
- `apps/web`: Next.js frontend
- PostgreSQL database
- Prisma for database access
- pnpm as the package manager

The goal is to build a clean, maintainable, production-ready web application.

---

## Language rules

Chat responses must be written in **French**.

Code must remain in **English**:
- variable names
- function names
- class names
- component names
- file names
- commit messages
- code comments
- database model names
- API route names when already in English

Do not write code comments in French unless the existing file already uses French comments.

Commit messages must be in **English**.

---

## Working style

You are allowed to work autonomously.

When receiving a task:

1. Inspect the existing files before changing code.
2. Understand the current architecture.
3. Make the smallest safe set of changes.
4. Prefer targeted edits over full rewrites.
5. Preserve existing behavior unless the task explicitly asks to change it.
6. Avoid unnecessary refactors.
7. Keep the code simple, readable, and maintainable.
8. Run relevant checks after changes when possible.
9. Summarize the changes clearly in French at the end.

If something is ambiguous, make a reasonable assumption and mention it in the final response.

Do not stop to ask for confirmation unless the requested change is destructive, risky, or impossible to infer safely.

---

## Package manager

This project uses **pnpm**.

Always prefer pnpm commands.

Use:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

For workspace-specific commands, use pnpm filters when appropriate:

```bash
pnpm --filter api <command>
pnpm --filter web <command>
```

Examples:

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter api lint
pnpm --filter web lint
```

Do not use npm, yarn, or bun unless explicitly requested.

Do not generate or modify `package-lock.json` or `yarn.lock`.

---

## Dependency management

Do not add a dependency unless it is clearly useful.

Before adding a dependency:

1. Check if the project already has an equivalent package.
2. Prefer native TypeScript or framework features when reasonable.
3. Explain why the dependency is needed.

Do not run:

```bash
pnpm audit --fix --force
npm audit fix --force
```

Avoid forced major upgrades unless explicitly requested.

When fixing vulnerabilities:
- inspect the audit output first;
- prefer safe minor or patch updates;
- mention breaking risks if a major version upgrade is required.

---

## Monorepo structure

Respect the monorepo boundaries.

Backend-related files usually belong in:

```txt
apps/api
```

Frontend-related files usually belong in:

```txt
apps/web
```

Shared code should only be introduced if there is a clear need.

Do not move files between apps unless necessary.

Do not restructure the monorepo without explicit instruction.

---

## Backend: NestJS API

The backend is located in:

```txt
apps/api
```

Follow NestJS conventions:

- modules contain related features;
- controllers expose HTTP endpoints;
- services contain business logic;
- DTOs validate input;
- Prisma/database access should stay in dedicated services when possible.

When changing the API:

1. Validate incoming data.
2. Use DTOs where appropriate.
3. Keep controllers thin.
4. Put business logic in services.
5. Handle errors cleanly.
6. Avoid exposing internal implementation details.
7. Preserve existing API contracts unless the task asks otherwise.

If the app uses a global prefix such as `/api`, preserve it.

Do not introduce breaking API changes without mentioning them clearly.

---

## Frontend: Next.js

The frontend is located in:

```txt
apps/web
```

Follow the existing Next.js structure.

If the project uses the App Router:
- keep using the App Router;
- use server components by default;
- add `"use client"` only when needed;
- avoid unnecessary React state;
- avoid unnecessary `useEffect`;
- keep components small and readable.

When changing UI:

1. Respect the existing design style.
2. Keep layouts responsive.
3. Preserve accessibility basics.
4. Avoid inline styles unless the project already uses them.
5. Prefer existing UI conventions and components.
6. Do not introduce a new UI library unless explicitly requested.

---

## API integration

When the frontend calls the backend:

- use the existing API client or fetch helper if one exists;
- keep the API base URL centralized;
- avoid hardcoding backend URLs inside components;
- use environment variables when needed;
- handle loading and error states.

If the backend global prefix is `/api`, make sure frontend calls include it when required.

---

## Prisma and database

If Prisma is used, inspect:

```txt
apps/api/prisma/schema.prisma
apps/api/prisma.config.ts
```

or equivalent project paths before making database changes.

Rules:

1. Do not edit old migrations that may already be applied.
2. Create new migrations for schema changes.
3. Do not delete columns, tables, or relations without explicit instruction.
4. Avoid destructive migrations unless clearly requested.
5. Keep Prisma model names and fields in English.
6. Run Prisma generate when needed.
7. Mention any required migration command in the final response.

Common commands may include:

```bash
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev
pnpm --filter api prisma studio
pnpm --filter api seed
```

Use the scripts defined in `package.json` when available.

---

## Environment variables

Never commit real secrets.

Do not expose:

- API keys
- database passwords
- JWT secrets
- OAuth secrets
- private tokens

Use `.env.example` for documented variables.

Do not modify `.env`, `.env.local`, or production secrets unless explicitly requested.

If an environment variable is missing, mention it clearly and suggest the expected variable name.

---

## Docker and local services

If the project uses Docker Compose for PostgreSQL, inspect the existing compose file before suggesting commands.

Prefer existing scripts.

Typical commands may include:

```bash
docker compose up -d
docker compose down
docker compose logs
```

Do not delete Docker volumes unless explicitly requested, because this can erase local database data.

---

## Testing and validation

After code changes, run the most relevant checks when possible.

Preferred order:

```bash
pnpm lint
pnpm build
pnpm test
```

For targeted checks:

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api test
pnpm --filter web test
```

If a command fails:
1. read the error;
2. fix the issue if it is related to the task;
3. rerun the command if possible;
4. mention unresolved issues in the final response.

If tests do not exist, say so.

---

## Git rules

Do not create commits unless explicitly asked.

If asked to create a commit:
- write the commit message in English;
- use a clear conventional style when possible.

Examples:

```txt
feat: add online order dashboard
fix: correct article stock calculation
refactor: simplify Prisma article service
chore: update dependencies
```

Before committing, check:

```bash
git status
```

Do not include unrelated files in a commit.

---

## Code comments

Code comments must be written in English.

Add comments only when they clarify non-obvious logic.

Do not add comments that simply repeat what the code does.

Good:

```ts
// Keep this value in sync with the backend pagination limit.
```

Bad:

```ts
// Increment i by one.
```

---

## Formatting

Respect the existing formatting tools.

Do not reformat unrelated files.

Do not change quote style, indentation, or import ordering manually if the project already has tooling for it.

Use the existing formatter or linter configuration.

---

## Files to handle carefully

Do not modify these files unless necessary for the task:

```txt
.env
.env.local
.env.production
pnpm-lock.yaml
docker-compose.yml
prisma migrations
deployment config files
CI/CD config files
```

Never delete user data or database volumes without explicit instruction.

---

## Security

For backend changes:

- validate input;
- avoid trusting client-provided data;
- do not expose stack traces to users;
- do not leak internal IDs unless already part of the API contract;
- protect admin or merchant-only actions if auth exists.

For frontend changes:

- do not store sensitive tokens in localStorage unless the existing architecture already does so;
- avoid exposing secrets through `NEXT_PUBLIC_` variables;
- sanitize or safely render user-provided content.

---

## Performance

Prefer simple performance improvements when relevant.

Avoid:

- unnecessary client components;
- duplicated API calls;
- large dependencies for small tasks;
- loading huge datasets in the frontend without pagination;
- expensive database queries without filtering or pagination.

---

## Final response format

At the end of each task, respond in French using this structure:

```md
## Résumé
- ...

## Fichiers modifiés
- `...`

## Commandes exécutées
- `...`

## Vérifications
- `...` : OK
- `...` : échec, raison ...

## Notes
- ...
```

If no command was executed, write:

```md
## Commandes exécutées
- Aucune commande exécutée.
```

If some checks could not be run, explain why.

---

## Project-specific priorities

For Les cocottes de Diane, prioritize:

1. Correct separation between merchant features and customer features.
2. Clean stock, articles, orders, and accounting logic.
3. Clear API contracts between the NestJS backend and Next.js frontend.
4. Maintainable Prisma models and migrations.
5. Responsive frontend UI.
6. Simple, reliable business logic.
7. Safe handling of inventory, prices, costs, margins, and order states.

Avoid mixing:
- raw material stock logic;
- article/product stock logic;
- margin/cost display logic;
- customer-facing order logic;
- merchant/admin logic.

Financial data such as costs, margins, and raw material prices should not appear in customer-facing views.

---

## Autonomous behavior

You may autonomously:

- inspect files;
- identify relevant modules;
- modify necessary files;
- add small helper functions;
- fix related TypeScript, lint, or build errors caused by your changes;
- update imports;
- run relevant pnpm commands;
- explain assumptions in the final response.

You must be extra careful before:

- deleting data;
- changing database schema;
- changing authentication logic;
- changing deployment configuration;
- modifying migrations;
- upgrading major dependencies;
- introducing new libraries;
- changing project architecture.

For risky changes, prefer explaining the risk and making the safest minimal change.
