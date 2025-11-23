FROM node:24.11.1-trixie-slim AS build

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY /package.json .
COPY /package-lock.json .

COPY /src/ ./src
COPY /.env.docker ./
COPY /static/ ./static
COPY /svelte.config.js .
COPY /tsconfig.json .
COPY /vite.config.ts .

RUN npm ci
RUN npm run build

EXPOSE 3000

CMD ["node", "--env-file=.env.docker", "/app/build"]