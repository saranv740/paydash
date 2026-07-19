# Base image
FROM node:24-alpine AS base

# Install pnpm
RUN npm install -g pnpm
ENV CI=true

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage (used for docker compose watch)
FROM base AS dev
COPY . .
EXPOSE 3001
ENV PORT=3001
CMD ["pnpm", "dev", "--port", "3001"]

# Production builder stage
FROM base AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN pnpm build

# Production runner stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml* ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3001
ENV PORT=3001
CMD ["pnpm", "start", "--port", "3001"]
