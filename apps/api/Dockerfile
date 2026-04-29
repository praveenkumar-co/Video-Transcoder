FROM node:20-alpine
RUN apk add --no-cache ca-certificates && update-ca-certificates

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
CMD ["node", "dist/app.js"]