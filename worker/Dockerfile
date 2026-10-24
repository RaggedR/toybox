# Worker image: renders each card to a PNG with @resvg/resvg-js, a native addon
# that rasterises SVG text. That text asks for Helvetica/Arial/sans-serif, so
# resvg needs real font files installed on the system -- without them, rendered
# cards come out with blank text. The API image (back/Dockerfile) renders
# nothing and so needs none of this: that difference is the whole reason the
# worker has its own image. Built ON the box (arm64, Oracle Ampere).
FROM denoland/deno:debian-2.7.0

# The one thing the API image does not install: fonts for resvg to draw with.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-liberation fontconfig \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifests first, so the dependency layer is reused unless the deps change.
# (All workspace members are copied because `deno install` resolves the whole
# workspace at once; @resvg/resvg-js is declared in worker/deno.json.)
COPY deno.json deno.lock ./
COPY shared/deno.json ./shared/deno.json
COPY back/deno.json ./back/deno.json
COPY worker/deno.json ./worker/deno.json
COPY web/deno.json ./web/deno.json
RUN deno install

COPY . .

# A sensible default; docker-compose sets the same command explicitly.
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-ffi", "--allow-sys", "worker/src/worker.ts"]
