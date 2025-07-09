# Dockerfile for backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 500
CMD ["npm", "start"] 