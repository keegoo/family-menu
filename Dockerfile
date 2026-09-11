# Build stage: compile the React client into server/public
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: production deps + built app
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server ./server
# seed.js resolves dish images from client/public/dishes
COPY --from=build /app/client/public ./client/public
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/data \
  && chown -R node:node /app
USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
