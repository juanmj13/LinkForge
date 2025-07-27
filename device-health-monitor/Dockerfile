# 1. Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/bin ./bin
RUN npm ci --omit=dev

# Variables de entorno se pasan en tiempo de ejecución
CMD ["node", "bin/index.js"]
