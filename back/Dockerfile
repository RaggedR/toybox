# API image: the backend and the one-shot migration. Both are plain Deno that
# talk only to Postgres -- they render nothing, so this image needs no fonts.
# Built ON the target box (arm64, Oracle Ampere). Deno must be >= 2.3 to read
# this repo's lockfile v5.
FROM denoland/deno:debian-2.7.0

WORKDIR /app

# Manifests first, so the dependency layer is reused unless the deps change.
# (All workspace members are copied because `deno install` resolves the whole
# workspace at once.)
COPY deno.json deno.lock ./
COPY shared/deno.json ./shared/deno.json
COPY back/deno.json ./back/deno.json
COPY worker/deno.json ./worker/deno.json
COPY web/deno.json ./web/deno.json
RUN deno install

# Then the source. web/dist is the frontend built on the CI runner and shipped
# in by the deploy; the backend serves it from /app/web/dist at runtime.
COPY . .

# No CMD: this image is shared by two services (back and migrate), so the
# command is chosen per container in docker-compose.yml, never baked in here.
