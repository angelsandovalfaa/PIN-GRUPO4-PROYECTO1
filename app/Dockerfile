FROM node:20.17.0-alpine3.20

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

EXPOSE 80
CMD ["node", "src/server.js"]
