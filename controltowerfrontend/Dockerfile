FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_CARTO_API_KEY
ARG VITE_MAP_TILES_URL
ARG VITE_MAP_ATTRIBUTION
ENV VITE_CARTO_API_KEY=$VITE_CARTO_API_KEY
ENV VITE_MAP_TILES_URL=$VITE_MAP_TILES_URL
ENV VITE_MAP_ATTRIBUTION=$VITE_MAP_ATTRIBUTION

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]