FROM node:20-alpine

WORKDIR /app

# Prisma на Alpine требует openssl и libc-совместимость
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD npx prisma migrate deploy && npm run dev