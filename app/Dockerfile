FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "--require", "./tracing.js", "src/index.js"]
