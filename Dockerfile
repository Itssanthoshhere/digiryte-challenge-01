# Multi-stage production Dockerfile for Digiryte Secure REST API & Dashboard
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY client/package*.json ./client/

# Install all dependencies (including devDependencies for build)
RUN npm install --include=dev --prefix backend
RUN npm install --include=dev --prefix client

# Copy full application source code
COPY . .

# Build Vite React client & TypeScript Express backend
RUN npm --prefix client run build
RUN npm --prefix backend run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm install --only=production --prefix backend

# Copy compiled backend dist and client dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["npm", "start"]
