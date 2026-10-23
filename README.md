# toybox

A tiny greeting-card website, used as the worked example in **CI/CD by Example**.
On the main page you create a card (pick a design, type a message) and get a
shareable link; opening that link shows the finished card.

It exists to be *deployed*, not to be impressive: four small parts that between
them exercise every CI/CD feature in the companion document.

## The four parts

| Part | What it is | Runs on |
|------|------------|---------|
| `web` | React + Vite frontend | `vite` in dev; built to static files in prod |
| `back` | Hono HTTP API (`/health`, `POST /api/cards`, `GET /api/cards/:id`) | Deno |
| `worker` | Renders each card to a PNG (SVG → `@resvg/resvg-js`) | Deno |
| `shared` | The card designs + the `zod` schema both sides validate against | library |

They share exactly one thing: the Postgres database. The backend writes a
`pending` card; the worker picks it up, renders it, and flips it to `rendered`.

## Run it locally

```bash
deno install
docker run -d --name toybox-db -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=toybox -p 5432:5432 postgres:16
export DATABASE_URL=postgres://postgres:pw@localhost:5432/toybox
deno task db:migrate && deno task db:seed
deno task --cwd back dev     # http://localhost:3000
deno task --cwd web  dev     # http://localhost:5173
deno task --cwd worker dev   # no address; watches the database
```

## Test

```bash
deno test --allow-net --allow-env --allow-read --allow-ffi --allow-sys
```

(The `back` tests need a `DATABASE_URL`; the `shared` and `worker` tests don't.)

## Deploy

Production runs as a self-contained Docker Compose stack
(`db` + `back` + `worker`) on a single box, built on the box itself. CI/CD is in
`.github/workflows/` (`ci`, `release` → `deploy`, `nightly`); the deploy script
is `infra/deploy.sh`. See the document's **Part IV** for how the real
deployment differs from the idealised cloud story in Parts I–III.
