# Compile the NestJS application using the repository's npm workspace.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace=backend --no-audit --no-fund
COPY backend/ backend/
RUN npm run build --workspace=backend

# Run only compiled code and backend production dependencies.
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace=backend --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/bin/npm \
              /usr/local/bin/npx
COPY --from=build /app/backend/dist ./backend/dist
# The compiled exams seed resolves this CSV from the repository root.
COPY challenge/dados/exames.csv ./challenge/dados/exames.csv
WORKDIR /app/backend
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
