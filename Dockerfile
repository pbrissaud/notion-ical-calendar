# Stage 1: Install dependencies
FROM node:24-alpine@sha256:931d7d57f8c1fd0e2179dbff7cc7da4c9dd100998bc2b32afc85142d8efbc213 AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build TypeScript
FROM node:24-alpine@sha256:931d7d57f8c1fd0e2179dbff7cc7da4c9dd100998bc2b32afc85142d8efbc213 AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml* tsconfig.json ./
COPY src ./src

RUN pnpm build

# Stage 3: Production image
FROM gcr.io/distroless/nodejs22-debian12@sha256:ccb87cd2aef8e20463d847a1eeaee12949b5c1213b5f4669a85c2989ad845402

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["dist/index.js"]
