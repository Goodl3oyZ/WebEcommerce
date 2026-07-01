FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER app
EXPOSE 5000
CMD ["node", "index.js"]
