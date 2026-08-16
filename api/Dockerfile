FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /data && chmod 755 /data
ENV NODE_ENV=production
ENV DB_PATH=/data/dev.db
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
