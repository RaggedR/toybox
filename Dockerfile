# One image, used by three services (migrate, back, worker) with different
# commands. Built ON the target box, which is arm64 (Oracle Ampere) — building
# here is how the worker's native @resvg/resvg-js addon gets the right binary.
# Deno must be >= 2.3: this repo's deno.lock is lockfile version 5, which older
# Deno (<= 2.2) refuses to read. The CI matrix is pinned the same way.
FROM denoland/deno:debian-2.7.0

WORKDIR /app

# Copy the manifests first so the dependency cache layer is reused unless the
# deps actually change.
COPY deno.json deno.lock ./
COPY shared/deno.json ./shared/deno.json
COPY back/deno.json ./back/deno.json
COPY worker/deno.json ./worker/deno.json
COPY web/deno.json ./web/deno.json
RUN deno install

# Then the source. web/dist is the frontend built on the CI runner and shipped
# in by the deploy; the backend serves it from /app/web/dist at runtime.
COPY . .

# Sensible default; docker-compose overrides this per service.
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "back/src/back.ts"]
