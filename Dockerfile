FROM node:17-bullseye-slim

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

WORKDIR /app
COPY . /app/

ENV PLUGIN_FOLDER=/app/plugins

CMD ["node", "k8s/index.js"]
