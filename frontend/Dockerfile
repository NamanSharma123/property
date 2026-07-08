# Multi-stage build using Next.js's `output: 'standalone'` (already set in
# next.config.js) so the final image only contains the minimal server bundle,
# not the full node_modules tree.

FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Public build-time config (safe to bake in — becomes part of the client bundle).
# Real API URL is passed as a build arg from CI.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
# Next's standalone server.js binds to $HOSTNAME if it's set, instead of all
# interfaces — and App Runner (like most cloud platforms) auto-injects its
# own HOSTNAME as the instance's internal hostname, which the health checker
# can't reach. A plain `ENV HOSTNAME=` default gets overridden by that
# platform-injected value, so set it directly on the command instead — that
# always wins regardless of what the container's inherited environment says.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=3000 node server.js"]
