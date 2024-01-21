FROM node:17-bullseye-slim

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

WORKDIR /app
COPY . /app/

CMD ["node", "index.js"]
